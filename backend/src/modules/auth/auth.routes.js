const service = require('./auth.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const skema = require('./auth.schema');

/**
 * Rute autentikasi — REQ-4.1.
 *
 * Controller hanya menangani HTTP: terima input, panggil service, kirim respons.
 * Tidak ada logika bisnis di berkas ini (ADR-01).
 */

const express = require('express');
const router = express.Router();

/** POST /api/auth/register — REQ-4.1.1 */
router.post(
  '/register',
  validate(skema.skemaDaftar),
  asyncHandler(async (req, res) => {
    const hasil = await service.daftar(req.body);
    res.status(201).json({
      status: 'sukses',
      message: 'Registrasi berhasil. Silakan verifikasi email Anda.',
      data: hasil,
    });
  })
);

/** POST /api/auth/verify-email — REQ-4.1.2 */
router.post(
  '/verify-email',
  validate(skema.skemaVerifikasiEmail),
  asyncHandler(async (req, res) => {
    const hasil = await service.verifikasiEmail(req.body.token);
    res.json({
      status: 'sukses',
      message: hasil.sudahVerifikasi ? 'Akun sudah terverifikasi.' : 'Email berhasil diverifikasi.',
      data: hasil,
    });
  })
);

/** POST /api/auth/login — REQ-4.1.3 */
router.post(
  '/login',
  validate(skema.skemaMasuk),
  asyncHandler(async (req, res) => {
    const hasil = await service.masuk(req.body, req.ip);
    res.json({ status: 'sukses', message: 'Berhasil masuk.', data: hasil });
  })
);

/** POST /api/auth/refresh — perbarui token akses */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const hasil = await service.perbaruiToken(refreshToken);
    res.json({ status: 'sukses', data: hasil });
  })
);

/** POST /api/auth/logout — klien membuang token */
router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    // Catatan: token belum dicabut di sisi server. Lihat §6.2 architecture.md —
    // pencabutan refresh token masih celah yang belum ditutup.
    res.json({ status: 'sukses', message: 'Berhasil keluar.' });
  })
);

/** POST /api/auth/forgot-password — REQ-4.1.4 */
router.post(
  '/forgot-password',
  validate(skema.skemaLupaKataSandi),
  asyncHandler(async (req, res) => {
    const hasil = await service.lupaKataSandi(req.body.email);
    res.json({
      status: 'sukses',
      message: 'Bila email terdaftar, tautan reset telah dikirim.',
      data: hasil,
    });
  })
);

/** POST /api/auth/reset-password — REQ-4.1.4 */
router.post(
  '/reset-password',
  validate(skema.skemaAturUlangKataSandi),
  asyncHandler(async (req, res) => {
    await service.aturUlangKataSandi(req.body);
    res.json({ status: 'sukses', message: 'Kata sandi berhasil diperbarui.' });
  })
);

/** GET /api/auth/me — profil pengguna yang sedang masuk */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const pengguna = await service.ambilProfil(req.user.id);
    res.json({ status: 'sukses', data: { pengguna } });
  })
);

/** PATCH /api/auth/me — perbarui profil */
router.patch(
  '/me',
  authenticate,
  validate(skema.skemaPerbaruiProfil),
  asyncHandler(async (req, res) => {
    const pengguna = await service.perbaruiProfil(req.user.id, req.body);
    res.json({ status: 'sukses', message: 'Profil berhasil diperbarui.', data: { pengguna } });
  })
);

module.exports = router;
