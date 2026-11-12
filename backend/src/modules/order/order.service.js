const db = require('../../config/database');
const {
  STATUS_PESANAN,
  BATAS_PEMBAYARAN_JAM,
} = require('../../constants');
const {
  ConflictError,
  NotFoundError,
  StockUnavailableError,
  ForbiddenError,
} = require('../../utils/errors');
const { buatKodePesanan, bulatkanRupiah, formatTanggal, selisihHari } = require('../../utils/helpers');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');
const availability = require('../inventory/availability.service');

/**
 * Modul pesanan — REQ-4.2.3 s.d. REQ-4.2.9.
 *
 * ADR-10 adalah inti berkas ini: seluruh pemeriksaan stok dan pembuatan reservasi
 * berlangsung di dalam SATU transaksi, dengan baris Item dikunci memakai
 * SELECT ... FOR UPDATE sebelum dihitung.
 *
 * Mengapa urutannya penting:
 *   1. Kunci baris Item lebih dulu  → mencegah dua transaksi membaca stok yang sama
 *   2. Hitung ketersediaan          → sekarang angka ini tidak dapat berubah
 *   3. Sisipkan reservasi           → kunci tercatat
 *   4. Commit                       → kunci dilepas, reservasi terlihat transaksi lain
 *
 * Bila langkah 2 dijalankan sebelum langkah 1, dua pembeli dapat sama-sama melihat
 * "sisa 1" lalu sama-sama berhasil — inilah double-booking yang harus dicegah (OBJ-02).
 */

/** Hitung jumlah hari sewa; tanggal selesai inklusif (FR-013). */
function hitungDurasiHari(tanggalMulai, tanggalSelesai) {
  // Sewa 1 hari berarti mulai dan selesai pada tanggal yang sama.
  return selisihHari(tanggalMulai, tanggalSelesai) + 1;
}

/**
 * Persiapkan baris keranjang: validasi keberadaan, ambil harga, dan bangun snapshot.
 * Dilakukan di dalam transaksi karena harga dibaca dari baris Item yang terkunci.
 */
async function siapkanBarisKeranjang(trx, barisKeranjang) {
  const hasil = [];
  let totalSewa = 0;

  for (const baris of barisKeranjang) {
    if (baris.tipe === 'ITEM') {
      const item = await trx('Item').where({ item_id: baris.item_id, is_aktif: true }).first();
      if (!item) throw new NotFoundError(`Alat dengan id ${baris.item_id} tidak ditemukan atau sudah nonaktif.`);
      if (item.status_kondisi !== 'TERSEDIA') {
        throw new ConflictError(`Alat "${item.nama}" sedang tidak dapat disewakan (kondisi: ${item.status_kondisi}).`, 'ALAT_TIDAK_TERSEDIA');
      }

      const subtotal = bulatkanRupiah(item.tarif_harian) * Number(baris.kuantitas);
      totalSewa += subtotal;

      hasil.push({
        tipe: 'ITEM',
        item_id: Number(item.item_id),
        bundle_id: null,
        kuantitas: Number(baris.kuantitas),
        harga_satuan_snapshot: bulatkanRupiah(item.tarif_harian),
        subtotal,
        nama_snapshot: item.nama,
      });
      continue;
    }

    if (baris.tipe === 'BUNDLE') {
      const bundle = await trx('Bundle').where({ bundle_id: baris.bundle_id, is_aktif: true }).first();
      if (!bundle) throw new NotFoundError(`Paket dengan id ${baris.bundle_id} tidak ditemukan atau sudah nonaktif.`);

      const subtotal = bulatkanRupiah(bundle.harga_bundle) * Number(baris.kuantitas);
      totalSewa += subtotal;

      hasil.push({
        tipe: 'BUNDLE',
        item_id: null,
        bundle_id: Number(bundle.bundle_id),
        kuantitas: Number(baris.kuantitas),
        harga_satuan_snapshot: bulatkanRupiah(bundle.harga_bundle),
        subtotal,
        nama_snapshot: bundle.nama,
      });
      continue;
    }

    throw new ConflictError(`Tipe baris keranjang "${baris.tipe}" tidak dikenal.`, 'TIPE_TIDAK_DIKENAL');
  }

  return { baris: hasil, totalSewa };
}

/**
 * Buat pesanan baru — REQ-4.2.7, REQ-4.2.8, REQ-4.2.9.
 *
 * @param {object} params
 * @param {number|string} params.userId
 * @param {Array<object>} params.barisKeranjang
 * @param {string} params.tanggalMulai
 * @param {string} params.tanggalSelesai
 * @param {string} [params.catatan]
 */
