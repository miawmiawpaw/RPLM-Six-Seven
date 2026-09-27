const express = require('express');
const { z } = require('zod');

const service = require('./handover.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { PERAN, KONDISI_ALAT } = require('../../constants');

const router = express.Router();

/** Hanya PETUGAS dan ADMIN yang menangani serah-terima (FR-039, BR-021). */
router.use(authenticate, authorize(PERAN.PETUGAS, PERAN.ADMIN));

const skemaItemChecklist = z.object({
  item_id: z.coerce.number().int().positive(),
  kuantitas: z.coerce.number().int().min(1),
  kondisi: z.enum([KONDISI_ALAT.BAIK, KONDISI_ALAT.RUSAK_RINGAN, KONDISI_ALAT.RUSAK_BERAT, KONDISI_ALAT.HILANG], {
    errorMap: () => ({ message: 'Kondisi alat tidak valid.' }),
  }),
  kelengkapan: z.coerce.boolean(),
  catatan: z.string().trim().max(300).nullable().optional(),
});

const skemaSerahTerima = z.object({
  catatan: z.string().trim().max(500).nullable().optional(),
  foto_url: z.string().url('URL foto tidak valid.').nullable().optional(),
  items: z.array(skemaItemChecklist).min(1, 'Checklist tidak boleh kosong.'),
});

const skemaPengembalian = z.object({
  waktu_kembali: z.string().datetime({ offset: true }).optional(),
  catatan: z.string().trim().max(500).nullable().optional(),
  foto_url: z.string().url('URL foto tidak valid.').nullable().optional(),
  items: z.array(skemaItemChecklist).min(1, 'Checklist tidak boleh kosong.'),
});

/** GET /api/handover/tasks — daftar tugas petugas */
router.get(
  '/tasks',
  asyncHandler(async (_req, res) => {
    const data = await service.daftarTugasPetugas();
    res.json({ status: 'sukses', data });
  })
);

/** POST /api/handover/:orderId/handover — REQ-4.5.1 */
router.post(
  '/:orderId/handover',
  validate(skemaSerahTerima),
  asyncHandler(async (req, res) => {
    const hasil = await service.catatSerahTerima({
      orderId: req.params.orderId,
      petugasId: req.user.id,
      catatan: req.body.catatan,
      fotoUrl: req.body.foto_url,
      items: req.body.items,
    });
    res.status(201).json({
      status: 'sukses',
      message: 'Serah-terima tercatat. Pesanan kini berstatus SEDANG_DISEWA.',
      data: hasil,
    });
  })
);

/** POST /api/handover/:orderId/return — REQ-4.5.2 */
router.post(
  '/:orderId/return',
  validate(skemaPengembalian),
  asyncHandler(async (req, res) => {
    const hasil = await service.catatPengembalian({
      orderId: req.params.orderId,
      petugasId: req.user.id,
      catatan: req.body.catatan,
      fotoUrl: req.body.foto_url,
      items: req.body.items,
      waktuKembali: req.body.waktu_kembali,
    });
    res.status(201).json({
      status: 'sukses',
      message:
        hasil.total_biaya_tambahan > 0
          ? `Pengembalian tercatat. Biaya tambahan Rp${hasil.total_biaya_tambahan.toLocaleString('id-ID')}.`
          : 'Pengembalian tercatat tanpa biaya tambahan.',
      data: hasil,
    });
  })
);

/** GET /api/handover/:orderId/checklist — riwayat checklist */
router.get(
  '/:orderId/checklist',
  asyncHandler(async (req, res) => {
    const data = await service.ambilChecklist(req.params.orderId);
    res.json({ status: 'sukses', data });
  })
);

module.exports = router;
