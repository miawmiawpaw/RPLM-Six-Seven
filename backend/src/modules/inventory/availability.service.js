const db = require('../../config/database');
const { STATUS_PESANAN_AKTIF } = require('../../constants');

/**
 * Availability Engine — REQ-4.2.4, REQ-4.2.5.
 *
 * ADR-02: ketersediaan DIHITUNG saat kueri, bukan disimpan sebagai kolom.
 *         Kolom statis akan menyimpang (drift) dan sulit direkonsiliasi.
 * ADR-03: reservasi dipecah per item satuan, bukan per bundle (REQ-4.3.7).
 * ADR-10: penguncian pesimistik — lihat `kunciStokPesanan` di order.repository.js.
 *
 * Rumus:
 *   stok tersedia(item, mulai, selesai)
 *     = stok_fisik
 *     − Σ unit terikat pesanan berstatus AKTIF yang rentangnya beririsan
 *
 * Dua rentang tanggal beririsan bila: mulai_diminta <= selesai_ada
 *                                DAN  selesai_diminta >= mulai_ada.
 * Tanggal selesai bersifat inklusif (FR-013).
 */

/**
 * Hitung unit terpakai untuk sekumpulan item pada rentang tanggal tertentu.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trx
 * @param {number[]} itemIds
 * @param {string} tanggalMulai 'YYYY-MM-DD'
 * @param {string} tanggalSelesai 'YYYY-MM-DD'
 * @returns {Promise<Map<number, number>>} item_id → unit terpakai
 */
async function hitungUnitTerpakai(trx, itemIds, tanggalMulai, tanggalSelesai) {
  if (itemIds.length === 0) return new Map();

  const baris = await trx('StockReservation')
    .whereIn('StockReservation.item_id', itemIds)
    .whereIn('StockReservation.status', STATUS_PESANAN_AKTIF)
    // Syarat irisan rentang — inklusif pada kedua ujung.
    .where('StockReservation.tanggal_mulai', '<=', tanggalSelesai)
    .where('StockReservation.tanggal_selesai', '>=', tanggalMulai)
    // Kolom `StockReservation.status` hanya berisi AKTIF / DILEPAS / TERPAKAI —
    // TIDAK memakai nilai STATUS_PESANAN (lihat migrasi 20260928000001). Yang
    // menentukan sebuah reservasi masih mengikat stok hanyalah status 'AKTIF';
    // pesanan batal atau kedaluwarsa mengubahnya menjadi 'DILEPAS'.
    .where('StockReservation.status', 'AKTIF')
    .sum({ terpakai: 'StockReservation.kuantitas' });

  return new Map(baris.map((b) => [Number(b.item_id), Number(b.terpakai)]));
}

/**
 * Hitung stok tersedia untuk daftar item pada satu rentang tanggal.
 *
 * @param {object} params
 * @param {number[]} params.itemIds
 * @param {string} params.tanggalMulai
 * @param {string} params.tanggalSelesai
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [params.trx]
 * @returns {Promise<Array<{item_id: number, stok_fisik: number, terpakai: number, tersedia: number}>>}
 */
async function hitungKetersediaan({ itemIds, tanggalMulai, tanggalSelesai, trx = db }) {
  if (!itemIds || itemIds.length === 0) return [];

  const items = await trx('Item')
    .whereIn('item_id', itemIds)
    .where('is_aktif', true)
    .select('item_id', 'stok_fisik', 'status_kondisi', 'nama', 'kode_barang');

  const terpakaiMap = await hitungUnitTerpakai(trx, itemIds, tanggalMulai, tanggalSelesai);

  return items.map((item) => {
    const terpakai = terpakaiMap.get(Number(item.item_id)) || 0;

    // Alat yang rusak atau hilang tidak dapat disewakan (SRS §5.5), berapa pun stoknya.
    const dapatDisewa = item.status_kondisi === 'TERSEDIA';
    const tersedia = dapatDisewa ? Math.max(0, item.stok_fisik - terpakai) : 0;

    return {
      item_id: Number(item.item_id),
      nama: item.nama,
      kode_barang: item.kode_barang,
      stok_fisik: item.stok_fisik,
      terpakai,
      tersedia,
      status_kondisi: item.status_kondisi,
    };
  });
}

/**
 * Periksa apakah jumlah yang diminta tersedia.
 *
 * Dipakai di dalam transaksi checkout, SETELAH baris Item dikunci dengan FOR UPDATE
 * (ADR-10). Memanggil fungsi ini di luar transaksi hanya memberi gambaran sementara —
 * hasilnya bisa berubah sebelum pesanan tersimpan.
 *
 * @param {object} params
 * @param {import('knex').Knex.Transaction} params.trx WAJIB transaksi
 * @param {Array<{item_id: number, kuantitas: number}>} params.kebutuhan
 * @param {string} params.tanggalMulai
 * @param {string} params.tanggalSelesai
 * @returns {Promise<{cukup: boolean, kekurangan: Array<object>}>}
 */
