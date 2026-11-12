const db = require('../../config/database');
const { STATUS_PESANAN } = require('../../constants');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');

/**
 * Modul denda & ganti rugi — REQ-4.7.1 s.d. REQ-4.7.6.
 *
 * Perhitungan denda keterlambatan dibuat di handover.service karena bergantung
 * pada waktu pengembalian aktual. Berkas ini menangani pencatatan, pelunasan,
 * dan pengelolaan tarif.
 */

/** Daftar tarif denda — REQ-4.7.3. */
async function daftarTarif() {
  const baris = await db('PenaltyRate')
    .leftJoin('Item', 'Item.item_id', 'PenaltyRate.item_id')
    .select('PenaltyRate.*', 'Item.nama as nama_item')
    .orderBy('PenaltyRate.tipe');

  return baris.map((t) => ({
    // Kolom kunci tabel PenaltyRate bernama `rate_id` (lihat migrasi 20260928000001).
    rate_id: String(t.rate_id),
    tipe: t.tipe,
    item_id: t.item_id ? String(t.item_id) : null,
    nama_item: t.nama_item,
    nominal: Number(t.nominal),
    diatur_oleh: t.diatur_oleh ? String(t.diatur_oleh) : null,
    updated_at: t.updated_at,
  }));
}

/**
 * Buat atau perbarui tarif denda — REQ-4.7.3.
 *
 * Catatan: tabel PenaltyRate TIDAK memiliki kolom `satuan` — satuannya tersirat
 * dari nilai `tipe` (DENDA_PER_JAM dihitung per jam, GANTI_RUGI_DEFAULT per unit
 * alat). Mengirim kolom yang tidak ada akan membuat kueri gagal di MySQL.
 */
async function simpanTarif({ tipe, item_id = null, nominal }, aktorId) {
  return db.transaction(async (trx) => {
    const existing = await trx('PenaltyRate').where({ tipe, item_id }).first();

    let rateId;
    if (existing) {
      await trx('PenaltyRate').where({ rate_id: existing.rate_id }).update({
        nominal,
        diatur_oleh: aktorId,
        updated_at: trx.fn.now(),
      });
      rateId = existing.rate_id;
    } else {
      [rateId] = await trx('PenaltyRate').insert({ tipe, item_id, nominal, diatur_oleh: aktorId });
    }
    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.TARIF_DENDA_UBAH,
      entity: 'PenaltyRate',
      entityId: rateId,
      aktorId,
      sebelum: existing ? { nominal: Number(existing.nominal) } : null,
      sesudah: { tipe, item_id, nominal },
    });
    return { rate_id: String(rateId), tipe, item_id: item_id ? String(item_id) : null, nominal };
  });
}

/** Daftar denda pada sebuah pesanan — REQ-4.7.4. */
async function dendaPesanan(orderId) {
  const baris = await db('Penalty')
    .leftJoin('Item', 'Item.item_id', 'Penalty.item_id')
    .where('Penalty.order_id', orderId)
    .select('Penalty.*', 'Item.nama as nama_item')
    .orderBy('Penalty.created_at');

  return baris.map(formatDenda);
}

function formatDenda(d) {
  return {
    penalty_id: String(d.penalty_id),
    order_id: String(d.order_id),
    tipe: d.tipe,
    item_id: d.item_id ? String(d.item_id) : null,
    nama_item: d.nama_item,
    durasi_terlambat_menit: d.durasi_terlambat_menit,
    nominal: Number(d.nominal),
    status_pelunasan: d.status_pelunasan,
    created_at: d.created_at,
  };
}

/**
 * Tandai denda lunas — REQ-4.7.5.
 *
 * Bila instrumen pembayaran (Payment) sudah mencatat pelunasan, fungsi ini
 * merekonsiliasi tabel Penalty. Untuk saat ini pelunasan dicatat manual oleh
 * petugas setelah pembayaran diterima di tempat.
 */
async function lunaskanDenda({ penaltyId, aktorId, catatan }) {
  return db.transaction(async (trx) => {
    const denda = await trx('Penalty').where({ penalty_id: penaltyId }).first();
    if (!denda) throw new NotFoundError('Denda tidak ditemukan.');

    if (denda.status_pelunasan === 'LUNAS') {
      throw new ConflictError('Denda ini sudah ditandai lunas.', 'SUDAH_LUNAS');
    }

    await trx('Penalty').where({ penalty_id: penaltyId }).update({
      status_pelunasan: 'LUNAS',
      updated_at: trx.fn.now(),
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.DENDA_LUNAS,
      entity: 'Penalty',
      entityId: penaltyId,
      aktorId,
      sebelum: { status_pelunasan: denda.status_pelunasan },
      sesudah: { status_pelunasan: 'LUNAS' },
      keterangan: catatan || null,
    });

    const diperbarui = await trx('Penalty').where({ penalty_id: penaltyId }).first();
    return formatDenda(diperbarui);
  });
}

