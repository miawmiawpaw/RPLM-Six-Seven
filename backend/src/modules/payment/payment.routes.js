const express = require('express');
const { z } = require('zod');

const service = require('./payment.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

const skemaBuatPembayaran = z.object({
  order_id: z.coerce.number().int().positive('ID pesanan tidak valid.'),
});

/** POST /api/payment/create — buat transaksi pembayaran — REQ-4.4.1 */
router.post(
  '/create',
  authenticate,
  validate(skemaBuatPembayaran),
  asyncHandler(async (req, res) => {
    const hasil = await service.buatTransaksiPembayaran({
      orderId: req.body.order_id,
      userId: req.user.id,
    });
    res.status(201).json({
      status: 'sukses',
      message: 'Transaksi pembayaran dibuat.',
      data: hasil,
    });
  })
);

/** GET /api/payment/status/:orderId — status pembayaran terakhir sebuah pesanan */
router.get(
  '/status/:orderId',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = require('../../config/database');
    const orderService = require('../order/order.service');

    // Periksa kepemilikan lebih dulu (BR-024) sebelum mengembalikan data pembayaran.
    const pesanan = await orderService.ambilPesanan(req.params.orderId, req.user.id);

    const pembayaran = await db('Payment')
      .where({ order_id: pesanan.order_id })
      .orderBy('waktu', 'desc')
      .first();

    res.json({
      status: 'sukses',
      data: {
        status_pesanan: pesanan.status,
        total_akhir: pesanan.total_akhir,
        pembayaran: pembayaran
          ? {
              payment_id: String(pembayaran.payment_id),
              metode: pembayaran.metode,
              status: pembayaran.status,
              nominal: Number(pembayaran.nominal),
              waktu: pembayaran.waktu,
            }
          : null,
      },
    });
  })
);

module.exports = router;
