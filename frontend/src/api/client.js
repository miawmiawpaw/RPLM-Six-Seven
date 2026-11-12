/**
 * Klien HTTP — satu-satunya tempat yang menyentuh `fetch`.
 *
 * Tanggung jawab:
 *   1. Menyisipkan token akses JWT ke setiap permintaan (SRS §5.2: JWT di header)
 *   2. Menyegarkan token sekali saat menerima 401, lalu mengulang permintaan
 *   3. Menerjemahkan respons galat backend menjadi Error yang dapat dibaca UI
 *
 * Format respons backend (lihat src/utils/errors.js):
 *   sukses → { status: 'sukses', data: ... }
 *   galat  → { status: 'error', code: '...', message: '...', details?: ... }
 *
 * Saklar mode mock (lihat `VITE_USE_MOCK` di bawah): bila aktif, `panggil()`
 * dialihkan ke `src/api/mock/routerMock.js` sehingga antarmuka dapat dijalankan
 * penuh tanpa backend. Jalur `fetch` asli tidak diubah sama sekali.
 */

import { tanganiMock, eksporCsvMock } from './mock/routerMock.js';

/**
 * Mode mock — aktif secara BAKU saat pengembangan.
 *
 * Matikan dengan menambahkan baris berikut pada `.env.local`:
 *   VITE_USE_MOCK=false
 *
 * Nilai selain 'false' (termasuk tidak diset) berarti mock menyala, karena
 * tujuan fitur ini adalah agar frontend selalu bisa dijalankan sendiri.
 */
const PAKAI_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const KUNCI_TOKEN = 'rac_token_akses';
const KUNCI_REFRESH = 'rac_token_refresh';
const KUNCI_PENGGUNA = 'rac_pengguna';

