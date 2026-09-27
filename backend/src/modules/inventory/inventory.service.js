const db = require('../../config/database');
const { PERAN } = require('../../constants');
const { NotFoundError } = require('../../utils/errors');
const { formatTanggal } = require('../../utils/helpers');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');

/**
 * Modul inventaris — REQ-4.3.1 s.d. REQ-4.3.10.
 * Hanya ADMIN yang dapat mengubah data alat (SRS §5.5).
 */

/** Daftar alat untuk admin — termasuk yang nonaktif, agar riwayat tetap terlihat. */
async function daftarAlat({ kategori, kataKunci, sertakanNonaktif = true, halaman = 1, batas = 20 } = {}) {
  const query = db('Item')
    .join('Category', 'Category.category_id', 'Item.category_id')
    .select(
      'Item.item_id',
      'Item.kode_barang',
      'Item.nama',
      'Item.merk',
      'Item.stok_fisik',
      'Item.stok_minimum',
      'Item.tarif_harian',
      'Item.status_kondisi',
      'Item.is_aktif',
      'Category.nama as kategori'
    );

  if (!sertakanNonaktif) query.where('Item.is_aktif', true);
  if (kategori) query.where('Item.category_id', kategori);
  if (kataKunci) query.where('Item.nama', 'like', `%${kataKunci}%`);

  const totalQuery = query.clone().clearSelect().clearOrder().count({ n: 'Item.item_id' });
  const [total] = await totalQuery;

  const baris = await query
    .orderBy('Item.kode_barang')
    .limit(batas)
    .offset((halaman - 1) * batas);

  return {
    data: baris.map(formatAlat),
    meta: { halaman, batas, total: Number(total.n) },
  };
}

function formatAlat(a) {
  return {
    item_id: String(a.item_id),
    kode_barang: a.kode_barang,
    nama: a.nama,
    merk: a.merk,
    kategori: a.kategori,
    stok_fisik: a.stok_fisik,
    stok_minimum: a.stok_minimum,
    tarif_harian: Number(a.tarif_harian),
    status_kondisi: a.status_kondisi,
    is_aktif: Boolean(a.is_aktif),
    // FR-027 — peringatan bila stok di bawah ambang minimum.
    stok_menipis: a.stok_fisik <= a.stok_minimum,
  };
}

async function ambilAlat(itemId, trx = db) {
  const item = await trx('Item')
    .join('Category', 'Category.category_id', 'Item.category_id')
    .where('Item.item_id', itemId)
    .select('Item.*', 'Category.nama as kategori')
    .first();

  if (!item) throw new NotFoundError('Alat tidak ditemukan.');
  return formatAlat(item);
}

/** REQ-4.3.2 — tambah alat. */
async function tambahAlat(data, aktorId) {
  return db.transaction(async (trx) => {
    const [itemId] = await trx('Item').insert({
      kode_barang: data.kode_barang,
      nama: data.nama,
      category_id: data.category_id,
      merk: data.merk || null,
      stok_fisik: data.stok_fisik,
      stok_minimum: data.stok_minimum ?? 1,
      tarif_harian: data.tarif_harian,
      status_kondisi: data.status_kondisi || 'TERSEDIA',
      is_aktif: true,
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.INVENTARIS_TAMBAH,
      entity: 'Item',
      entityId: itemId,
      aktorId,
      sesudah: data,
    });

    return ambilAlat(itemId, trx);
  });
}

/** REQ-4.3.3 — ubah alat. */
async function ubahAlat(itemId, perubahan, aktorId) {
  return db.transaction(async (trx) => {
    const sebelum = await trx('Item').where({ item_id: itemId }).first();
    if (!sebelum) throw new NotFoundError('Alat tidak ditemukan.');

    await trx('Item').where({ item_id: itemId }).update({
      ...perubahan,
      updated_at: trx.fn.now(),
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.INVENTARIS_UBAH,
      entity: 'Item',
      entityId: itemId,
      aktorId,
      sebelum: {
        nama: sebelum.nama,
        stok_fisik: sebelum.stok_fisik,
        tarif_harian: Number(sebelum.tarif_harian),
        status_kondisi: sebelum.status_kondisi,
      },
      sesudah: perubahan,
    });

    return ambilAlat(itemId, trx);
  });
}

/**
 * REQ-4.3.3 — hapus alat.
 * ADR-05: soft delete. Menghapus baris akan memutus riwayat pesanan lama yang
 * mereferensikannya (REQ-4.3.4), jadi yang dinonaktifkan hanyalah flag `is_aktif`.
 */
