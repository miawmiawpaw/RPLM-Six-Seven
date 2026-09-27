const express = require('express');
const { z } = require('zod');

const service = require('./inventory.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { PERAN } = require('../../constants');

const router = express.Router();

/**
 * Seluruh rute inventaris hanya untuk ADMIN (SRS §5.5, BR-021).
 * RBAC diterapkan di level router agar tidak ada endpoint yang terlewat.
 */
router.use(authenticate, authorize(PERAN.ADMIN));

const skemaAlat = z.object({
  kode_barang: z.string().trim().min(3, 'Kode barang minimal 3 karakter.').max(30),
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(150),
  category_id: z.coerce.number().int().positive('Kategori wajib dipilih.'),
  merk: z.string().trim().max(100).nullable().optional(),
  stok_fisik: z.coerce.number().int().min(0, 'Stok tidak boleh negatif.'),
  stok_minimum: z.coerce.number().int().min(0).optional(),
  tarif_harian: z.coerce.number().positive('Tarif harian harus lebih dari 0.'),
  status_kondisi: z.enum(['TERSEDIA', 'SEDANG_DISEWA', 'RUSAK', 'HILANG']).optional(),
});

const skemaUbahAlat = skemaAlat.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'Tidak ada perubahan yang dikirim.',
});

const skemaKondisi = z.object({
  status_kondisi: z.enum(['TERSEDIA', 'SEDANG_DISEWA', 'RUSAK', 'HILANG'], {
    errorMap: () => ({ message: 'Status kondisi tidak valid.' }),
  }),
});

const skemaBundle = z.object({
  nama: z.string().trim().min(2).max(150),
  deskripsi: z.string().trim().max(500).nullable().optional(),
  harga_bundle: z.coerce.number().positive('Harga paket harus lebih dari 0.'),
  komponen: z
    .array(
      z.object({
        item_id: z.coerce.number().int().positive(),
        kuantitas: z.coerce.number().int().min(1, 'Kuantitas minimal 1.'),
      })
    )
    .min(1, 'Paket harus memiliki minimal satu komponen.'),
});

const skemaUbahBundle = z.object({
  nama: z.string().trim().min(2).max(150).optional(),
  deskripsi: z.string().trim().max(500).nullable().optional(),
  harga_bundle: z.coerce.number().positive().optional(),
  is_aktif: z.coerce.boolean().optional(),
  komponen: z
    .array(z.object({ item_id: z.coerce.number().int().positive(), kuantitas: z.coerce.number().int().min(1) }))
    .optional(),
});

// ─── Alat ────────────────────────────────────────────────────────────────────

/** GET /api/inventory/items — daftar alat */
router.get(
  '/items',
  asyncHandler(async (req, res) => {
    const hasil = await service.daftarAlat({
      kategori: req.query.kategori ? Number(req.query.kategori) : undefined,
      kataKunci: req.query.q || undefined,
      sertakanNonaktif: req.query.sertakan_nonaktif !== 'false',
      halaman: Number(req.query.halaman || 1),
      batas: Math.min(Number(req.query.batas || 20), 100),
    });
    res.json({ status: 'sukses', ...hasil });
  })
);

/** GET /api/inventory/items/low-stock — FR-027 */
router.get(
  '/items/low-stock',
  asyncHandler(async (_req, res) => {
    const data = await service.alatStokMenipis();
    res.json({ status: 'sukses', data });
  })
);

/** GET /api/inventory/items/:id */
router.get(
  '/items/:id',
  asyncHandler(async (req, res) => {
    res.json({ status: 'sukses', data: await service.ambilAlat(req.params.id) });
  })
);

/** POST /api/inventory/items — REQ-4.3.2 */
router.post(
  '/items',
  validate(skemaAlat),
  asyncHandler(async (req, res) => {
    const item = await service.tambahAlat(req.body, req.user.id);
    res.status(201).json({ status: 'sukses', message: 'Alat berhasil ditambahkan.', data: { item } });
  })
);

/** PATCH /api/inventory/items/:id — REQ-4.3.3 */
router.patch(
  '/items/:id',
  validate(skemaUbahAlat),
  asyncHandler(async (req, res) => {
    const item = await service.ubahAlat(req.params.id, req.body, req.user.id);
    res.json({ status: 'sukses', message: 'Alat berhasil diperbarui.', data: { item } });
  })
);

/** DELETE /api/inventory/items/:id — REQ-4.3.3 (soft delete, ADR-05) */
router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const hasil = await service.hapusAlat(req.params.id, req.user.id);
    res.json({
      status: 'sukses',
      message: hasil.sudahNonaktif ? 'Alat sudah nonaktif.' : 'Alat berhasil dinonaktifkan.',
      data: { item: hasil.item },
    });
  })
);

/** PATCH /api/inventory/items/:id/condition — REQ-4.3.8 */
router.patch(
  '/items/:id/condition',
  validate(skemaKondisi),
  asyncHandler(async (req, res) => {
    const item = await service.ubahKondisi({
      itemId: req.params.id,
      statusKondisi: req.body.status_kondisi,
      aktorId: req.user.id,
    });
    res.json({ status: 'sukses', message: 'Kondisi alat diperbarui.', data: { item } });
  })
);

// ─── Bundle ──────────────────────────────────────────────────────────────────

/** GET /api/inventory/bundles */
router.get(
  '/bundles',
  asyncHandler(async (req, res) => {
    const data = await service.daftarBundle({ sertakanNonaktif: req.query.sertakan_nonaktif !== 'false' });
    res.json({ status: 'sukses', data });
  })
);

/** POST /api/inventory/bundles — REQ-4.3.6 */
router.post(
  '/bundles',
  validate(skemaBundle),
  asyncHandler(async (req, res) => {
    const bundle = await service.buatBundle(req.body, req.user.id);
    res.status(201).json({ status: 'sukses', message: 'Paket berhasil dibuat.', data: { bundle } });
  })
);

/** PATCH /api/inventory/bundles/:id */
router.patch(
  '/bundles/:id',
  validate(skemaUbahBundle),
  asyncHandler(async (req, res) => {
    const bundle = await service.ubahBundle(req.params.id, req.body, req.user.id);
    res.json({ status: 'sukses', message: 'Paket berhasil diperbarui.', data: { bundle } });
  })
);

module.exports = router;