/** Ringkasan denda belum lunas — untuk dashboard admin. */
async function ringkasanDenda() {
  const [total] = await db('Penalty')
    .where({ status_pelunasan: 'BELUM_LUNAS' })
    .sum({ nominal: 'nominal' })
    .count({ jumlah: 'penalty_id' });

  const perTipe = await db('Penalty')
    .where({ status_pelunasan: 'BELUM_LUNAS' })
    .groupBy('tipe')
    .select('tipe')
    .sum({ nominal: 'nominal' })
    .count({ jumlah: 'penalty_id' });

  return {
    total_belum_lunas: Number(total.nominal) || 0,
    jumlah_denda: Number(total.jumlah) || 0,
    per_tipe: perTipe.map((t) => ({
      tipe: t.tipe,
      nominal: Number(t.nominal) || 0,
      jumlah: Number(t.jumlah),
    })),
  };
}

/**
 * Periksa apakah pesanan masih memiliki denda belum lunas.
 * Dipakai saat menutup pesanan — pesanan tidak boleh SELESAI bila masih ada tunggakan.
 */
async function adaTunggakan(orderId, trx = db) {
  const denda = await trx('Penalty').where({ order_id: orderId, status_pelunasan: 'BELUM_LUNAS' });
  const total = denda.reduce((s, d) => s + Number(d.nominal), 0);
  return { ada: denda.length > 0, jumlah: denda.length, total };
}

/**
 * Daftar pesanan yang memiliki denda — REQ-4.7.3.
 *
 * Ringkasan angka saja tidak cukup untuk halaman pengelolaan: admin perlu tahu
 * pesanan mana yang perlu ditindaklanjuti. Setiap pesanan dikirim bersama
 * daftar dendanya agar tabel dapat dirender tanpa permintaan tambahan per baris.
 */
async function daftarPesananBerDenda({ sertakanLunas = false } = {}) {
  const kueri = db('Penalty')
    .join('Order', 'Order.order_id', 'Penalty.order_id')
    .join('User', 'User.user_id', 'Order.user_id')
    .select(
      'Order.order_id',
      'Order.kode_pesanan',
      'Order.status',
      'Order.updated_at',
      'User.nama as pelanggan'
    )
    .groupBy('Order.order_id', 'Order.kode_pesanan', 'Order.status', 'Order.updated_at', 'User.nama')
    .orderBy('Order.updated_at', 'desc');

  if (!sertakanLunas) {
    kueri.whereExists(function () {
      this.select(db.raw('1'))
        .from('Penalty as P')
        .whereRaw('P.order_id = Order.order_id')
        .andWhere('P.status_pelunasan', 'BELUM_LUNAS');
    });
  }

  const baris = await kueri;

  return Promise.all(
    baris.map(async (p) => ({
      order_id: String(p.order_id),
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      status: p.status,
      updated_at: p.updated_at,
      denda: await dendaPesanan(p.order_id),
    }))
  );
}

/**
 * Tutup pesanan — REQ-4.7.6.
 * Transisi: DIKEMBALIKAN → SELESAI. Ditolak bila masih ada denda belum lunas.
 */
async function selesaikanPesanan({ orderId, aktorId, paksa = false }) {
  const orderService = require('../order/order.service');

  return db.transaction(async (trx) => {
    const pesanan = await trx('Order').where({ order_id: orderId }).first();
    if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

    if (pesanan.status !== STATUS_PESANAN.DIKEMBALIKAN) {
      throw new ConflictError(
        `Pesanan hanya dapat diselesaikan setelah alat dikembalikan. Status saat ini: ${pesanan.status}.`,
        'STATUS_TIDAK_SESUAI'
      );
    }

    const tunggakan = await adaTunggakan(orderId, trx);
    if (tunggakan.ada && !paksa) {
      throw new ConflictError(
        `Pesanan masih memiliki ${tunggakan.jumlah} denda belum lunas (total Rp${tunggakan.total.toLocaleString('id-ID')}).`,
        'ADA_TUNGGAKAN'
      );
    }

    return orderService.ubahStatus({
      orderId,
      statusBaru: STATUS_PESANAN.SELESAI,
      aktorId,
      keterangan: paksa ? 'Diselesaikan dengan pengabaian tunggakan oleh admin.' : 'Seluruh kewajiban lunas.',
      trx,
    });
  });
}

module.exports = {
  daftarTarif,
  simpanTarif,
  dendaPesanan,
  lunaskanDenda,
  ringkasanDenda,
  daftarPesananBerDenda,
  selesaikanPesanan,
};
