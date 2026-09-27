const db = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');
const { formatTanggal } = require('../../utils/helpers');
const availability = require('../inventory/availability.service');

/**
 * Modul katalog — REQ-4.2.1, REQ-4.2.2, REQ-4.2.4, REQ-4.2.5, REQ-4.2.6.
 *
 * Katalog dapat diakses TANPA login, tetapi menampilkan ketersediaan memerlukan
 * rentang tanggal. Bila tanggal tidak dikirim, ketersediaan tidak dihitung dan
 * `tersedia` bernilai null — jangan tampilkan angka yang tidak dapat dipertanggungjawabkan.
 */

/** Daftar kategori — REQ-4.2.2. */
async function daftarKategori() {
  const baris = await db('Category').select('category_id', 'nama', 'deskripsi').orderBy('nama');
  return baris.map((k) => ({
    category_id: String(k.category_id),
    nama: k.nama,
    deskripsi: k.deskripsi,
  }));
}

/**
 * Cari alat — REQ-4.2.1.
 *
 * @param {object} params
 * @param {string} [params.kataKunci]
 * @param {number|string} [params.kategori]
 * @param {number} [params.halaman]
 * @param {number} [params.batas]
 */
async function cariAlat({ kataKunci, kategori, halaman = 1, batas = 12 } = {}) {
  const query = db('Item')
    .join('Category', 'Category.category_id', 'Item.category_id')
    .where('Item.is_aktif', true)
    .select('Item.*', 'Category.nama as kategori');

  if (kataKunci) {
    query.where((qb) => {
      qb.where('Item.nama', 'like', `%${kataKunci}%`).orWhere('Item.merk', 'like', `%${kataKunci}%`);
    });
  }
  if (kategori) query.where('Item.category_id', kategori);

  const [total] = await query.clone().clearSelect().clearOrder().count({ n: 'Item.item_id' });

  const baris = await query
    .orderBy('Item.nama')
    .limit(batas)
    .offset((halaman - 1) * batas);

  return {
    data: baris.map(formatItemKatalog),
    meta: { halaman, batas, total: Number(total.n) },
  };
}

function formatItemKatalog(item) {
  return {
    item_id: String(item.item_id),
    kode_barang: item.kode_barang,
    nama: item.nama,
    merk: item.merk,
    kategori: item.kategori,
    tarif_harian: Number(item.tarif_harian),
    status_kondisi: item.status_kondisi,
    stok_fisik: item.stok_fisik,
    stok_minimum: item.stok_minimum,
    tersedia: null, // diisi bila rentang tanggal dikirim
    media: [],
  };
}

/** Ambil media (foto/video) untuk sekumpulan item — menghindari kueri N+1. */
async function ambilMedia(itemIds, trx = db) {
  if (itemIds.length === 0) return new Map();

  const baris = await trx('ItemMedia')
    .whereIn('item_id', itemIds)
    .orderBy('urutan')
    .select('item_id', 'tipe', 'url', 'urutan');

  const peta = new Map();
  for (const m of baris) {
    const id = Number(m.item_id);
    if (!peta.has(id)) peta.set(id, []);
    peta.get(id).push({ tipe: m.tipe, url: m.url, urutan: m.urutan });
  }
  return peta;
}

/**
 * Detail alat — REQ-4.2.4.
 * Ketersediaan dihitung hanya bila rentang tanggal diberikan.
 */
async function detailAlat(itemId, { mulai, selesai } = {}) {
  const item = await db('Item')
    .join('Category', 'Category.category_id', 'Item.category_id')
    .where('Item.item_id', itemId)
    .where('Item.is_aktif', true)
    .select('Item.*', 'Category.nama as kategori')
    .first();

  if (!item) throw new NotFoundError('Alat tidak ditemukan.');

  const hasil = formatItemKatalog(item);
  const media = await ambilMedia([Number(itemId)]);
  hasil.media = media.get(Number(itemId)) || [];

  if (mulai && selesai) {
    const [ketersediaan] = await availability.hitungKetersediaan({
      itemIds: [Number(itemId)],
      tanggalMulai: formatTanggal(mulai),
      tanggalSelesai: formatTanggal(selesai),
    });
    hasil.tersedia = ketersediaan ? ketersediaan.tersedia : 0;
    hasil.stok_fisik = ketersediaan ? ketersediaan.stok_fisik : hasil.stok_fisik;
  }

  return hasil;
}

