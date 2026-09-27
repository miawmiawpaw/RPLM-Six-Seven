const express = require('express');
const { z } = require('zod');

const service = require('./report.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { PERAN } = require('../../constants');

const router = express.Router();

/** Seluruh laporan hanya untuk ADMIN (SRS §5.5). */
router.use(authenticate, authorize(PERAN.ADMIN));

const skemaPeriode = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
});

/** GET /api/reports/dashboard — REQ-4.6.5 */
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const data = await service.ringkasanDashboard();
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/reports/orders — REQ-4.6.4 */
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const hasil = await service.daftarSemuaPesanan({
      status: req.query.status || undefined,
      dari: req.query.dari,
      sampai: req.query.sampai,
      halaman: Number(req.query.halaman || 1),
      batas: Math.min(Number(req.query.batas || 20), 100),
    });
    res.json({ status: 'sukses', ...hasil });
  })
);

/** GET /api/reports/rentals — REQ-4.6.1 */
router.get(
  '/rentals',
  validate(skemaPeriode, 'query'),
  asyncHandler(async (req, res) => {
    const data = await service.laporanPenyewaan(req.query);
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/reports/utilization — REQ-4.6.2 */
router.get(
  '/utilization',
  validate(skemaPeriode, 'query'),
  asyncHandler(async (req, res) => {
    const data = await service.laporanPemanfaatan(req.query);
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/reports/revenue — REQ-4.6.3 */
router.get(
  '/revenue',
  validate(skemaPeriode, 'query'),
  asyncHandler(async (req, res) => {
    const data = await service.laporanPendapatan(req.query);
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/reports/export — unduh CSV */
router.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { dari, sampai } = req.query;
    const jenis = req.query.jenis === 'pemanfaatan' ? 'pemanfaatan' : 'penyewaan';

    const csv = await service.eksporCsv({ jenis, dari, sampai });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${jenis}-${dari}-${sampai}.csv"`);
    // BOM agar Excel membaca UTF-8 dengan benar.
    res.send(`\uFEFF${csv}`);
  })
);

module.exports = router;
