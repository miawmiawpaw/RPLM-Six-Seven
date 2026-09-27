/**
 * Kelas galat aplikasi.
 *
 * Controller tidak boleh menyusun pesan galat sendiri-sendiri — bentuk respons galat
 * harus seragam agar frontend dapat menanganinya secara konsisten.
 */

class AppError extends Error {
  /**
   * @param {string} message pesan yang aman ditampilkan ke pengguna
   * @param {number} statusCode kode HTTP
   * @param {string} [code] kode galat mesin, mis. VALIDASI_GAGAL
   * @param {unknown} [details] rincian tambahan, mis. daftar field tidak valid
   */
  constructor(message, statusCode = 500, code = 'GALAT_INTERNAL', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — input tidak valid. */
class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDASI_GAGAL', details);
    this.name = 'ValidationError';
  }
}

/** 401 — belum terautentikasi. */
class UnauthorizedError extends AppError {
  constructor(message = 'Anda belum masuk atau sesi telah berakhir.') {
    super(message, 401, 'TIDAK_TERAUTENTIKASI');
    this.name = 'UnauthorizedError';
  }
}

/** 403 — terautentikasi tetapi tidak berwenang (RBAC). */
class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki akses untuk tindakan ini.') {
    super(message, 403, 'AKSES_DITOLAK');
    this.name = 'ForbiddenError';
  }
}

/** 404 — sumber daya tidak ditemukan. */
class NotFoundError extends AppError {
  constructor(message = 'Data yang diminta tidak ditemukan.') {
    super(message, 404, 'TIDAK_DITEMUKAN');
    this.name = 'NotFoundError';
  }
}

/** 409 — konflik state, mis. transisi status ilegal atau stok tidak cukup. */
class ConflictError extends AppError {
  constructor(message, code = 'KONFLIK') {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

/**
 * 409 — stok tidak mencukupi.
 * Dipakai Availability Engine; dipisahkan agar frontend dapat menampilkan
 * pesan yang spesifik beserta sisa stok.
 */
class StockUnavailableError extends ConflictError {
  constructor(message = 'Stok alat tidak mencukupi untuk tanggal yang dipilih.', details) {
    super(message, 'STOK_TIDAK_CUKUP');
    this.name = 'StockUnavailableError';
    this.details = details;
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  StockUnavailableError,
};
