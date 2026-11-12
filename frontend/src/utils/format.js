/** Pemformat tampilan — dipusatkan agar format angka dan tanggal konsisten. */

/** Format rupiah tanpa desimal; tarif dan total selalu bilangan bulat di sistem. */
export function rupiah(nilai) {
  const angka = Number(nilai) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

/** Format tanggal Indonesia dari string 'YYYY-MM-DD' atau objek Date. */
export function tanggal(nilai) {
  if (!nilai) return '-';

  // String 'YYYY-MM-DD' diurai sebagai UTC oleh Date. Menambahkan waktu tengah
  // hari mencegah tanggal bergeser satu hari pada zona waktu di barat UTC.
  const objek = typeof nilai === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nilai)
    ? new Date(`${nilai}T12:00:00`)
    : new Date(nilai);

  if (Number.isNaN(objek.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(objek);
}

/** Format tanggal dan jam. */
export function tanggalJam(nilai) {
  if (!nilai) return '-';
  const objek = new Date(nilai);
  if (Number.isNaN(objek.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(objek);
}

/**
 * Label status pesanan dalam bahasa Indonesia.
 * Kunci HARUS sama persis dengan enum Order.status di basis data.
 * Status yang tidak dikenal ditampilkan apa adanya agar tidak menyembunyikan bug.
 */
const LABEL_STATUS = {
  MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
  DIBAYAR: 'Dibayar',
  DISIAPKAN: 'Disiapkan',
  SEDANG_DISEWA: 'Sedang Disewa',
  DIKEMBALIKAN: 'Dikembalikan',
  SELESAI: 'Selesai',
  GAGAL_KEDALUWARSA: 'Gagal — Kedaluwarsa',
  DIBATALKAN: 'Dibatalkan',
};

export function labelStatus(status) {
  return LABEL_STATUS[status] || status || '-';
}

/** Kelas CSS untuk lencana status — memetakan status ke warna. */
export function kelasStatus(status) {
  const peta = {
    MENUNGGU_PEMBAYARAN: 'lencana-status menunggu',
    DIBAYAR: 'lencana-status dibayar',
    DISIAPKAN: 'lencana-status disiapkan',
    SEDANG_DISEWA: 'lencana-status disewa',
    DIKEMBALIKAN: 'lencana-status dikembalikan',
    SELESAI: 'lencana-status selesai',
    GAGAL_KEDALUWARSA: 'lencana-status gagal',
    DIBATALKAN: 'lencana-status batal',
  };
  return peta[status] || 'lencana-status';
}

/** Tanggal hari ini sebagai 'YYYY-MM-DD' menurut waktu lokal, untuk atribut min. */
export function hariIniIso() {
  const sekarang = new Date();
  const geser = new Date(sekarang.getTime() - sekarang.getTimezoneOffset() * 60000);
  return geser.toISOString().slice(0, 10);
}

/** Jumlah hari sewa; tanggal selesai inklusif (FR-013). */
export function durasiHari(mulai, selesai) {
  if (!mulai || !selesai) return 0;
  const a = new Date(`${mulai}T12:00:00`);
  const b = new Date(`${selesai}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;

  const selisihMs = b - a;
  if (selisihMs < 0) return 0;
  return Math.floor(selisihMs / 86400000) + 1;
}

/** Detik → teks hitung mundur 'HH:MM:SS'. */
export function hitungMundur(detikTersisa) {
  if (detikTersisa <= 0) return '00:00:00';
  const jam = Math.floor(detikTersisa / 3600);
  const menit = Math.floor((detikTersisa % 3600) / 60);
  const detik = Math.floor(detikTersisa % 60);
  return [jam, menit, detik].map((n) => String(n).padStart(2, '0')).join(':');
}
