/**
 * Konstanta status — mitigasi utama ADR-09 (JavaScript tanpa tipe statis).
 *
 * ATURAN KERAS: jangan pernah menulis string status sebagai literal di kode mana pun.
 * Selalu impor dari berkas ini. Alasannya: "DIBAYAR" dan "DlBAYAR" sama-sama string
 * yang valid di JavaScript, dan perbedaannya hanya ketahuan saat runtime — biasanya
 * oleh pelanggan yang tidak bisa lanjut dari halaman pembayaran.
 *
 * Semua objek dibekukan (frozen) agar tidak dapat dimutasi saat runtime.
 */

/** SRS §2.8 — 8 status pesanan. */
const STATUS_PESANAN = Object.freeze({
  MENUNGGU_PEMBAYARAN: 'MENUNGGU_PEMBAYARAN',
  DIBAYAR: 'DIBAYAR',
  DISIAPKAN: 'DISIAPKAN',
  SEDANG_DISEWA: 'SEDANG_DISEWA',
  DIKEMBALIKAN: 'DIKEMBALIKAN',
  SELESAI: 'SELESAI',
  GAGAL_KEDALUWARSA: 'GAGAL_KEDALUWARSA',
  DIBATALKAN: 'DIBATALKAN',
});

/**
 * SRS §2.8 — transisi yang sah. Dipakai service layer untuk menolak transisi ilegal.
 * Penegakan ada di service, BUKAN di UI (ADR-08).
 */
const TRANSISI_PESANAN_SAH = Object.freeze({
  [STATUS_PESANAN.MENUNGGU_PEMBAYARAN]: [STATUS_PESANAN.DIBAYAR, STATUS_PESANAN.GAGAL_KEDALUWARSA, STATUS_PESANAN.DIBATALKAN],
  [STATUS_PESANAN.DIBAYAR]: [STATUS_PESANAN.DISIAPKAN, STATUS_PESANAN.DIBATALKAN],
  [STATUS_PESANAN.DISIAPKAN]: [STATUS_PESANAN.SEDANG_DISEWA, STATUS_PESANAN.DIBATALKAN],
  [STATUS_PESANAN.SEDANG_DISEWA]: [STATUS_PESANAN.DIKEMBALIKAN],
  [STATUS_PESANAN.DIKEMBALIKAN]: [STATUS_PESANAN.SELESAI],
  [STATUS_PESANAN.SELESAI]: [],
  [STATUS_PESANAN.GAGAL_KEDALUWARSA]: [],
  [STATUS_PESANAN.DIBATALKAN]: [],
});

/**
 * Status pesanan yang mengikat stok (menahan reservasi).
 * Dipakai Availability Engine — REQ-4.2.5.
 */
const STATUS_PESANAN_AKTIF = Object.freeze([
  STATUS_PESANAN.MENUNGGU_PEMBAYARAN,
  STATUS_PESANAN.DIBAYAR,
  STATUS_PESANAN.DISIAPKAN,
  STATUS_PESANAN.SEDANG_DISEWA,
]);

/** REQ-4.4.3 — pesanan batal otomatis setelah 1x24 jam. */
const BATAS_PEMBAYARAN_JAM = 24;

/** Kondisi fisik alat. */
const KONDISI_ALAT = Object.freeze({
  BAIK: 'BAIK',
  RUSAK_RINGAN: 'RUSAK_RINGAN',
  RUSAK_BERAT: 'RUSAK_BERAT',
  HILANG: 'HILANG',
});

/** Kondisi dalam checklist serah-terima / pengembalian. */
const KONDISI_CHECKLIST = Object.freeze({
  BAIK: 'BAIK',
  RUSAK: 'RUSAK',
  HILANG: 'HILANG',
  TIDAK_LENGKAP: 'TIDAK_LENGKAP',
});

/** Peran pengguna — SRS §2.3. */
const PERAN = Object.freeze({
  PELANGGAN: 'PELANGGAN',
  ADMIN: 'ADMIN',
  PETUGAS: 'PETUGAS',
});

/** Status pembayaran. */
const STATUS_PEMBAYARAN = Object.freeze({
  MENUNGGU: 'MENUNGGU',
  BERHASIL: 'BERHASIL',
  GAGAL: 'GAGAL',
  KEDALUWARSA: 'KEDALUWARSA',
});

/** Status pelunasan tambahan (denda/biaya ganti rugi) — REQ-4.7.3. */
const STATUS_PELUNASAN = Object.freeze({
  BELUM_LUNAS: 'BELUM_LUNAS',
  LUNAS: 'LUNAS',
});

/** Jenis transaksi tambahan di luar sewa. */
const JENIS_BIAYA = Object.freeze({
  SEWA: 'SEWA',
  DENDA: 'DENDA',
  GANTI_RUGI: 'GANTI_RUGI',
});

/** Status berlaku umum untuk alat dalam pesanan. */
const STATUS_ITEM_PESANAN = Object.freeze({
  TERKUNCI: 'TERKUNCI',
  DISERAHKAN: 'DISERAHKAN',
  DIKEMBALIKAN: 'DIKEMBALIKAN',
});

/** Status percobaan pembayaran. */
const STATUS_PEROBAYAAN = Object.freeze({
  PENDING: 'PENDING',
  SETTLEMENT: 'SETTLEMENT',
  DENY: 'DENY',
  CANCEL: 'CANCEL',
  EXPIRE: 'EXPIRE',
  REFUND: 'REFUND',
});

module.exports = {
  STATUS_PESANAN,
  TRANSISI_PESANAN_SAH,
  STATUS_PESANAN_AKTIF,
  BATAS_PEMBAYARAN_JAM,
  KONDISI_ALAT,
  KONDISI_CHECKLIST,
  PERAN,
  STATUS_PEMBAYARAN,
  STATUS_PELUNASAN,
  JENIS_BIAYA,
  STATUS_ITEM_PESANAN,
  STATUS_PEROBAYAAN,
};
