const bcrypt = require('bcrypt');
const { PERAN } = require('../src/constants');

/**
 * Data awal.
 *
 * Akun admin sengaja memakai kata sandi default yang lemah agar proyek dapat langsung
 * dijalankan. WAJIB diganti sebelum deploy — dan wajib diganti sebelum repo ini dipakai
 * dengan data nyata.
 */

const KATA_SANDI_ADMIN_DEFAULT = 'Admin#12345';
const KATA_SANDI_PETUGAS_DEFAULT = 'Petugas#12345';

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seed(knex) {
  // Urutan hapus menghormati foreign key.
  await knex('AuditLog').del();
  await knex('NotificationLog').del();
  await knex('Penalty').del();
  await knex('PenaltyRate').del();
  await knex('ChecklistItem').del();
  await knex('ChecklistRecord').del();
  await knex('Payment').del();
  await knex('StockReservation').del();
  await knex('OrderItem').del();
  await knex('Order').del();
  await knex('BundleItem').del();
  await knex('Bundle').del();
  await knex('ItemMedia').del();
  await knex('Item').del();
  await knex('Category').del();
  await knex('User').del();

  // ─── Pengguna ──────────────────────────────────────────────────────────────
  const [adminId] = await knex('User').insert({
    nama: 'Administrator',
    email: 'admin@rentalcamping.test',
    nomor_telepon: '081200000001',
    password_hash: await bcrypt.hash(KATA_SANDI_ADMIN_DEFAULT, 10),
    role: PERAN.ADMIN,
    status_verifikasi: 'AKTIF',
  });

  await knex('User').insert({
    nama: 'Petugas Lapangan',
    email: 'petugas@rentalcamping.test',
    nomor_telepon: '081200000002',
    password_hash: await bcrypt.hash(KATA_SANDI_PETUGAS_DEFAULT, 10),
    role: PERAN.PETUGAS,
    status_verifikasi: 'AKTIF',
  });

  // ─── Kategori ──────────────────────────────────────────────────────────────
  // Lima kategori dasar sesuai SRS §2.2.
  const kategori = [
    { nama: 'Tenda', deskripsi: 'Tenda dome, tenda pramuka, dan flysheet' },
    { nama: 'Tas / Carrier', deskripsi: 'Carrier, daypack, dan tas gunung' },
    { nama: 'Nesting', deskripsi: 'Peralatan masak dan makan' },
    { nama: 'Alat Masak', deskripsi: 'Kompor, burner, dan perlengkapannya' },
    { nama: 'Lampu', deskripsi: 'Lampu tenda, headlamp, dan senter' },
  ];
  await knex('Category').insert(kategori);

  const semuaKategori = await knex('Category').select('category_id', 'nama');
  const idKategori = Object.fromEntries(semuaKategori.map((k) => [k.nama, k.category_id]));

  // ─── Alat ──────────────────────────────────────────────────────────────────
  const alat = [
    { kode_barang: 'TND-001', nama: 'Tenda Dome 4 Orang', category_id: idKategori['Tenda'], merk: 'Eiger', stok_fisik: 10, tarif_harian: 75000 },
    { kode_barang: 'TND-002', nama: 'Tenda Dome 2 Orang', category_id: idKategori['Tenda'], merk: 'Consina', stok_fisik: 15, tarif_harian: 55000 },
    { kode_barang: 'TND-003', nama: 'Flysheet 3x4 m', category_id: idKategori['Tenda'], merk: 'Consina', stok_fisik: 8, tarif_harian: 25000 },
    { kode_barang: 'TAS-001', nama: 'Carrier 60L', category_id: idKategori['Tas / Carrier'], merk: 'Deuter', stok_fisik: 12, tarif_harian: 60000 },
    { kode_barang: 'TAS-002', nama: 'Carrier 45L', category_id: idKategori['Tas / Carrier'], merk: 'Eiger', stok_fisik: 10, tarif_harian: 50000 },
    { kode_barang: 'TAS-003', nama: 'Daypack 25L', category_id: idKategori['Tas / Carrier'], merk: 'Arei', stok_fisik: 20, tarif_harian: 30000 },
    { kode_barang: 'NES-001', nama: 'Nesting Set 2 Orang', category_id: idKategori['Nesting'], merk: 'Maxim', stok_fisik: 14, tarif_harian: 25000 },
    { kode_barang: 'MSK-001', nama: 'Kompor Portable', category_id: idKategori['Alat Masak'], merk: 'Kovea', stok_fisik: 18, tarif_harian: 30000 },
    { kode_barang: 'MSK-002', nama: 'Gas Kaleng 230g', category_id: idKategori['Alat Masak'], merk: 'Hi-Cook', stok_fisik: 40, tarif_harian: 15000 },
    { kode_barang: 'LMP-001', nama: 'Lampu Tenda LED', category_id: idKategori['Lampu'], merk: 'Naturehike', stok_fisik: 25, tarif_harian: 15000 },
    { kode_barang: 'LMP-002', nama: 'Headlamp', category_id: idKategori['Lampu'], merk: 'Nitecore', stok_fisik: 22, tarif_harian: 20000 },
  ];
  await knex('Item').insert(alat);

  const semuaAlat = await knex('Item').select('item_id', 'kode_barang');
  const idAlat = Object.fromEntries(semuaAlat.map((a) => [a.kode_barang, a.item_id]));

  // ─── Paket bundle ──────────────────────────────────────────────────────────
  // Komposisi mengikuti contoh di SRS §2.2.
  const [bundleDua] = await knex('Bundle').insert({
    nama: 'Paket Camping 2 Orang',
    deskripsi: 'Cocok untuk camping berdua: 1 tenda, 1 nesting, 1 kompor, 1 lampu.',
    harga_bundle: 130000,
  });

  const [bundleEmpat] = await knex('Bundle').insert({
    nama: 'Paket Camping 4 Orang',
    deskripsi: 'Untuk rombongan kecil: 2 tenda, 2 nesting, 2 kompor, 2 lampu.',
    harga_bundle: 240000,
  });

  await knex('BundleItem').insert([
    { bundle_id: bundleDua, item_id: idAlat['TND-002'], kuantitas: 1 },
    { bundle_id: bundleDua, item_id: idAlat['NES-001'], kuantitas: 1 },
    { bundle_id: bundleDua, item_id: idAlat['MSK-001'], kuantitas: 1 },
    { bundle_id: bundleDua, item_id: idAlat['LMP-001'], kuantitas: 1 },

    { bundle_id: bundleEmpat, item_id: idAlat['TND-002'], kuantitas: 2 },
    { bundle_id: bundleEmpat, item_id: idAlat['NES-001'], kuantitas: 2 },
    { bundle_id: bundleEmpat, item_id: idAlat['MSK-001'], kuantitas: 2 },
    { bundle_id: bundleEmpat, item_id: idAlat['LMP-001'], kuantitas: 2 },
  ]);

  // ─── Tarif denda default ───────────────────────────────────────────────────
  // Penutup KONTRADIKSI-04: bila tarif belum diatur admin dan pengembalian terjadi,
  // sistem tidak boleh gagal total. Ada nilai default.
  await knex('PenaltyRate').insert([
    { tipe: 'DENDA_PER_HARI', nominal: 50000, item_id: null, diatur_oleh: adminId },
    { tipe: 'GANTI_RUGI_DEFAULT', nominal: 200000, item_id: null, diatur_oleh: adminId },
  ]);

  console.log('[SEED] Selesai.');
  console.log(`[SEED] Admin   : admin@rentalcamping.test / ${KATA_SANDI_ADMIN_DEFAULT}`);
  console.log(`[SEED] Petugas : petugas@rentalcamping.test / ${KATA_SANDI_PETUGAS_DEFAULT}`);
  console.log('[SEED] GANTI kata sandi ini sebelum dipakai dengan data nyata.');
};
