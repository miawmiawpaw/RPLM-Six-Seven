const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Keamanan dasar ──────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: config.app.baseUrl,
    credentials: true,
  })
);

// ─── Rate limiting (REQ-4.1.5 + mitigasi tambahan §6.2) ──────────────────────
// Dibedakan: endpoint autentikasi jauh lebih ketat daripada API umum.
const limiterUmum = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', code: 'TERLALU_BANYAK_PERMINTAAN', message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});

const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', code: 'TERLALU_BANYAK_PERCOBAAN', message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
});

/**
 * PENTING — webhook Midtrans didaftarkan SEBELUM express.json().
 *
 * Signature Midtrans dihitung dari nilai field body, tetapi beberapa gateway
 * menghitungnya dari byte mentah. Dengan mendaftarkan rute webhook lebih dulu dan
 * memakai express.raw(), kita menyimpan body mentah di req.body (Buffer) sehingga
 * verifikasi tidak bergantung pada hasil parsing JSON.
 *
 * Lihat docs/architecture.md §4.2.
 */
app.use('/api/payment/webhook', express.raw({ type: '*/*' }), require('./modules/payment/payment.routes.webhook'));

// ─── Parser body untuk rute lainnya ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Pembatas laju ───────────────────────────────────────────────────────────
app.use('/api/auth', limiterAuth);
app.use('/api', limiterUmum);

// ─── Endpoint kesehatan ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    layanan: 'rental-alat-camping-api',
    waktu: new Date().toISOString(),
  });
});

// ─── Rute domain ─────────────────────────────────────────────────────────────
// Setiap modul mendaftarkan rutenya sendiri; app.js tidak tahu detail internalnya.
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/catalog', require('./modules/catalog/catalog.routes'));
app.use('/api/inventory', require('./modules/inventory/inventory.routes'));
app.use('/api/orders', require('./modules/order/order.routes'));
app.use('/api/payment', require('./modules/payment/payment.routes'));
app.use('/api/handover', require('./modules/handover/handover.routes'));
app.use('/api/penalty', require('./modules/penalty/penalty.routes'));
app.use('/api/reports', require('./modules/report/report.routes'));

// ─── Penanganan galat (harus paling akhir) ───────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