async function buatPesanan({ userId, barisKeranjang, tanggalMulai, tanggalSelesai, catatan = null }) {
  if (barisKeranjang.length === 0) {
    throw new ConflictError('Keranjang kosong. Tambahkan alat sebelum melanjutkan.', 'KERANJANG_KOSONG');
  }

  if (selisihHari(tanggalMulai, tanggalSelesai) < 0) {
    throw new ConflictError('Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.', 'TANGGAL_TIDAK_VALID');
  }

  const mulai = formatTanggal(tanggalMulai);
  const selesai = formatTanggal(tanggalSelesai);

  // Hari ini di WIB — sewa tidak boleh dimulai di masa lalu.
  if (mulai < formatTanggal(new Date())) {
    throw new ConflictError('Tanggal mulai tidak boleh sebelum hari ini.', 'TANGGAL_MULAI_MASA_LALU');
  }

  return db.transaction(async (trx) => {
    // ─── Langkah 1: ekspansi bundle menjadi kebutuhan item satuan ─────────────
    const kebutuhan = await availability.ekspansiKebutuhan({ trx, barisKeranjang });
    const itemIds = [...new Set(kebutuhan.map((k) => Number(k.item_id)))];

    // ─── Langkah 2: KUNCI baris Item (ADR-10) ────────────────────────────────
    // Urutan id diurutkan agar transaksi yang bersamaan memperoleh kunci dalam
    // urutan sama — mencegah deadlock antar-transaksi.
    const itemIdsTerurut = [...itemIds].sort((a, b) => a - b);

    await trx('Item')
      .whereIn('item_id', itemIdsTerurut)
      .orderBy('item_id')
      .forUpdate()
      .select('item_id');

    // ─── Langkah 3: periksa ketersediaan SETELAH dikunci ─────────────────────
    const cek = await availability.periksaKetersediaan({
      trx,
      kebutuhan,
      tanggalMulai: mulai,
      tanggalSelesai: selesai,
    });

    if (!cek.cukup) {
      throw new StockUnavailableError(
        'Stok alat tidak mencukupi untuk tanggal yang dipilih.',
        cek.kekurangan
      );
    }

    // ─── Langkah 4: susun baris pesanan & hitung biaya ───────────────────────
    const { baris, totalSewa } = await siapkanBarisKeranjang(trx, barisKeranjang);
    const durasiHari = hitungDurasiHari(mulai, selesai);
    const totalSewaKeseluruhan = bulatkanRupiah(totalSewa * durasiHari);

    const batasPembayaran = new Date(Date.now() + BATAS_PEMBAYARAN_JAM * 3600000);

    const [orderId] = await trx('Order').insert({
      kode_pesanan: buatKodePesanan(),
      user_id: userId,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      status: STATUS_PESANAN.MENUNGGU_PEMBAYARAN,
      total_sewa: totalSewaKeseluruhan,
      total_biaya_tambahan: 0,
      total_akhir: totalSewaKeseluruhan,
      batas_pembayaran: batasPembayaran,
      catatan,
    });

    await trx('OrderItem').insert(baris.map((b) => ({ ...b, order_id: orderId })));

    // ─── Langkah 5: catat reservasi per item satuan ──────────────────────────
    // Digabung per item: satu item dapat muncul dari beberapa bundle sekaligus.
    const gabunganPerItem = new Map();
    for (const k of kebutuhan) {
      const id = Number(k.item_id);
      gabunganPerItem.set(id, (gabunganPerItem.get(id) || 0) + Number(k.kuantitas));
    }

    await trx('StockReservation').insert(
      [...gabunganPerItem.entries()].map(([itemId, kuantitas]) => ({
        order_id: orderId,
        item_id: itemId,
        kuantitas,
        tanggal_mulai: mulai,
        tanggal_selesai: selesai,
        // Kolom StockReservation.status memakai nilai AKTIF/DILEPAS/TERPAKAI,
        // bukan nilai STATUS_PESANAN (lihat migrasi 20260928000001).
        status: 'AKTIF',
      }))
    );

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PESANAN_DIBUAT,
      entity: 'Order',
      entityId: orderId,
      aktorId: userId,
      sesudah: { tanggal_mulai: mulai, tanggal_selesai: selesai, total: totalSewaKeseluruhan },
    });

    return ambilPesanan(orderId, userId, trx);
  });
}

/**
 * Ambil satu pesanan beserta itemnya.
 * @param {number|string} orderId
 * @param {number|string|null} userId bila diisi, periksa kepemilikan (BR-024)
 */
