const db = require('../../config/database');
const { STATUS_PESANAN, KONDISI_ALAT } = require('../../constants');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');
const orderService = require('../order/order.service');

/**
 * Modul serah-terima & pengembalian — REQ-4.5.1 s.d. REQ-4.5.5.
 *
 * Hanya PETUGAS dan ADMIN yang dapat mengisi checklist (FR-039).
 */

/**
 * Catat serah-terima alat — REQ-4.5.1.
 * Transisi: DISIAPKAN → SEDANG_DISEWA.
 *
 * @param {object} params
 * @param {number|string} params.orderId
 * @param {number|string} params.petugasId
 * @param {string} [params.catatan]
 * @param {string} [params.foto_url]
 * @param {Array<{item_id: number, kuantitas: number, kondisi: string, kelengkapan: boolean, catatan?: string}>} params.items
 */
async function catatSerahTerima({ orderId, petugasId, catatan, fotoUrl, items }) {
  return db.transaction(async (trx) => {
    const pesanan = await trx('Order').where({ order_id: orderId }).first();
    if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

    if (pesanan.status !== STATUS_PESANAN.DISIAPKAN) {
      throw new ConflictError(
        `Serah-terima hanya dapat dicatat saat pesanan berstatus DISIAPKAN. Status saat ini: ${pesanan.status}.`,
        'STATUS_TIDAK_SESUAI'
      );
    }

    const [checklistId] = await trx('ChecklistRecord').insert({
      order_id: orderId,
      tipe: 'SERAH_TERIMA',
      petugas_id: petugasId,
      waktu_aktual: trx.fn.now(),
      catatan: catatan || null,
      foto_url: fotoUrl || null,
    });

    if (items && items.length > 0) {
      await trx('ChecklistItem').insert(
        items.map((i) => ({
          checklist_id: checklistId,
          item_id: i.item_id,
          kuantitas: i.kuantitas,
          kondisi: i.kondisi,
          kelengkapan: i.kelengkapan,
          catatan: i.catatan || null,
        }))
      );
    }

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.SERAH_TERIMA,
      entity: 'Order',
      entityId: orderId,
      aktorId: petugasId,
      sesudah: { checklist_id: String(checklistId), jumlah_item: items?.length || 0 },
    });

    await orderService.ubahStatus({
      orderId,
      statusBaru: STATUS_PESANAN.SEDANG_DISEWA,
      aktorId: petugasId,
      keterangan: 'Alat diserahkan ke pelanggan.',
      trx,
    });

    return { checklist_id: String(checklistId) };
  });
}

/**
 * Hitung denda keterlambatan — REQ-4.7.1.
 *
 * Tarif diambil dari PenaltyRate: khusus per alat bila ada, jika tidak pakai default.
 * Bila tarif tidak ditemukan sama sekali, denda 0 dan dicatat — sistem tidak boleh
 * gagal total hanya karena admin belum mengatur tarif.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trx
 * @param {object} params
 */
async function hitungDendaKeterlambatan(trx, { itemId, menitTerlambat }) {
  if (menitTerlambat <= 0) return { nominal: 0, tarif: null, satuan: null };

  // Dahulukan tarif khusus alat, lalu tarif default.
  let tarif = null;
  if (itemId) {
    tarif = await trx('PenaltyRate').where({ tipe: 'DENDA_PER_JAM', item_id: itemId }).first();
  }
  if (!tarif) {
    tarif = await trx('PenaltyRate').where({ tipe: 'DENDA_PER_JAM', item_id: null }).first();
  }

  if (!tarif) {
    return { nominal: 0, tarif: null, satuan: null, catatan: 'Tarif denda belum diatur admin.' };
  }

  const nominalPerSatuan = Number(tarif.nominal);

  if (tarif.tipe === 'DENDA_PER_JAM') {
    // Pembulatan ke atas: terlambat 61 menit dihitung 2 jam.
    const jam = Math.ceil(menitTerlambat / 60);
    return { nominal: jam * nominalPerSatuan, tarif: nominalPerSatuan, satuan: 'jam', jam };
  }

  const hari = Math.ceil(menitTerlambat / 1440);
  return { nominal: hari * nominalPerSatuan, tarif: nominalPerSatuan, satuan: 'hari', hari };
}

