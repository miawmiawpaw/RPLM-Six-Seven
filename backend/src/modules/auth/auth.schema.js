const { z } = require('zod');

/**
 * Skema validasi — ADR-09: validasi runtime di batas API adalah jaring pengaman utama
 * karena tidak ada pemeriksaan tipe statis.
 */

/** Format nomor telepon Indonesia: 08xx atau +628xx. */
const NOMOR_TELEPON_ID = /^(\+62|62|0)8[0-9]{7,13}$/;

const daftar = z.object({
  nama: z
    .string({ required_error: 'Nama wajib diisi.' })
    .trim()
    .min(2, 'Nama minimal 2 karakter.')
    .max(100, 'Nama maksimal 100 karakter.'),
  email: z
    .string({ required_error: 'Email wajib diisi.' })
    .trim()
    .toLowerCase()
    .email('Format email tidak valid.')
    .max(150),
  nomor_telepon: z
    .string({ required_error: 'Nomor telepon wajib diisi.' })
    .trim()
    .regex(NOMOR_TELEPON_ID, 'Format nomor telepon Indonesia tidak valid (contoh: 08123456789).'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi.' })
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(72, 'Kata sandi maksimal 72 karakter.'),
});

const masuk = z.object({
  email: z.string({ required_error: 'Email wajib diisi.' }).trim().toLowerCase().email('Format email tidak valid.'),
  password: z.string({ required_error: 'Kata sandi wajib diisi.' }).min(1, 'Kata sandi wajib diisi.'),
});

const verifikasiEmail = z.object({
  token: z.string({ required_error: 'Token verifikasi wajib diisi.' }).min(10, 'Token tidak valid.'),
});

const lupaKataSandi = z.object({
  email: z.string({ required_error: 'Email wajib diisi.' }).trim().toLowerCase().email('Format email tidak valid.'),
});

const aturUlangKataSandi = z.object({
  token: z.string({ required_error: 'Token wajib diisi.' }).min(10, 'Token tidak valid.'),
  password: z
    .string({ required_error: 'Kata sandi baru wajib diisi.' })
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(72, 'Kata sandi maksimal 72 karakter.'),
});

const perbaruiProfil = z
  .object({
    nama: z.string().trim().min(2).max(100).optional(),
    nomor_telepon: z.string().trim().regex(NOMOR_TELEPON_ID, 'Format nomor telepon tidak valid.').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Tidak ada perubahan yang dikirim.',
  });

module.exports = {
  skemaDaftar: daftar,
  skemaMasuk: masuk,
  skemaVerifikasiEmail: verifikasiEmail,
  skemaLupaKataSandi: lupaKataSandi,
  skemaAturUlangKataSandi: aturUlangKataSandi,
  skemaPerbaruiProfil: perbaruiProfil,
};
