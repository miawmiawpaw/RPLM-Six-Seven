const express = require('express');
const service = require('./catalog.service');
const { asyncHandler } = require('../../utils/helpers');

/**
 * Rute katalog — dapat diakses tanpa login (tamu boleh melihat alat).
 * Lihat docs/prd-rental-alat-camping.md §14 untuk matriks izin.
 */
const router = express.Router();

/** GET /api/catalog/categories — REQ-4.2.2 */
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const data = await service.daftarKategori();
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/catalog/items — REQ-4.2.1 */
router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const hasil = await service.cariAlat({
      kataKunci: req.query.q || undefined,
      kategori: req.query.kategori ? Number(req.query.kategori) : undefined,
      halaman: Number(req.query.halaman || 1),
      batas: Math.min(Number(req.query.batas || 12), 50),
    });
    res.json({ status: 'sukses', ...hasil });
  })
);

/** GET /api/catalog/items/popular — REQ-4.6.4 */
router.get(
  '/items/popular',
  asyncHandler(async (_req, res) => {
    const data = await service.alatTerpopuler({ batas: 6 });
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/catalog/items/:id — REQ-4.2.4 */
router.get(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const item = await service.detailAlat(req.params.id, {
      mulai: req.query.mulai,
      selesai: req.query.selesai,
    });
    res.json({ status: 'sukses', data: { item } });
  })
);

/** GET /api/catalog/bundles — REQ-4.2.6 */
router.get(
  '/bundles',
  asyncHandler(async (req, res) => {
    const data = await service.daftarBundle({ mulai: req.query.mulai, selesai: req.query.selesai });
    res.json({ status: 'sukses', data });
  })
);

module.exports = router;