async function hapusAlat(itemId, aktorId) {
  return db.transaction(async (trx) => {
    const sebelum = await trx('Item').where({ item_id: itemId }).first();
    if (!sebelum) throw new NotFoundError('Alat tidak ditemukan.');

    if (!sebelum.is_aktif) {
      return { sudahNonaktif: true, item: await ambilAlat(itemId, trx) };
    }

    // Menolak menonaktifkan alat yang sedang disewa — stoknya masih terikat reservasi aktif.
    const reservasiAktif = await trx('StockReservation')
      .where({ item_id: itemId })
      .whereIn('status', ['MENUNGGU_PEMBAYARAN', 'DIBAYAR', 'DISIAPKAN', 'SEDANG_DISEWA'])
      .first();

    if (reservasiAktif) {
      const { ConflictError } = require('../../utils/errors');
      throw new ConflictError(
        'Alat tidak dapat dinonaktifkan karena masih terikat pada pesanan aktif.',
        'ALAT_SEDANG_DIPAKAI'
      );
    }

    await trx('Item').where({ item_id: itemId }).update({ is_aktif: false, updated_at: trx.fn.now() });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.INVENTARIS_HAPUS,
      entity: 'Item',
      entityId: itemId,
      aktorId,
      sebelum: { nama: sebelum.nama, is_aktif: true },
      sesudah: { is_aktif: false },
      keterangan: 'Dinonaktifkan (soft delete) — riwayat pesanan tetap utuh.',
    });

    return { sudahNonaktif: false, item: await ambilAlat(itemId, trx) };
  });
}

/** REQ-4.3.8 — ubah status kondisi alat. */
async function ubahKondisi({ itemId, statusKondisi, aktorId }) {
  return db.transaction(async (trx) => {
    const sebelum = await trx('Item').where({ item_id: itemId }).first();
    if (!sebelum) throw new NotFoundError('Alat tidak ditemukan.');

    await trx('Item').where({ item_id: itemId }).update({
      status_kondisi: statusKondisi,
      updated_at: trx.fn.now(),
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.INVENTARIS_KONDISI,
      entity: 'Item',
      entityId: itemId,
      aktorId,
      sebelum: { status_kondisi: sebelum.status_kondisi },
      sesudah: { status_kondisi: statusKondisi },
    });

    return ambilAlat(itemId, trx);
  });
}

/**
 * FR-027 — daftar alat yang stoknya di bawah ambang minimum.
 * Dipakai dashboard admin untuk peringatan restok.
 */
async function alatStokMenipis() {
  const baris = await db('Item')
    .where('is_aktif', true)
    .whereRaw('stok_fisik <= stok_minimum')
    .select('item_id', 'kode_barang', 'nama', 'stok_fisik', 'stok_minimum');

  return baris.map((b) => ({
    item_id: String(b.item_id),
    kode_barang: b.kode_barang,
    nama: b.nama,
    stok_fisik: b.stok_fisik,
    stok_minimum: b.stok_minimum,
  }));
}

// ─── Paket bundle ────────────────────────────────────────────────────────────

async function daftarBundle({ sertakanNonaktif = true } = {}) {
  const query = db('Bundle').select('*');
  if (!sertakanNonaktif) query.where('is_aktif', true);

  const bundles = await query.orderBy('nama');
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

  return bundles.map((b) => ({
    bundle_id: String(b.bundle_id),
    nama: b.nama,
    deskripsi: b.deskripsi,
    harga_bundle: Number(b.harga_bundle),
    is_aktif: Boolean(b.is_aktif),
    komponen: perBundle.get(Number(b.bundle_id)) || [],
  }));
}

/** REQ-4.3.6 — buat paket bundle beserta komposisinya. */
async function buatBundle({ nama, deskripsi, harga_bundle, komponen }, aktorId) {
  return db.transaction(async (trx) => {
    const [bundleId] = await trx('Bundle').insert({
      nama,
      deskripsi: deskripsi || null,
      harga_bundle,
      is_aktif: true,
    });

    await trx('BundleItem').insert(
      komponen.map((k) => ({ bundle_id: bundleId, item_id: k.item_id, kuantitas: k.kuantitas }))
    );

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PAKET_TAMBAH,
      entity: 'Bundle',
      entityId: bundleId,
      aktorId,
      sesudah: { nama, harga_bundle, jumlah_komponen: komponen.length },
    });

    return { bundle_id: String(bundleId), nama, harga_bundle };
  });
}

/** Ubah paket bundle; komposisi diganti seluruhnya bila dikirim. */
async function ubahBundle(bundleId, { komponen, ...perubahan }, aktorId) {
  return db.transaction(async (trx) => {
    const sebelum = await trx('Bundle').where({ bundle_id: bundleId }).first();
    if (!sebelum) throw new NotFoundError('Paket tidak ditemukan.');

    if (Object.keys(perubahan).length > 0) {
      await trx('Bundle').where({ bundle_id: bundleId }).update({ ...perubahan, updated_at: trx.fn.now() });
    }

    if (Array.isArray(komponen)) {
      await trx('BundleItem').where({ bundle_id: bundleId }).del();
      if (komponen.length > 0) {
        await trx('BundleItem').insert(
          komponen.map((k) => ({ bundle_id: bundleId, item_id: k.item_id, kuantitas: k.kuantitas }))
        );
      }
    }

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PAKET_UBAH,
      entity: 'Bundle',
      entityId: bundleId,
      aktorId,
      sebelum: { nama: sebelum.nama, harga_bundle: Number(sebelum.harga_bundle) },
      sesudah: perubahan,
    });

    return { bundle_id: String(bundleId) };
  });
}

module.exports = {
  daftarAlat,
  ambilAlat,
  tambahAlat,
  ubahAlat,
  hapusAlat,
  ubahKondisi,
  alatStokMenipis,
  daftarBundle,
  buatBundle,
  ubahBundle,
  formatAlat,
  PERAN,
  formatTanggal,
};
