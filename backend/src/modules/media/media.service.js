const crypto = require('crypto');
const path = require('path');
const db = require('../../config/database');
const config = require('../../config');
const { NotFoundError, ConflictError, ValidationError } = require('../../utils/errors');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');

/**
 * Modul media — ADR-13 (object storage kompatibel S3).
 *
 * FOTO ALAT TIDAK DISIMPAN DI DATABASE dan tidak ditulis ke disk server.
 * Alasannya:
 *   - Berkas biner di MySQL membengkakkan backup harian (NFR-013).
 *   - Disk server tidak persisten pada sebagian besar penyedia PaaS.
 * Karena itu basis data hanya menyimpan URL, dan berkasnya ada di object storage.
 *
 * [TERBUKA] Penyedia object storage belum ditetapkan (OQ arsitektur). Antarmuka
 * di bawah sengaja dibuat netral: ia menerima URL yang sudah diunggah. Bila kelak
 * beralih ke unggah langsung dari server, tambahkan fungsi `unggahKeStorage` di sini
 * tanpa mengubah lapisan rute.
 */

/** Jenis berkas yang diterima dan ukuran maksimumnya. */
const TIPE_DIIZINKAN = Object.freeze({
  'image/jpeg': { ekstensi: '.jpg', maksByte: 5 * 1024 * 1024 },
  'image/png': { ekstensi: '.png', maksByte: 5 * 1024 * 1024 },
  'image/webp': { ekstensi: '.webp', maksByte: 5 * 1024 * 1024 },
  'video/mp4': { ekstensi: '.mp4', maksByte: 50 * 1024 * 1024 },
});

/**
 * Periksa metadata berkas SEBELUM diunggah.
 *
 * CATATAN KEAMANAN: memeriksa `mimetype` dari klien saja TIDAK cukup — nilainya
 * dapat dipalsukan. Pemeriksaan tanda tangan berkas (magic bytes) dilakukan di
 * fungsi `periksaTandaTangan`. Keduanya harus lulus.
 *
 * @param {object} berkas objek mirip multer: { mimetype, size, originalname }
 */
function validasiMetadataBerkas(berkas) {
  const aturan = TIPE_DIIZINKAN[berkas.mimetype];
  if (!aturan) {
    throw new ValidationError(
      `Jenis berkas "${berkas.mimetype}" tidak diizinkan. Gunakan JPEG, PNG, WebP, atau MP4.`,
      'TIPE_BERKAS_TIDAK_DIIZINKAN'
    );
  }
  if (berkas.size > aturan.maksByte) {
    throw new ValidationError(
      `Ukuran berkas melebihi batas ${Math.round(aturan.maksByte / 1048576)} MB.`,
      'BERKAS_TERLALU_BESAR'
    );
  }
  return aturan;
}

/**
 * Periksa tanda tangan berkas (magic bytes) untuk memastikan isi sesuai klaim tipe.
 * @param {Buffer} buffer
 * @param {string} mimetype
 */
function periksaTandaTangan(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new ValidationError('Berkas tidak dapat dibaca.', 'BERKAS_INVALID');
  }

  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase();

  const tandaTangan = {
    'image/jpeg': () => hex.startsWith('ffd8ff'),
    'image/png': () => hex.startsWith('89504e470d0a1a0a'),
    // WebP: "RIFF" .... "WEBP"
    'image/webp': () => hex.startsWith('52494646') && hex.substring(16, 24) === '57454250',
    // MP4: kotak "ftyp" pada byte 4–8
    'video/mp4': () => hex.substring(8, 16) === '66747970',
  };

  const pemeriksa = tandaTangan[mimetype];
  if (!pemeriksa || !pemeriksa()) {
    throw new ValidationError(
      'Isi berkas tidak sesuai dengan jenis yang dinyatakan. Berkas ditolak.',
      'TANDA_TANGAN_BERKAS_TIDAK_COCOK'
    );
  }
  return true;
}

/** Bangun nama berkas yang tidak dapat ditebak dan tidak dapat menimpa berkas lain. */
function buatNamaBerkas(berkas) {
  const aturan = validasiMetadataBerkas(berkas);
  const acak = crypto.randomBytes(16).toString('hex');
  const stempel = Date.now();
  // Nama asli TIDAK dipakai — ia dapat mengandung "../" atau karakter shell.
  return `item-${stempel}-${acak}${aturan.ekstensi}`;
}

/**
 * Tambahkan media ke sebuah alat — REQ-4.3.9.
 *
 * @param {object} params
 * @param {number|string} params.itemId
 * @param {string} params.url URL publik hasil unggahan
 * @param {string} params.tipe 'FOTO' atau 'VIDEO'
 * @param {number|string} params.aktorId
 */
