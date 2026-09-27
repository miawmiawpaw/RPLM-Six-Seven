const knex = require('knex');
const config = require('./index');

/**
 * Koneksi basis data tunggal (connection pool).
 * ADR-12: Knex sebagai query builder — SQL tetap ditulis eksplisit.
 */
const db = knex({
  client: 'mysql2',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    // Simpan tanggal sebagai string agar tidak digeser oleh zona waktu proses.
    // Zona waktu transaksi ditetapkan UTC+7 di lapisan aplikasi (SRS §2.5).
    timezone: '+07:00',
    dateStrings: true,
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: require('path').join(__dirname, '../../migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: require('path').join(__dirname, '../../seeds'),
  },
});

module.exports = db;
