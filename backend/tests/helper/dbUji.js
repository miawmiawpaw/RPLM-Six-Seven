/**
 * Database uji untuk tes integrasi.
 *
 * Wajib di-require PALING AWAL di berkas tes, sebelum modul src/ apa pun, karena
 * config/index.js membaca process.env sekali saat dimuat.
 *
 * Aman: nama database selalu berakhiran `_test`, jadi data pengembangan tidak tersentuh.
 * Bila MySQL tidak menyala, siapkan() mengembalikan false dan tes integrasi dilewati.
 */
require('dotenv').config();

const dasar = process.env.DB_NAME || 'rental_alat_camping';
process.env.DB_NAME = dasar.endsWith('_test') ? dasar : `${dasar}_test`;
// Nilai palsu khusus tes; dotenv tidak menimpa variabel yang sudah ada.
process.env.JWT_SECRET ||= 'rahasia-uji-minimal-32-karakter-xxxxxxxx';
process.env.MIDTRANS_SERVER_KEY ||= 'kunci-server-uji';
process.env.MIDTRANS_CLIENT_KEY ||= 'kunci-klien-uji';

const knexLib = require('knex');
const konfigurasi = require('../../knexfile').development;

const NAMA_DB = process.env.DB_NAME;
if (!NAMA_DB.endsWith('_test')) throw new Error(`Menolak: ${NAMA_DB} bukan database uji.`);

const tanpaDb = () => knexLib({ ...konfigurasi, connection: { ...konfigurasi.connection, database: undefined } });

/** Buat ulang database uji dari nol: migrasi lalu seed. @returns {Promise<boolean>} false bila MySQL tidak tersedia */
async function siapkan() {
  const server = tanpaDb();
  try {
    await server.raw('DROP DATABASE IF EXISTS ??', [NAMA_DB]);
    await server.raw('CREATE DATABASE ?? CHARACTER SET utf8mb4', [NAMA_DB]);
  } catch (err) {
    console.warn(`[tes] MySQL tidak tersedia, tes integrasi dilewati: ${err.code || err.message}`);
    return false;
  } finally {
    await server.destroy();
  }

  const knex = knexLib(konfigurasi);
  const log = console.log;
  console.log = () => {}; // seed mencetak kata sandi default; tidak perlu muncul di keluaran tes
  try {
    await knex.migrate.latest();
    await knex.seed.run();
  } finally {
    console.log = log;
    await knex.destroy();
  }
  return true;
}

/** Hapus database uji dan tutup koneksi aplikasi. */
async function bersihkan() {
  await require('../../src/config/database').destroy();
  const server = tanpaDb();
  try {
    await server.raw('DROP DATABASE IF EXISTS ??', [NAMA_DB]);
  } finally {
    await server.destroy();
  }
}

module.exports = { siapkan, bersihkan };