async function periksaKetersediaan({ trx, kebutuhan, tanggalMulai, tanggalSelesai }) {
  const itemIds = kebutuhan.map((k) => Number(k.item_id));
  const ketersediaan = await hitungKetersediaan({ itemIds, tanggalMulai, tanggalSelesai, trx });

  const petaTersedia = new Map(ketersediaan.map((k) => [k.item_id, k]));

  // Gabungkan permintaan untuk item yang sama — satu item bisa muncul dari beberapa bundle.
  const permintaanGabungan = new Map();
  for (const butuh of kebutuhan) {
    const id = Number(butuh.item_id);
    permintaanGabungan.set(id, (permintaanGabungan.get(id) || 0) + Number(butuh.kuantitas));
  }

  const kekurangan = [];
  for (const [itemId, jumlahDiminta] of permintaanGabungan.entries()) {
    const info = petaTersedia.get(itemId);
    if (!info) {
      kekurangan.push({ item_id: itemId, diminta: jumlahDiminta, tersedia: 0, alasan: 'ALAT_TIDAK_DITEMUKAN_ATAU_NONAKTIF' });
      continue;
    }
    if (info.tersedia < jumlahDiminta) {
      kekurangan.push({
        item_id: itemId,
        nama: info.nama,
        diminta: jumlahDiminta,
        tersedia: info.tersedia,
        alasan: info.status_kondisi !== 'TERSEDIA' ? 'KONDISI_TIDAK_TERSEDIA' : 'STOK_TIDAK_CUKUP',
      });
    }
  }

  return { cukup: kekurangan.length === 0, kekurangan };
}

/**
 * Ekspansi komposisi bundle menjadi kebutuhan item satuan.
 * ADR-03 / REQ-4.3.7 — inilah yang membuat 1 paket mengunci komponennya secara terpisah.
 *
 * @param {object} params
 * @param {import('knex').Knex|import('knex').Knex.Transaction} params.trx
 * @param {Array<{tipe: string, item_id?: number, bundle_id?: number, kuantitas: number}>} params.barisKeranjang
 * @returns {Promise<Array<{item_id: number, kuantitas: number, asal: string}>>}
 */
async function ekspansiKebutuhan({ trx, barisKeranjang }) {
  const hasil = [];

  for (const baris of barisKeranjang) {
    if (baris.tipe === 'ITEM') {
      hasil.push({
        item_id: Number(baris.item_id),
        kuantitas: Number(baris.kuantitas),
        asal: `ITEM:${baris.item_id}`,
      });
      continue;
    }

    if (baris.tipe === 'BUNDLE') {
      const komponen = await trx('BundleItem')
        .where({ bundle_id: baris.bundle_id })
        .select('item_id', 'kuantitas');

      if (komponen.length === 0) {
        throw new Error(`Bundle ${baris.bundle_id} tidak memiliki komponen.`);
      }

      for (const k of komponen) {
        hasil.push({
          item_id: Number(k.item_id),
          kuantitas: Number(k.kuantitas) * Number(baris.kuantitas),
          asal: `BUNDLE:${baris.bundle_id}`,
        });
      }
    }
  }

  return hasil;
}

/**
 * Filter daftar bundle: hanya tampilkan yang seluruh komponennya tersedia.
 * REQ-4.2.6 — bundle tidak boleh ditampilkan sebagai tersedia bila ada komponen kurang.
 *
 * @param {object} params
 * @param {Array<object>} params.bundles
 * @param {string} params.tanggalMulai
 * @param {string} params.tanggalSelesai
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [params.trx]
 */
async function saringBundleTersedia({ bundles, tanggalMulai, tanggalSelesai, trx = db }) {
  if (bundles.length === 0) return [];

  const bundleIds = bundles.map((b) => b.bundle_id);

  const komponen = await trx('BundleItem')
    .whereIn('bundle_id', bundleIds)
    .select('bundle_id', 'item_id', 'kuantitas');

  const itemIds = [...new Set(komponen.map((k) => Number(k.item_id)))];
  const ketersediaan = await hitungKetersediaan({ itemIds, tanggalMulai, tanggalSelesai, trx });
  const petaTersedia = new Map(ketersediaan.map((k) => [k.item_id, k.tersedia]));

  const komponenPerBundle = new Map();
  for (const k of komponen) {
    const id = Number(k.bundle_id);
    if (!komponenPerBundle.has(id)) komponenPerBundle.set(id, []);
    komponenPerBundle.get(id).push(k);
  }

  return bundles.filter((bundle) => {
    const daftar = komponenPerBundle.get(Number(bundle.bundle_id)) || [];
    if (daftar.length === 0) return false;

    return daftar.every((k) => {
      const tersedia = petaTersedia.get(Number(k.item_id)) ?? 0;
      // Bundle terbatas oleh komponen yang paling langka.
      return tersedia >= Number(k.kuantitas);
    });
  });
}

module.exports = {
  hitungUnitTerpakai,
  hitungKetersediaan,
  periksaKetersediaan,
  ekspansiKebutuhan,
  saringBundleTersedia,
};
