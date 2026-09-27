const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * Error handler terpusat.
 * Bentuk respons galat wajib seragam: { status, code, message, details? }
 */
// eslint-disable-next-line no-unused-vars -- Express mengenali error handler dari 4 argumen
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // Galat tak terduga — catat lengkap di server, jangan bocorkan ke klien.
  console.error('[GALAT TAK TERTANGANI]', {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  return res.status(500).json({
    status: 'error',
    code: 'GALAT_INTERNAL',
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    ...(config.isProduction ? {} : { details: err.message }),
  });
}

/** 404 untuk rute yang tidak dikenal. */
function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    code: 'RUTE_TIDAK_DITEMUKAN',
    message: `Rute ${req.method} ${req.originalUrl} tidak tersedia.`,
  });
}

module.exports = { errorHandler, notFoundHandler };
