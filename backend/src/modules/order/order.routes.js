const express = require('express');
const { z } = require('zod');

const service = require('./order.service');
const { asyncHandler, formatTanggal } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { ConflictError } = require('../../utils/errors');

const router = express.Router();

/** Validasi tanggal berformat YYYY-MM-DD. */
const tanggalISO = z
  .string({ required_error: 'Tanggal wajib diisi.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.');

const skemaBuatPesanan = z.object({
  tanggal_mulai: tanggalISO,
  tanggal_selesai: tanggalISO,
  catatan: z.string().max(500, 'Catatan maksimal 500 karakter.').nullable().optional(),
  items: z
    .array(
      z.object({
        tipe: z.enum(['ITEM', 'BUNDLE'], { errorMap: () => ({ message: 'Tipe harus ITEM atau BUNDLE.' }) }),
        item_id: z.coerce.number().int().positive().optional(),
        bundle_id: z.coerce.number().int().positive().optional(),
        kuantitas: z.coerce.number().int().min(1, 'Kuantitas minimal 1.'),
      })
    )
    .min(1, 'Keranjang tidak boleh kosong.'),
});

/** POST /api/orders — buat pesanan dari keranjang — REQ-4.2.7 */
router.post(
  '/',
  authenticate,
  validate(skemaBuatPesanan),
  asyncHandler(async (req, res) => {
    const { tanggal_mulai, tanggal_selesai, catatan, items } = req.body;

    // Validasi bentuk baris keranjang: setiap baris wajib punya id yang sesuai tipenya.
    for (const baris of items) {
      if (baris.tipe === 'ITEM' && !baris.item_id) {
        throw new ConflictError('Baris bertipe ITEM wajib menyertakan item_id.', 'BARIS_TIDAK_VALID');
      }
      if (baris.tipe === 'BUNDLE' && !baris.bundle_id) {
        throw new ConflictError('Baris bertipe BUNDLE wajib menyertakan bundle_id.', 'BARIS_TIDAK_VALID');
      }
    }

    const pesanan = await service.buatPesanan({
      userId: req.user.id,
      barisKeranjang: items,
      tanggalMulai: tanggal_mulai,
      tanggalSelesai: tanggal_selesai,
      catatan,
    });

    res.status(201).json({
      status: 'sukses',
      message: 'Pesanan berhasil dibuat. Selesaikan pembayaran sebelum batas waktu.',
      data: { pesanan },
    });
  })
);

/** GET /api/orders — riwayat pesanan milik pengguna — REQ-4.6.4 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const halaman = Number(req.query.halaman || 1);
    const batas = Math.min(Number(req.query.batas || 10), 50);
    const hasil = await service.riwayatPengguna(req.user.id, { halaman, batas });
    res.json({ status: 'sukses', ...hasil });
  })
);

/** GET /api/orders/:id — detail pesanan */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.peran === 'PELANGGAN' ? req.user.id : null;
    const pesanan = await service.ambilPesanan(req.params.id, userId);
    res.json({ status: 'sukses', data: { pesanan } });
  })
);

/** POST /api/orders/:id/cancel — batalkan pesanan */
router.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const pesanan = await service.batalkanPesanan({ orderId: req.params.id, userId: req.user.id });
    res.json({ status: 'sukses', message: 'Pesanan dibatalkan. Stok telah dilepaskan.', data: { pesanan } });
  })
);

/** GET /api/orders/availability/check — pratinjau ketersediaan sebelum checkout */
router.get(
  '/availability/check',
  asyncHandler(async (req, res) => {
    const availability = require('../inventory/availability.service');
    const itemIds = String(req.query.item_ids || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (itemIds.length === 0 || !req.query.mulai || !req.query.selesai) {
      return res.status(400).json({
        status: 'error',
        code: 'PARAMETER_KURANG',
        message: 'Parameter item_ids, mulai, dan selesai wajib diisi.',
      });
    }

    const hasil = await availability.hitungKetersediaan({
      itemIds,
      tanggalMulai: formatTanggal(req.query.mulai),
      tanggalSelesai: formatTanggal(req.query.selesai),
    });

    return res.json({ status: 'sukses', data: { ketersediaan: hasil } });
  })
);

module.exports = router;
