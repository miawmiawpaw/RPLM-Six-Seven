const express = require('express');
const { z } = require('zod');

const service = require('./penalty.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { PERAN } = require('../../constants');

const router = express.Router();

router.use(authenticate);

const skemaTarif = z.object({
  tipe: z.enum(['DENDA_PER_JAM', 'DENDA_PER_HARI', 'GANTI_RUGI_DEFAULT'], {
    errorMap: () => ({ message: 'Tipe tarif tidak valid.' }),
  }),
  item_id: z.coerce.number().int().positive().nullable().optional(),
  nominal: z.coerce.number().min(0, 'Nominal tidak boleh negatif.'),
});

const skemaLunas = z.object({
  catatan: z.string().trim().max(300).nullable().optional(),
});

/** GET /api/penalty/rates — REQ-4.7.3 (admin & petugas boleh melihat) */
router.get(
  '/rates',
  authorize(PERAN.ADMIN, PERAN.PETUGAS),
  asyncHandler(async (_req, res) => {
    const data = await service.daftarTarif();
    res.json({ status: 'sukses', data });
  })
);

/** PUT /api/penalty/rates — hanya ADMIN yang boleh mengubah tarif */
router.put(
  '/rates',
  authorize(PERAN.ADMIN),
  validate(skemaTarif),
  asyncHandler(async (req, res) => {
    const data = await service.simpanTarif(req.body, req.user.id);
    res.json({ status: 'sukses', message: 'Tarif denda disimpan.', data: { tarif: data } });
  })
);

/** GET /api/penalty/summary — ringkasan denda belum lunas */
router.get(
  '/summary',
  authorize(PERAN.ADMIN, PERAN.PETUGAS),
  asyncHandler(async (_req, res) => {
    const data = await service.ringkasanDenda();
    res.json({ status: 'sukses', data });
  })
);

/**
 * GET /api/penalty/order/:orderId — REQ-4.7.4.
 * Pelanggan hanya boleh melihat denda pesanannya sendiri.
 */
router.get(
  '/order/:orderId',
  asyncHandler(async (req, res) => {
    const db = require('../../config/database');
    const { ForbiddenError, NotFoundError } = require('../../utils/errors');

    const pesanan = await db('Order').where({ order_id: req.params.orderId }).first();
    if (!pesanan) throw new NotFoundError('Pesanan tidak ditemukan.');

    const staf = [PERAN.ADMIN, PERAN.PETUGAS].includes(req.user.peran);
    if (!staf && String(pesanan.user_id) !== String(req.user.id)) {
      throw new ForbiddenError('Anda tidak berhak melihat denda pesanan ini.');
    }

    const data = await service.dendaPesanan(req.params.orderId);
    const totalBelumLunas = data
      .filter((d) => d.status_pelunasan === 'BELUM_LUNAS')
      .reduce((s, d) => s + d.nominal, 0);

    res.json({ status: 'sukses', data: { denda: data, total_belum_lunas: totalBelumLunas } });
  })
);

/** PATCH /api/penalty/:penaltyId/pay — REQ-4.7.5 */
router.patch(
  '/:penaltyId/pay',
  authorize(PERAN.ADMIN, PERAN.PETUGAS),
  validate(skemaLunas),
  asyncHandler(async (req, res) => {
    const denda = await service.lunaskanDenda({
      penaltyId: req.params.penaltyId,
      aktorId: req.user.id,
      catatan: req.body.catatan,
    });
    res.json({ status: 'sukses', message: 'Denda ditandai lunas.', data: { denda } });
  })
);

/** POST /api/penalty/order/:orderId/complete — REQ-4.7.6 */
router.post(
  '/order/:orderId/complete',
  authorize(PERAN.ADMIN, PERAN.PETUGAS),
  asyncHandler(async (req, res) => {
    const paksa = req.user.peran === PERAN.ADMIN && req.query.paksa === 'true';
    const pesanan = await service.selesaikanPesanan({
      orderId: req.params.orderId,
      aktorId: req.user.id,
      paksa,
    });
    res.json({ status: 'sukses', message: 'Pesanan diselesaikan.', data: { pesanan } });
  })
);

module.exports = router;