/**
 * Catat pengembalian — REQ-4.5.2, REQ-4.5.4, REQ-4.5.5.
 * Transisi: SEDANG_DISEWA → DIKEMBALIKAN.
 *
 * Menghasilkan dua jenis biaya tambahan:
 *   1. Denda keterlambatan (REQ-4.7.1)
 *   2. Biaya ganti rugi untuk alat rusak berat / hilang (REQ-4.7.2)
 */
async function catatPengembalian({ orderId, petugasId, catatan, fotoUrl, items, waktuKembali }) {
  return db.transaction(async (trx) => {
    const pesanan = await trx('Order').where({ order_id: orderId }).first();
    if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

    if (pesanan.status !== STATUS_PESANAN.SEDANG_DISEWA) {
      throw new ConflictError(
        `Pengembalian hanya dapat dicatat saat pesanan berstatus SEDANG_DISEWA. Status saat ini: ${pesanan.status}.`,
        'STATUS_TIDAK_SESUAI'
      );
    }

    const waktuAktual = waktuKembali ? new Date(waktuKembali) : new Date();

    // ─── 1. Denda keterlambatan ──────────────────────────────────────────────
    // Tanggal selesai bersifat inklusif; keterlambatan dihitung dari akhir hari selesai.
    const batasKembali = new Date(`${pesanan.tanggal_selesai}T23:59:59+07:00`);
    const selisihMenit = Math.max(0, Math.floor((waktuAktual - batasKembali) / 60000));

    let totalBiayaTambahan = 0;

    if (selisihMenit > 0) {
      const denda = await hitungDendaKeterlambatan(trx, { itemId: null, menitTerlambat: selisihMenit });

      if (denda.nominal > 0) {
        await trx('Penalty').insert({
          order_id: orderId,
          tipe: 'DENDA_KETERLAMBATAN',
          durasi_terlambat_menit: selisihMenit,
          nominal: denda.nominal,
          status_pelunasan: 'BELUM_LUNAS',
        });
        totalBiayaTambahan += denda.nominal;
      }

      await catatAudit({
        trx,
        aksi: AKSI_AUDIT.DENDA_TERAPKAN,
        entity: 'Order',
        entityId: orderId,
        aktorId: petugasId,
        sesudah: { menit_terlambat: selisihMenit, nominal_denda: denda.nominal },
      });
    }

    // ─── 2. Catat checklist kondisi ──────────────────────────────────────────
    const [checklistId] = await trx('ChecklistRecord').insert({
      order_id: orderId,
      tipe: 'PENGEMBALIAN',
      petugas_id: petugasId,
      waktu_aktual: waktuAktual,
      catatan: catatan || null,
      foto_url: fotoUrl || null,
    });

    if (items && items.length > 0) {
      await trx('ChecklistItem').insert(
        items.map((i) => ({
          checklist_id: checklistId,
          item_id: i.item_id,
          kuantitas: i.kuantitas,
          kondisi: i.kondisi,
          kelengkapan: i.kelengkapan,
          catatan: i.catatan || null,
        }))
      );
    }

    // ─── 3. Ganti rugi + perbarui kondisi alat ───────────────────────────────
    for (const item of items || []) {
      // REQ-4.5.4 — alat rusak berat atau hilang tidak dapat disewakan kembali
      // sebelum admin mengubah statusnya (SRS §5.5).
      if ([KONDISI_ALAT.RUSAK_BERAT, KONDISI_ALAT.HILANG].includes(item.kondisi)) {
        await trx('Item')
          .where({ item_id: item.item_id })
          .update({
            status_kondisi: item.kondisi === KONDISI_ALAT.HILANG ? 'HILANG' : 'RUSAK',
            updated_at: trx.fn.now(),
          });

        // REQ-4.7.2 — biaya ganti rugi.
        const tarifGantiRugi = await trx('PenaltyRate')
          .where({ tipe: 'GANTI_RUGI_DEFAULT', item_id: item.item_id })
          .first()
          .then(async (khusus) => {
            if (khusus) return khusus;
            return trx('PenaltyRate').where({ tipe: 'GANTI_RUGI_DEFAULT', item_id: null }).first();
          });

        if (tarifGantiRugi) {
          const nominal = Number(tarifGantiRugi.nominal) * Number(item.kuantitas || 1);

          await trx('Penalty').insert({
            order_id: orderId,
            tipe: 'GANTI_RUGI',
            item_id: item.item_id,
            nominal,
            status_pelunasan: 'BELUM_LUNAS',
          });
          totalBiayaTambahan += nominal;
        }
      } else if (item.kondisi === KONDISI_ALAT.RUSAK_RINGAN) {
        // Rusak ringan tetap dapat disewakan, tetapi kondisinya dicatat.
        await trx('Item')
          .where({ item_id: item.item_id })
          .update({ status_kondisi: 'TERSEDIA', updated_at: trx.fn.now() });
      }
    }

    // ─── 4. Perbarui total & lepas reservasi ─────────────────────────────────
    const totalAkhir = Number(pesanan.total_sewa) + totalBiayaTambahan;

    await trx('Order').where({ order_id: orderId }).update({
      total_biaya_tambahan: totalBiayaTambahan,
      total_akhir: totalAkhir,
      updated_at: trx.fn.now(),
    });

    // Reservasi menjadi TERPAKAI — riwayat tetap tersimpan, dan Availability Engine
    // mengabaikannya karena hanya baris berstatus AKTIF yang menahan stok.
    await trx('StockReservation')
      .where({ order_id: orderId, status: 'AKTIF' })
      .update({ status: 'TERPAKAI', updated_at: trx.fn.now() });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PENGEMBALIAN,
      entity: 'Order',
      entityId: orderId,
      aktorId: petugasId,
      sesudah: {
        checklist_id: String(checklistId),
        menit_terlambat: selisihMenit,
        total_biaya_tambahan: totalBiayaTambahan,
        total_akhir: totalAkhir,
      },
    });

    await orderService.ubahStatus({
      orderId,
      statusBaru: STATUS_PESANAN.DIKEMBALIKAN,
      aktorId: petugasId,
      keterangan: 'Alat dikembalikan dan diperiksa.',
      trx,
    });

    return {
      checklist_id: String(checklistId),
      menit_terlambat: selisihMenit,
      total_biaya_tambahan: totalBiayaTambahan,
      total_akhir: totalAkhir,
    };
  });
}

