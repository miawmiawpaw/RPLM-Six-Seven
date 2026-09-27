const express = require('express');
const { z } = require('zod');
const multer = require('multer');

const service = require('./media.service');
const { asyncHandler } = require('../../utils/helpers');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { PERAN } = require('../../constants');

const router = express.Router();

/** Hanya ADMIN yang mengelola media alat. */
router.use(authenticate, authorize(PERAN.ADMIN));

/**
 * Multer disimpan di MEMORI, bukan di disk.
 *
 * Alasan: berkas langsung diteruskan ke object storage (ADR-13). Menulis ke disk
 * lokal hanya menambah langkah yang harus dibersihkan, dan pada sebagian besar
 * penyedia PaaS disk bersifat sementara sehingga berkas akan hilang saat restart.
 * Batas 50 MB mengikuti jenis berkas terbesar yang diizinkan (MP4).
 */
const unggah = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
});

const skemaMedia = z.object({
  url: z.string({ required_error: 'URL media wajib diisi.' }).url('URL media tidak valid.').max(500),
  tipe: z.enum(['FOTO', 'VIDEO'], { errorMap: () => ({ message: 'Tipe media harus FOTO atau VIDEO.' }) }),
});

const skemaUrutan = z.object({
  urutan: z.array(z.coerce.number().int().positive()).min(1, 'Urutan tidak boleh kosong.'),
});

/**
 * POST /api/media/upload — unggah berkas ke object storage.
 *
 * [TERBUKA] Penyedia object storage belum ditetapkan. Endpoint ini memvalidasi
 * berkas (tipe, ukuran, dan tanda tangan/magic bytes) lalu mengembalikan error
 * yang jelas bahwa penyimpanan belum dikonfigurasi. Rute ini SENGAJA tidak
 * menyimpan berkas ke disk sebagai jalan pintas — itu akan menyesatkan pemanggil
 * karena berkasnya hilang saat proses dimulai ulang.
 */
router.post(
  '/upload',
  unggah.single('berkas'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        code: 'BERKAS_TIDAK_DITEMUKAN',
        message: 'Tidak ada berkas yang dikirim pada field "berkas".',
      });
    }

    // Validasi metadata (tipe & ukuran) lalu isi berkas (tersangka palsu tipe).
    service.validasiMetadataBerkas(req.file);
    service.periksaTandaTangan(req.file.buffer, req.file.mimetype);

    return res.status(501).json({
      status: 'error',
      code: 'PENYIMPANAN_BELUM_DIKONFIGURASI',
      message:
        'Berkas lolos validasi, tetapi penyedia object storage belum ditetapkan (ADR-13, [TERBUKA]). ' +
        'Isi STORAGE_PUBLIC_BASE_URL pada .env, lalu tambahkan fungsi unggah pada media.service.js.',
      data: {
        nama_berkas_disarankan: service.buatNamaBerkas(req.file),
        tipe: req.file.mimetype,
        ukuran_byte: req.file.size,
      },
    });
  })
);

/** POST /api/media/item/:itemId — daftarkan media yang sudah diunggah (REQ-4.3.9) */
router.post(
  '/item/:itemId',
  validate(skemaMedia),
  asyncHandler(async (req, res) => {
    const media = await service.tambahMedia({
      itemId: req.params.itemId,
      url: req.body.url,
      tipe: req.body.tipe,
      aktorId: req.user.id,
    });
    res.status(201).json({ status: 'sukses', message: 'Media ditambahkan.', data: { media } });
  })
);

/** GET /api/media/item/:itemId */
router.get(
  '/item/:itemId',
  asyncHandler(async (req, res) => {
    const data = await service.daftarMedia(req.params.itemId);
    res.json({ status: 'sukses', data });
  })
);

/** PUT /api/media/item/:itemId/order */
router.put(
  '/item/:itemId/order',
  validate(skemaUrutan),
  asyncHandler(async (req, res) => {
    await service.ubahUrutan({
      itemId: req.params.itemId,
      urutanBaru: req.body.urutan,
      aktorId: req.user.id,
    });
    res.json({ status: 'sukses', message: 'Urutan media disimpan.' });
  })
);

/** DELETE /api/media/:mediaId */
router.delete(
  '/:mediaId',
  asyncHandler(async (req, res) => {
    const hasil = await service.hapusMedia({ mediaId: req.params.mediaId, aktorId: req.user.id });
    res.json({ status: 'sukses', message: 'Media dihapus.', data: hasil });
  })
);

module.exports = router;
