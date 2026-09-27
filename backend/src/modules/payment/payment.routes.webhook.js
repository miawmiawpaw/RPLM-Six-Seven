const express = require('express');
const service = require('./payment.service');
const { asyncHandler } = require('../../utils/helpers');

/**
 * Rute webhook Midtrans — REQ-4.4.2.
 *
 * ⚠ BERKAS INI SENGAJA TERPISAH dari payment.routes.js.
 *
 * Alasan: app.js mendaftarkan rute ini SEBELUM express.json(), memakai express.raw().
 * Body mentah disimpan di req.body sebagai Buffer sehingga verifikasi signature tidak
 * bergantung pada hasil parsing JSON. Bila digabung ke payment.routes.js — yang
 * didaftarkan setelah parser JSON global — body sudah menjadi objek dan body mentah
 * hilang.
 *
 * Lihat docs/architecture.md §4.2.
 */

const router = express.Router();

/** POST /api/payment/webhook — notifikasi pembayaran dari Midtrans */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Midtrans mengharapkan HTTP 200 agar tidak mengirim ulang notifikasi.
    // Karena itu galat bisnis tetap dibalas 200 dengan keterangan, KECUALI
    // signature tidak valid — dalam hal ini permintaan berasal dari pihak lain.
    try {
      const hasil = await service.tanganiNotifikasi({ rawBody: req.body, ip: req.ip });
      res.status(200).json({ status: 'sukses', data: hasil });
    } catch (err) {
      if (err.statusCode === 403) {
        // Signature tidak valid — tolak dengan jelas.
        return res.status(403).json({
          status: 'error',
          code: err.code,
          message: err.message,
        });
      }

      // Galat lain (mis. pesanan tidak ditemukan) dicatat, tetapi tetap dibalas 200
      // agar Midtrans berhenti mengirim ulang notifikasi yang tidak akan pernah berhasil.
      console.error('[WEBHOOK] Gagal memproses notifikasi:', err.message, err.details || '');
      return res.status(200).json({
        status: 'diterima',
        keterangan: err.message,
      });
    }
  })
);

module.exports = router;