async function tambahMedia({ itemId, url, tipe, aktorId }) {
  return db.transaction(async (trx) => {
    const item = await trx('Item').where({ item_id: itemId }).first();
    if (!item) throw new NotFoundError('Alat tidak ditemukan.');

    // Batasi jumlah media per alat agar halaman katalog tidak berat.
    const [jumlah] = await trx('ItemMedia').where({ item_id: itemId }).count({ n: 'media_id' });
    if (Number(jumlah.n) >= 10) {
      throw new ConflictError('Satu alat maksimal memiliki 10 berkas media.', 'MEDIA_PENUH');
    }

    const [urutan] = await trx('ItemMedia').where({ item_id: itemId }).max({ n: 'urutan' });
    const urutanBaru = (Number(urutan.n) || 0) + 1;

    const [mediaId] = await trx('ItemMedia').insert({ item_id: itemId, tipe, url, urutan: urutanBaru });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.MEDIA_TAMBAH,
      entity: 'ItemMedia',
      entityId: mediaId,
      aktorId,
      sesudah: { item_id: itemId, tipe, url },
    });

    return { media_id: String(mediaId), item_id: String(itemId), tipe, url, urutan: urutanBaru };
  });
}

/** Hapus media — REQ-4.3.9. */
async function hapusMedia({ mediaId, aktorId }) {
  return db.transaction(async (trx) => {
    const media = await trx('ItemMedia').where({ media_id: mediaId }).first();
    if (!media) throw new NotFoundError('Media tidak ditemukan.');

    await trx('ItemMedia').where({ media_id: mediaId }).del();

    // Rapatkan urutan agar tidak berlubang.
    const sisa = await trx('ItemMedia').where({ item_id: media.item_id }).orderBy('urutan');
    for (let i = 0; i < sisa.length; i += 1) {
      if (sisa[i].urutan !== i + 1) {
        await trx('ItemMedia').where({ media_id: sisa[i].media_id }).update({ urutan: i + 1 });
      }
    }

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.MEDIA_HAPUS,
      entity: 'ItemMedia',
      entityId: mediaId,
      aktorId,
      sebelum: { url: media.url, item_id: media.item_id },
      keterangan: 'Catatan: berkas di object storage belum dihapus oleh fungsi ini.',
    });

    return { terhapus: true, media_id: String(mediaId) };
  });
}

/** Ubah urutan media — REQ-4.3.9. */
async function ubahUrutan({ itemId, urutanBaru, aktorId }) {
  return db.transaction(async (trx) => {
    const daftar = await trx('ItemMedia').where({ item_id: itemId }).orderBy('urutan');
    const peta = new Map(daftar.map((m) => [String(m.media_id), m]));

    for (const m of daftar) {
      if (!peta.has(String(m.media_id))) throw new NotFoundError(`Media ${m.media_id} tidak ditemukan.`);
    }

    for (let i = 0; i < urutanBaru.length; i += 1) {
      const id = String(urutanBaru[i]);
      if (!peta.has(id)) {
        throw new ValidationError(`Media dengan id ${id} bukan milik alat ini.`, 'MEDIA_BUKAN_MILIK_ALAT');
      }
      await trx('ItemMedia').where({ media_id: id }).update({ urutan: i + 1 });
    }

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.MEDIA_URUTAN,
      entity: 'Item',
      entityId: itemId,
      aktorId,
      sesudah: { urutan: urutanBaru },
    });

    return { berhasil: true };
  });
}

/** Daftar media sebuah alat. */
async function daftarMedia(itemId, trx = db) {
  const baris = await trx('ItemMedia').where({ item_id: itemId }).orderBy('urutan');
  return baris.map((m) => ({
    media_id: String(m.media_id),
    tipe: m.tipe,
    url: m.url,
    urutan: m.urutan,
  }));
}

/**
 * Bangun URL publik untuk berkas yang diunggah.
 *
 * [TERBUKA] Menunggu penetapan penyedia object storage. Fungsi ini mengasumsikan
 * penyedia kompatibel S3 dengan bucket publik dan CDN di depannya. Ganti isi fungsi
 * ini saja bila penyedia berubah.
 */
function bangunUrlPublik(namaBerkas) {
  const basis = String(config.storage.publicBaseUrl || '').replace(/\/+$/, '');
  if (!basis) {
    throw new Error('STORAGE_PUBLIC_BASE_URL belum dikonfigurasi pada .env');
  }
  return `${basis}/${path.posix.join(String(config.storage.prefix || 'alat'), namaBerkas)}`;
}

module.exports = {
  TIPE_DIIZINKAN,
  validasiMetadataBerkas,
  periksaTandaTangan,
  buatNamaBerkas,
  bangunUrlPublik,
  tambahMedia,
  hapusMedia,
  ubahUrutan,
  daftarMedia,
};