async function ambilPesanan(orderId, userId = null, trx = db) {
  const pesanan = await trx('Order')
    .leftJoin('User', 'User.user_id', 'Order.user_id')
    .where('Order.order_id', orderId)
    .select('Order.*', 'User.nama as pelanggan', 'User.nomor_telepon as pelanggan_telepon')
    .first();
  if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

  if (userId !== null && String(pesanan.user_id) !== String(userId)) {
    throw new ForbiddenError('Anda tidak berhak mengakses pesanan ini.');
  }

  const items = await trx('OrderItem').where({ order_id: orderId });

  return {
    order_id: String(pesanan.order_id),
    kode_pesanan: pesanan.kode_pesanan,
    user_id: String(pesanan.user_id),
    pelanggan: pesanan.pelanggan,
    pelanggan_telepon: pesanan.pelanggan_telepon,
    tanggal_mulai: formatTanggal(pesanan.tanggal_mulai),
    tanggal_selesai: formatTanggal(pesanan.tanggal_selesai),
    status: pesanan.status,
    total_sewa: Number(pesanan.total_sewa),
    total_biaya_tambahan: Number(pesanan.total_biaya_tambahan),
    total_akhir: Number(pesanan.total_akhir),
    batas_pembayaran: pesanan.batas_pembayaran,
    catatan: pesanan.catatan,
    items: items.map((i) => ({
      order_item_id: String(i.order_item_id),
      tipe: i.tipe,
      item_id: i.item_id ? String(i.item_id) : null,
      bundle_id: i.bundle_id ? String(i.bundle_id) : null,
      nama: i.nama_snapshot,
      kuantitas: i.kuantitas,
      harga_satuan: Number(i.harga_satuan_snapshot),
      subtotal: Number(i.subtotal),
    })),
  };
}

/** Riwayat pesanan milik satu pengguna — REQ-4.6.4. */
async function riwayatPengguna(userId, { status = null, halaman = 1, batas = 10 } = {}) {
  const offset = (halaman - 1) * batas;

  // Penyaringan status dipakai halaman "Pesanan Saya". Bila tidak dikirim,
  // seluruh status ditampilkan seperti sebelumnya.
  const saring = { user_id: userId };
  if (status) saring.status = status;

  const [total] = await db('Order').where(saring).count({ n: '*' });
  const baris = await db('Order')
    .where(saring)
    .orderBy('created_at', 'desc')
    .limit(batas)
    .offset(offset);

  return {
    data: baris.map((p) => ({
      order_id: String(p.order_id),
      kode_pesanan: p.kode_pesanan,
      tanggal_mulai: formatTanggal(p.tanggal_mulai),
      tanggal_selesai: formatTanggal(p.tanggal_selesai),
      status: p.status,
      total_akhir: Number(p.total_akhir),
    })),
    meta: { halaman, batas, total: Number(total.n) },
  };
}

/**
 * Ubah status pesanan — menegakkan transisi yang sah (ADR-08).
 *
 * Penegakan ADA DI SINI, bukan di UI. UI menyembunyikan tombol yang tidak relevan
 * untuk kenyamanan, tetapi hanya service yang benar-benar MENOLAK transisi ilegal.
 */
async function ubahStatus({ orderId, statusBaru, aktorId, keterangan = null, trx = db }) {
  const { TRANSISI_PESANAN_SAH } = require('../../constants');

  const pesanan = await trx('Order').where({ order_id: orderId }).first();
  if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

  const diizinkan = TRANSISI_PESANAN_SAH[pesanan.status] || [];
  if (!diizinkan.includes(statusBaru)) {
    throw new ConflictError(
      `Transisi status dari ${pesanan.status} ke ${statusBaru} tidak diizinkan.`,
      'TRANSISI_TIDAK_SAH'
    );
  }

  await trx('Order').where({ order_id: orderId }).update({
    status: statusBaru,
    updated_at: trx.fn.now(),
  });

  // Stok dilepas saat pesanan batal atau kedaluwarsa.
  if ([STATUS_PESANAN.DIBATALKAN, STATUS_PESANAN.GAGAL_KEDALUWARSA].includes(statusBaru)) {
    await trx('StockReservation')
      .where({ order_id: orderId, status: 'AKTIF' })
      .update({ status: 'DILEPAS', updated_at: trx.fn.now() });
  }

  await catatAudit({
    trx,
    aksi: AKSI_AUDIT.PESANAN_STATUS,
    entity: 'Order',
    entityId: orderId,
    aktorId,
    sebelum: { status: pesanan.status },
    sesudah: { status: statusBaru },
    keterangan,
  });

  return ambilPesanan(orderId, null, trx);
}

/** Batalkan pesanan oleh pelanggan — hanya selama belum dibayar. */
async function batalkanPesanan({ orderId, userId }) {
  return db.transaction(async (trx) => {
    const pesanan = await trx('Order').where({ order_id: orderId }).first();
    if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

    if (String(pesanan.user_id) !== String(userId)) {
      throw new ForbiddenError('Anda tidak berhak membatalkan pesanan ini.');
    }

    if (pesanan.status !== STATUS_PESANAN.MENUNGGU_PEMBAYARAN) {
      throw new ConflictError(
        'Pesanan hanya dapat dibatalkan selama menunggu pembayaran.',
        'PESANAN_TIDAK_DAPAT_DIBATALKAN'
      );
    }

    return ubahStatus({
      orderId,
      statusBaru: STATUS_PESANAN.DIBATALKAN,
      aktorId: userId,
      keterangan: 'Dibatalkan oleh pelanggan.',
      trx,
    });
  });
}

module.exports = {
  hitungDurasiHari,
  buatPesanan,
  ambilPesanan,
  riwayatPengguna,
  ubahStatus,
  batalkanPesanan,
};