export const penyimpanan = {
  ambilToken: () => localStorage.getItem(KUNCI_TOKEN),
  ambilRefresh: () => localStorage.getItem(KUNCI_REFRESH),
  ambilPengguna: () => {
    const mentah = localStorage.getItem(KUNCI_PENGGUNA);
    try {
      return mentah ? JSON.parse(mentah) : null;
    } catch {
      // Data rusak — bersihkan agar tidak menyuntik galat berulang.
      localStorage.removeItem(KUNCI_PENGGUNA);
      return null;
    }
  },
  simpan: ({ accessToken, refreshToken, pengguna }) => {
    if (accessToken) localStorage.setItem(KUNCI_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(KUNCI_REFRESH, refreshToken);
    if (pengguna) localStorage.setItem(KUNCI_PENGGUNA, JSON.stringify(pengguna));
  },
  bersihkan: () => {
    localStorage.removeItem(KUNCI_TOKEN);
    localStorage.removeItem(KUNCI_REFRESH);
    localStorage.removeItem(KUNCI_PENGGUNA);
  },
};

export class GalatApi extends Error {
  constructor(pesan, { code, status, details } = {}) {
    super(pesan);
    this.name = 'GalatApi';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Antrean tunggal untuk penyegaran token.
 *
 * Tanpa ini, sepuluh permintaan yang gagal bersamaan akan memicu sepuluh kali
 * penyegaran token — dan sembilan di antaranya memakai refresh token yang sudah
 * usang. Satu promise dibagi ke semua penunggu.
 */
let penyegaranBerjalan = null;

async function segarkanToken() {
  if (penyegaranBerjalan) return penyegaranBerjalan;

  penyegaranBerjalan = (async () => {
    const refreshToken = penyimpanan.ambilRefresh();
    if (!refreshToken) throw new GalatApi('Sesi telah berakhir.', { status: 401, code: 'TIDAK_ADA_REFRESH' });

    const respons = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!respons.ok) {
      penyimpanan.bersihkan();
      throw new GalatApi('Sesi telah berakhir. Silakan masuk kembali.', { status: 401, code: 'REFRESH_GAGAL' });
    }

    const hasil = await respons.json();
    penyimpanan.simpan({
      accessToken: hasil.data.accessToken,
      refreshToken: hasil.data.refreshToken,
      pengguna: hasil.data.pengguna,
    });
    return hasil.data.accessToken;
  })();

  try {
    return await penyegaranBerjalan;
  } finally {
    penyegaranBerjalan = null;
  }
}

/**
 * Panggil API.
 *
 * @param {string} jalur contoh '/catalog/items'
 * @param {object} [opsi]
 * @param {string} [opsi.metode] default GET
 * @param {object} [opsi.body]
 * @param {boolean} [opsi.tanpaToken] untuk endpoint publik
 * @param {boolean} [opsi._cobaLagi] penanda internal agar tidak berulang tanpa henti
 */
export async function panggil(jalur, { metode = 'GET', body, tanpaToken = false, _cobaLagi = false } = {}) {
  // Mode mock: jalur ini mengambil alih SEBELUM `fetch` disentuh. Jalur asli di
  // bawah tetap utuh sehingga mematikan mock cukup dengan satu variabel
  // lingkungan, tanpa mengubah kode.
  if (PAKAI_MOCK) {
    try {
      return await tanganiMock(jalur, { metode, body });
    } catch (err) {
      // Router mock melempar error ber-envelope; terjemahkan seperti fetch asli.
      throw new GalatApi(err.message || 'Terjadi kesalahan pada server mock.', {
        code: err.code,
        status: err.status,
        details: err.details,
      });
    }
  }

  const header = {};

  if (body !== undefined) header['Content-Type'] = 'application/json';

  if (!tanpaToken) {
    const token = penyimpanan.ambilToken();
    if (token) header.Authorization = `Bearer ${token}`;
  }

  const respons = await fetch(`/api${jalur}`, {
    method: metode,
    headers: header,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 401 sekali → coba segarkan token, lalu ulangi permintaan yang sama.
  if (respons.status === 401 && !tanpaToken && !_cobaLagi && penyimpanan.ambilRefresh()) {
    try {
      await segarkanToken();
      return await panggil(jalur, { metode, body, tanpaToken, _cobaLagi: true });
    } catch {
      penyimpanan.bersihkan();
      throw new GalatApi('Sesi telah berakhir. Silakan masuk kembali.', { status: 401, code: 'SESI_BERAKHIR' });
    }
  }

  // 204 tanpa isi — jangan paksa parse.
  if (respons.status === 204) return null;

  let hasil;
  try {
    hasil = await respons.json();
  } catch {
    throw new GalatApi('Respons server tidak dapat dibaca.', { status: respons.status });
  }

  if (!respons.ok || hasil.status === 'error') {
    throw new GalatApi(hasil.message || 'Terjadi kesalahan pada server.', {
      code: hasil.code,
      status: respons.status,
      details: hasil.details,
    });
  }

  return hasil;
}

// ─── Pembungkus per modul ────────────────────────────────────────────────────
// Tujuannya agar komponen tidak perlu menuliskan jalur mentah dan tidak salah
// menebak bentuk respons.

export const api = {
  auth: {
    daftar: (data) => panggil('/auth/register', { metode: 'POST', body: data, tanpaToken: true }),
    masuk: (data) => panggil('/auth/login', { metode: 'POST', body: data, tanpaToken: true }),
    verifikasiEmail: (token) => panggil('/auth/verify-email', { metode: 'POST', body: { token }, tanpaToken: true }),
    lupaKataSandi: (email) => panggil('/auth/forgot-password', { metode: 'POST', body: { email }, tanpaToken: true }),
    aturUlangKataSandi: (data) => panggil('/auth/reset-password', { metode: 'POST', body: data, tanpaToken: true }),
    keluar: () => panggil('/auth/logout', { metode: 'POST' }),
    saya: () => panggil('/auth/me'),
    perbaruiProfil: (data) => panggil('/auth/me', { metode: 'PATCH', body: data }),
  },

  katalog: {
    kategori: () => panggil('/catalog/categories', { tanpaToken: true }),
    alat: (kueri = {}) => panggil(`/catalog/items${kueriString(kueri)}`, { tanpaToken: true }),
    populer: () => panggil('/catalog/items/popular', { tanpaToken: true }),
    detailAlat: (id, kueri = {}) => panggil(`/catalog/items/${id}${kueriString(kueri)}`, { tanpaToken: true }),
    bundle: (kueri = {}) => panggil(`/catalog/bundles${kueriString(kueri)}`, { tanpaToken: true }),
  },

  pesanan: {
    buat: (data) => panggil('/orders', { metode: 'POST', body: data }),
    riwayat: (kueri = {}) => panggil(`/orders${kueriString(kueri)}`),
    // Dipakai halaman Keranjang sebelum checkout. Endpoint ini sudah ada di
    // backend (`GET /orders/availability/check`) tetapi pembungkusnya belum
    // pernah dibuat — tanpa baris ini halaman Keranjang gagal dengan
    // "periksaKetersediaan is not a function".
    periksaKetersediaan: (kueri = {}) => panggil(`/orders/availability/check${kueriString(kueri)}`),
    detail: (id) => panggil(`/orders/${id}`),
    batalkan: (id) => panggil(`/orders/${id}/cancel`, { metode: 'POST' }),
    tandaiSiap: (id) => panggil(`/orders/${id}/ready`, { metode: 'POST' }),
  },

  pembayaran: {
    buat: (orderId) => panggil('/payment/create', { metode: 'POST', body: { order_id: orderId } }),
    status: (orderId) => panggil(`/payment/status/${orderId}`),
  },

  inventaris: {
    alat: (kueri = {}) => panggil(`/inventory/items${kueriString(kueri)}`),
    detailAlat: (id) => panggil(`/inventory/items/${id}`),
    tambahAlat: (data) => panggil('/inventory/items', { metode: 'POST', body: data }),
    ubahAlat: (id, data) => panggil(`/inventory/items/${id}`, { metode: 'PATCH', body: data }),
    hapusAlat: (id) => panggil(`/inventory/items/${id}`, { metode: 'DELETE' }),
    ubahKondisi: (id, statusKondisi) =>
      panggil(`/inventory/items/${id}/condition`, { metode: 'PATCH', body: { status_kondisi: statusKondisi } }),
    stokMenipis: () => panggil('/inventory/items/low-stock'),
    bundle: (kueri = {}) => panggil(`/inventory/bundles${kueriString(kueri)}`),
    tambahBundle: (data) => panggil('/inventory/bundles', { metode: 'POST', body: data }),
    ubahBundle: (id, data) => panggil(`/inventory/bundles/${id}`, { metode: 'PATCH', body: data }),
  },

  serahTerima: {
    tugas: () => panggil('/handover/tasks'),
    serahkan: (orderId, data) => panggil(`/handover/${orderId}/handover`, { metode: 'POST', body: data }),
    kembalikan: (orderId, data) => panggil(`/handover/${orderId}/return`, { metode: 'POST', body: data }),
    checklist: (orderId) => panggil(`/handover/${orderId}/checklist`),
  },

  denda: {
    tarif: () => panggil('/penalty/rates'),
    simpanTarif: (data) => panggil('/penalty/rates', { metode: 'PUT', body: data }),
    ringkasan: () => panggil('/penalty/summary'),
    daftar: (kueri = {}) => panggil(`/penalty/orders${kueriString(kueri)}`),
    pesanan: (orderId) => panggil(`/penalty/order/${orderId}`),
    lunaskan: (penaltyId, catatan) =>
      panggil(`/penalty/${penaltyId}/pay`, { metode: 'PATCH', body: { catatan } }),
    selesaikan: (orderId, paksa = false) =>
      panggil(`/penalty/order/${orderId}/complete${paksa ? '?paksa=true' : ''}`, { metode: 'POST' }),
  },

  laporan: {
    dasbor: () => panggil('/reports/dashboard'),
    pesanan: (kueri = {}) => panggil(`/reports/orders${kueriString(kueri)}`),
    penyewaan: (kueri) => panggil(`/reports/rentals${kueriString(kueri)}`),
    pemanfaatan: (kueri) => panggil(`/reports/utilization${kueriString(kueri)}`),
    pendapatan: (kueri) => panggil(`/reports/revenue${kueriString(kueri)}`),
    /**
     * URL berkas CSV. Di mode produksi ini menunjuk ke endpoint backend; di mode
     * mock berkas dirakit di peramban dan diserahkan sebagai blob URL, supaya
     * halaman yang mengunduh tetap bekerja tanpa backend.
     */
    urlEkspor: (kueri) => {
      if (!PAKAI_MOCK) return `/api/reports/export${kueriString(kueri)}`;

      const csv = eksporCsvMock(kueri);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      return URL.createObjectURL(blob);
    },
  },

  media: {
    daftar: (itemId) => panggil(`/media/item/${itemId}`),
    tambah: (itemId, data) => panggil(`/media/item/${itemId}`, { metode: 'POST', body: data }),
    hapus: (mediaId) => panggil(`/media/${mediaId}`, { metode: 'DELETE' }),
    ubahUrutan: (itemId, urutan) =>
      panggil(`/media/item/${itemId}/order`, { metode: 'PUT', body: { urutan } }),
  },
};

/** Bangun string kueri, membuang nilai kosong agar URL tetap bersih. */
function kueriString(objek = {}) {
  const bagian = Object.entries(objek)
    .filter(([, nilai]) => nilai !== undefined && nilai !== null && nilai !== '')
    .map(([kunci, nilai]) => `${encodeURIComponent(kunci)}=${encodeURIComponent(nilai)}`);

  return bagian.length > 0 ? `?${bagian.join('&')}` : '';
}