/** Daftar pesanan yang perlu diserahkan/dikembalikan petugas — REQ-4.5.1. */
async function daftarTugasPetugas() {
  const perluDiserahkan = await db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .where('Order.status', STATUS_PESANAN.DISIAPKAN)
    .select('Order.order_id', 'Order.kode_pesanan', 'Order.tanggal_mulai', 'Order.tanggal_selesai', 'User.nama as pelanggan');

  const perluDikembalikan = await db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .where('Order.status', STATUS_PESANAN.SEDANG_DISEWA)
    .select('Order.order_id', 'Order.kode_pesanan', 'Order.tanggal_mulai', 'Order.tanggal_selesai', 'User.nama as pelanggan');

  return {
    perlu_disarahkan: perluDiserahkan.map(formatTugas),
    perlu_dikembalikan: perluDikembalikan.map(formatTugas),
  };
}

function formatTugas(p) {
  return {
    order_id: String(p.order_id),
    kode_pesanan: p.kode_pesanan,
    pelanggan: p.pelanggan,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
  };
}

/** Detail checklist sebuah pesanan. */
async function ambilChecklist(orderId) {
  const records = await db('ChecklistRecord')
    .leftJoin('User', 'User.user_id', 'ChecklistRecord.petugas_id')
    .where('ChecklistRecord.order_id', orderId)
    .select('ChecklistRecord.*', 'User.nama as petugas')
    .orderBy('waktu_aktual');

  const hasil = [];
  for (const r of records) {
    const items = await db('ChecklistItem')
      .join('Item', 'Item.item_id', 'ChecklistItem.item_id')
      .where('ChecklistItem.checklist_id', r.checklist_id)
      .select('ChecklistItem.*', 'Item.nama', 'Item.kode_barang');

    hasil.push({
      checklist_id: String(r.checklist_id),
      tipe: r.tipe,
      petugas: r.petugas,
      waktu_aktual: r.waktu_aktual,
      catatan: r.catatan,
      foto_url: r.foto_url,
      items: items.map((i) => ({
        item_id: String(i.item_id),
        kode_barang: i.kode_barang,
        nama: i.nama,
        kuantitas: i.kuantitas,
        kondisi: i.kondisi,
        kelengkapan: Boolean(i.kelengkapan),
        catatan: i.catatan,
      })),
    });
  }
  return hasil;
}

module.exports = {
  catatSerahTerima,
  catatPengembalian,
  hitungDendaKeterlambatan,
  daftarTugasPetugas,
  ambilChecklist,
};
