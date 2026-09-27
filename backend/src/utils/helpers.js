/**
 * Pembungkus handler async.
 *
 * Express 4 tidak meneruskan galat dari fungsi async ke error handler secara otomatis.
 * Tanpa pembungkus ini, satu promise yang ditolak akan menggantung permintaan sampai
 * timeout alih-alih menghasilkan respons galat.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} fn
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Format tanggal ke 'YYYY-MM-DD' di zona waktu UTC+7 (SRS §2.5).
 * @param {Date|string} value
 * @returns {string}
 */
function formatTanggal(value) {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Hitung selisih hari kalender antara dua tanggal.
 * Dipakai Penghitungan denda keterlambatan — REQ-4.7.1.
 * @param {string|Date} mulai
 * @param {string|Date} selesai
 * @returns {number} jumlah hari, minimal 0
 */
function selisihHari(mulai, selesai) {
  const a = new Date(`${formatTanggal(mulai)}T00:00:00+07:00`);
  const b = new Date(`${formatTanggal(selesai)}T00:00:00+07:00`);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * Bulatkan nilai uang ke rupiah penuh.
 * @param {number} value
 * @returns {number}
 */
function bulatkanRupiah(value) {
  return Math.round(Number(value) || 0);
}

/**
 * Bangun nomor pesanan yang dapat dibaca manusia dan unik.
 * Format: RAC-YYYYMMDD-XXXXXX
 * @returns {string}
 */
function buatKodePesanan() {
  const tanggal = formatTanggal(new Date()).replace(/-/g, '');
  const acak = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `RAC-${tanggal}-${acak}`;
}

module.exports = {
  asyncHandler,
  formatTanggal,
  selisihHari,
  bulatkanRupiah,
  buatKodePesanan,
};
