require('dotenv').config();

/**
 * Konfigurasi terpusat. Seluruh pembacaan process.env terjadi di sini —
 * modul lain mengimpor objek `config`, tidak menyentuh process.env langsung.
 *
 * Alasan: memudahkan penelusuran variabel mana yang benar-benar dipakai,
 * dan memusatkan kegagalan saat variabel wajib tidak diisi.
 */

/**
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Variabel lingkungan ${key} belum diisi. Salin .env.example menjadi .env lalu lengkapi.`
    );
  }
  return value;
}

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const config = {
  env,
  isProduction,
  port: Number(process.env.PORT || 3000),

  // SRS §2.5 — seluruh data transaksi memakai UTC+7 (WIB)
  timezone: 'Asia/Jakarta',

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT || 3306),
    database: required('DB_NAME', 'rental_alat_camping'),
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD || '',
  },

  // ADR-14 — masa berlaku JWT sudah ditetapkan
  jwt: {
    secret: required('JWT_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '30m',
  },

  // ADR-11 — Midtrans. Kredensial berbeda antara sandbox dan produksi.
  midtrans: {
    serverKey: required('MIDTRANS_SERVER_KEY'),
    clientKey: required('MIDTRANS_CLIENT_KEY'),
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  },

  mail: {
    host: process.env.MAIL_HOST || '',
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER || '',
    password: process.env.MAIL_PASSWORD || '',
    from: process.env.MAIL_FROM || 'Rental Alat Camping <no-reply@example.com>',
  },

  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
  },
};

module.exports = config;
