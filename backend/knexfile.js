require('dotenv').config();
const path = require('path');

/**
 * Konfigurasi Knex untuk CLI (migrate / seed).
 * Koneksi runtime aplikasi ada di src/config/database.js — berkas ini hanya untuk CLI.
 */

const base = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'rental_alat_camping',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    timezone: '+07:00',
    dateStrings: true,
  },
  pool: { min: 0, max: 5 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
  },
};

module.exports = {
  development: base,
  // Salinan skema untuk pengujian; basis data terpisah agar data uji tidak bercampur.
  test: {
    ...base,
    connection: { ...base.connection, database: `${base.connection.database}_test` },
  },
  staging: base,
  production: base,
};