/**
 * Daftar paket bundle — REQ-4.2.6.
 *
 * Bila rentang tanggal diberikan, bundle yang komponennya tidak tersedia TIDAK
 * ditampilkan sama sekali. Menampilkan paket yang tidak dapat dipesan hanya
 * menghasilkan kekecewaan saat checkout.
 */
async function daftarBundle({ mulai, selesai } = {}) {
  const bundles = await db('Bundle').where('is_aktif', true).orderBy('nama');
  if (bundles.length === 0) return [];

  const komponen = await db('BundleItem')
    .join('Item', 'Item.item_id', 'BundleItem.item_id')
    .whereIn('BundleItem.bundle_id', bundles.map((b) => b.bundle_id))
    .select('BundleItem.bundle_id', 'BundleItem.item_id', 'BundleItem.kuantitas', 'Item.nama', 'Item.kode_barang');

  const perBundle = new Map();
  for (const k of komponen) {
    const id = Number(k.bundle_id);
    if (!perBundle.has(id)) perBundle.set(id, []);
    perBundle.get(id).push({
      item_id: String(k.item_id),
      kode_barang: k.kode_barang,
      nama: k.nama,
      kuantitas: k.kuantitas,
    });
  }

  let bundleTampil = bundles;
  let petaTersedia = new Map();

  if (mulai && selesai) {
    const mulaiFmt = formatTanggal(mulai);
    const selesaiFmt = formatTanggal(selesai);

    bundleTampil = await availability.saringBundleTersedia({
      bundles,
      tanggalMulai: mulaiFmt,
      tanggalSelesai: selesaiFmt,
    });

    // Berapa unit paket yang dapat dipesan = min(tersedia / kebutuhan) antar komponen.
    const semuaItemIds = [...new Set(komponen.map((k) => Number(k.item_id)))];
    const ketersediaan = await availability.hitungKetersediaan({
      itemIds: semuaItemIds,
      tanggalMulai: mulaiFmt,
      tanggalSelesai: selesaiFmt,
    });
    petaTersedia = new Map(ketersediaan.map((k) => [k.item_id, k.tersedia]));
  }

  return bundleTampil.map((b) => {
    const komponenBundle = perBundle.get(Number(b.bundle_id)) || [];

    let tersedia = null;
    if (mulai && selesai) {
      tersedia = komponenBundle.reduce((min, k) => {
        const sisaKomponen = Math.floor((petaTersedia.get(Number(k.item_id)) ?? 0) / k.kuantitas);
        return Math.min(min, sisaKomponen);
      }, Number.MAX_SAFE_INTEGER);
      if (tersedia === Number.MAX_SAFE_INTEGER) tersedia = 0;
    }

    return {
      bundle_id: String(b.bundle_id),
      nama: b.nama,
      deskripsi: b.deskripsi,
      harga_bundle: Number(b.harga_bundle),
      komponen: komponenBundle,
      tersedia,
    };
  });
}

/**
 * Riwayat penyewaan pelanggan untuk halaman publik — REQ-4.6.4.
 * Mengembalikan alat yang paling sering disewa.
 */
async function alatTerpopuler({ batas = 6 } = {}) {
  const baris = await db('OrderItem')
    .join('Item', 'Item.item_id', 'OrderItem.item_id')
    .where('OrderItem.tipe', 'ITEM')
    .groupBy('Item.item_id', 'Item.nama', 'Item.tarif_harian')
    .select('Item.item_id', 'Item.nama', 'Item.tarif_harian')
    .sum({ jumlah_disewa: 'OrderItem.kuantitas' })
    .orderBy('jumlah_disewa', 'desc')
    .limit(batas);

  return baris.map((b) => ({
    item_id: String(b.item_id),
    nama: b.nama,
    tarif_harian: Number(b.tarif_harian),
    jumlah_disewa: Number(b.jumlah_disewa),
  }));
}

module.exports = {
  daftarKategori,
  cariAlat,
  detailAlat,
  daftarBundle,
  alatTerpopuler,
  ambilMedia,
};
