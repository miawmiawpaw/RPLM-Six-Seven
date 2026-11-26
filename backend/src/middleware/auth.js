const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { JENIS_TOKEN } = require('../constants');

/** Tolak token yang bukan token akses (refresh, verifikasi email, reset sandi). */
function bacaTokenAkses(token) {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.jenis !== JENIS_TOKEN.AKSES) {
    throw new jwt.JsonWebTokenError('jenis token bukan akses');
  }
  return { id: payload.sub, email: payload.email, peran: payload.peran };
}

/**
 * Verifikasi JWT dari header Authorization (SRS §3.4).
 * Menempelkan { id, email, peran } ke req.user. Hanya token akses yang diterima.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [skema, token] = header.split(' ');

  if (skema !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Token akses tidak ditemukan pada header Authorization.'));
  }

  try {
    req.user = bacaTokenAkses(token);
    return next();
  } catch (err) {
    const pesan =
      err.name === 'TokenExpiredError'
        ? 'Sesi Anda telah berakhir. Silakan masuk kembali.'
        : 'Token akses tidak valid.';
    return next(new UnauthorizedError(pesan));
  }
}

/**
 * Autentikasi opsional — dipakai endpoint katalog yang boleh diakses tamu.
 * Tidak menggagalkan permintaan bila token tidak ada, tetapi mengisi req.user bila ada.
 */
function authenticateOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const [skema, token] = header.split(' ');
  if (skema === 'Bearer' && token) {
    try {
      req.user = bacaTokenAkses(token);
    } catch {
      // Token tidak valid pada endpoint publik — perlakukan sebagai tamu.
    }
  }
  return next();
}

/**
 * RBAC — batasi akses berdasarkan peran (REQ-5.3).
 * Selalu dipakai setelah `authenticate`.
 * @param {...string} peranDiizinkan
 */
function authorize(...peranDiizinkan) {
  return function (req, _res, next) {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!peranDiizinkan.includes(req.user.peran)) {
      return next(
        new ForbiddenError(
          `Tindakan ini hanya dapat dilakukan oleh: ${peranDiizinkan.join(', ')}.`
        )
      );
    }
    return next();
  };
}

module.exports = { authenticate, authenticateOptional, authorize };
