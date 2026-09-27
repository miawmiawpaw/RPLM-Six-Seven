const { ValidationError } = require('../utils/errors');

/**
 * Validasi payload memakai skema zod.
 *
 * ADR-09: karena tidak ada pemeriksaan tipe statis, validasi runtime di batas API
 * adalah jaring pengaman utama. Setiap payload masuk WAJIB melewati validator ini
 * sebelum menyentuh service.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} sumber
 */
function validate(schema, sumber = 'body') {
  return function (req, _res, next) {
    const hasil = schema.safeParse(req[sumber]);

    if (!hasil.success) {
      const details = hasil.error.issues.map((issue) => ({
        field: issue.path.join('.') || sumber,
        pesan: issue.message,
      }));
      return next(new ValidationError('Data yang dikirim tidak valid.', details));
    }

    // Ganti dengan hasil yang sudah di-parse agar tipe hasil transformasi (mis. angka) terpakai.
    req[sumber] = hasil.data;
    return next();
  };
}

module.exports = { validate };
