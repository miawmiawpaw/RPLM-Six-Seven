/**
 * Data dummy untuk lapisan mock frontend.
 *
 * Tujuan berkas ini: memungkinkan seluruh antarmuka dijalankan tanpa backend
 * (lihat catatan saklar di `../client.js`). Isinya SENGAJA meniru hasil seed
 * `backend/seeds/01_data_awal.js` supaya perpindahan ke backend asli tidak
 * terasa berbeda.
 *
 * Aturan yang dipegang agar setia pada kontrak backend:
 *   - ID selalu String (`item_id`, `bundle_id`, `order_id`, ...) — lihat
 *     `CartContext.buatKunci` yang membandingkan dengan `String(b.id)`.
 *   - Uang dan jumlah stok selalu Number.
 *   - Tanggal bisnis berformat 'YYYY-MM-DD'.
 *   - `tersedia` boleh `null` — artinya "belum bisa dihitung tanpa rentang
 *     tanggal" (ADR-02). Jangan pernah menggantinya dengan 0.
 *
 * Berkas ini tidak menyentuh jaringan maupun basis data. Semua akun di bawah
 * hanyalah akun demo di dalam peramban (localStorage), bukan akun nyata.
 */

// ─── Pembantu tanggal ────────────────────────────────────────────────────────

/** Geser hari ini sejumlah `n` hari (boleh negatif) → 'YYYY-MM-DD'. */
export function geserHari(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const bulan = String(d.getMonth() + 1).padStart(2, '0');
  const tanggal = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${bulan}-${tanggal}`;
}

/** Cap waktu bergaya MySQL DATETIME ('YYYY-MM-DD HH:mm:ss') pada WIB. */
export function capWaktu(n = 0, jam = 9) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(jam, 0, 0, 0);
  const p = (v) => String(v).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

/** Cap waktu dalam format ISO (dipakai `batas_pembayaran` → `new Date(...)`). */
export function isoJam(n = 0, jam = 9) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(jam, 0, 0, 0);
  return d.toISOString();
}

// ─── Gambar contoh ───────────────────────────────────────────────────────────
// Repo tidak menyimpan berkas foto alat, dan endpoint media tidak dipasang di
// backend. Karena itu gambar dibuat sendiri sebagai SVG data-URI agar antarmuka
// tetap punya visual tanpa bergantung pada unggahan.

function svgGambar(judul, warna) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">` +
    `<rect width="640" height="480" fill="${warna}"/>` +
    `<circle cx="520" cy="90" r="70" fill="rgba(255,255,255,0.18)"/>` +
    `<text x="40" y="250" font-family="system-ui, sans-serif" font-size="34" ` +
    `font-weight="700" fill="#ffffff">${judul}</text>` +
    `<text x="40" y="292" font-family="system-ui, sans-serif" font-size="20" ` +
    `fill="rgba(255,255,255,0.85)">Contoh gambar (mock)</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Bangun daftar media untuk satu alat: satu foto utama + satu tambahan. */
function mediaAlat(nama, warna, itemId) {
  return [
    { tipe: 'FOTO', url: svgGambar(nama, warna), urutan: 1 },
    { tipe: 'FOTO', url: svgGambar(`${nama} — tampak lain`, warna), urutan: 2 },
  ].map((m) => ({ ...m, media_id: `med-${itemId}-${m.urutan}` }));
}

// ─── Akun demo ───────────────────────────────────────────────────────────────
// Hanya berlaku di dalam mock. Kata sandi disimpan apa adanya karena tidak ada
// backend yang memverifikasi; ini bukan kredensial sistem nyata.

export const KATA_SANDI_DEMO = 'Demo#12345';

export const penggunaDummy = [
  {
    user_id: '1',
    nama: 'Fadlan Pelanggan',
    email: 'pelanggan@demo.test',
    nomor_telepon: '081200000001',
    role: 'PELANGGAN',
    kata_sandi: KATA_SANDI_DEMO,
    sudah_verifikasi: true,
  },
  {
    user_id: '2',
    nama: 'Bagas Petugas',
    email: 'petugas@demo.test',
    nomor_telepon: '081200000002',
    role: 'PETUGAS',
    kata_sandi: KATA_SANDI_DEMO,
    sudah_verifikasi: true,
  },
  {
    user_id: '3',
    nama: 'Sarah Admin',
    email: 'admin@demo.test',
    nomor_telepon: '081200000003',
    role: 'ADMIN',
    kata_sandi: KATA_SANDI_DEMO,
    sudah_verifikasi: true,
  },
];

/** Belangsung verifikasi bila registrasi mock tidak memverifikasi otomatis. */
export const tokenVerifikasiDummy = 'mock-token-verifikasi';
export const tokenResetDummy = 'mock-token-reset';

// ─── Kategori ────────────────────────────────────────────────────────────────
// Selaras dengan seed: Tenda, Tas / Carrier, Nesting, Alat Masak, Lampu.

export const kategoriDummy = [
  { category_id: '1', nama: 'Tenda', deskripsi: 'Tenda dome dan tenda pleton untuk segala medan.' },
  { category_id: '2', nama: 'Tas / Carrier', deskripsi: 'Carrier dan daypack untuk membawa perlengkapan.' },
  { category_id: '3', nama: 'Nesting', deskripsi: 'Peralatan tidur seperti sleeping bag dan matras.' },
  { category_id: '4', nama: 'Alat Masak', deskripsi: 'Kompor, panci, dan perlengkapan memasak lapangan.' },
  { category_id: '5', nama: 'Lampu', deskripsi: 'Lampu tenda dan senter untuk penerangan malam.' },
];

// ─── Alat ────────────────────────────────────────────────────────────────────
export const alatDummy = [
  {
    item_id: '1', kode_barang: 'TND-001', nama: 'Tenda Dome 2 Orang', merk: 'Eiger',
    category_id: '1', kategori: 'Tenda', tarif_harian: 55000, stok_fisik: 12, stok_minimum: 3,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#2f6f4f',
  },
  {
    item_id: '2', kode_barang: 'TND-002', nama: 'Tenda Dome 4 Orang', merk: 'Eiger',
    category_id: '1', kategori: 'Tenda', tarif_harian: 75000, stok_fisik: 10, stok_minimum: 2,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#2f6f4f',
  },
  {
    item_id: '3', kode_barang: 'TND-003', nama: 'Tenda Pleton 6 Orang', merk: 'Consina',
    category_id: '1', kategori: 'Tenda', tarif_harian: 120000, stok_fisik: 4, stok_minimum: 1,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#2f6f4f',
  },
  {
    item_id: '4', kode_barang: 'TAS-001', nama: 'Carrier 60L', merk: 'Deuter',
    category_id: '2', kategori: 'Tas / Carrier', tarif_harian: 60000, stok_fisik: 12, stok_minimum: 3,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#8a5a2b',
  },
  {
    item_id: '5', kode_barang: 'TAS-002', nama: 'Carrier 45L', merk: 'Consina',
    category_id: '2', kategori: 'Tas / Carrier', tarif_harian: 45000, stok_fisik: 8, stok_minimum: 2,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#8a5a2b',
  },
  {
    item_id: '6', kode_barang: 'TAS-003', nama: 'Daypack 25L', merk: 'Arei',
    category_id: '2', kategori: 'Tas / Carrier', tarif_harian: 25000, stok_fisik: 15, stok_minimum: 4,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#8a5a2b',
  },
  {
    item_id: '7', kode_barang: 'NES-001', nama: 'Sleeping Bag', merk: 'Naturehike',
    category_id: '3', kategori: 'Nesting', tarif_harian: 20000, stok_fisik: 20, stok_minimum: 5,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#4a4f8a',
  },
  {
    item_id: '8', kode_barang: 'MSK-001', nama: 'Kompor Portable', merk: 'Coleman',
    category_id: '4', kategori: 'Alat Masak', tarif_harian: 30000, stok_fisik: 9, stok_minimum: 2,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#a63d2f',
  },
  {
    item_id: '9', kode_barang: 'MSK-002', nama: 'Set Panci Camping', merk: 'Naturehike',
    category_id: '4', kategori: 'Alat Masak', tarif_harian: 25000, stok_fisik: 7, stok_minimum: 2,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#a63d2f',
  },
  {
    item_id: '10', kode_barang: 'LMP-001', nama: 'Lampu Tenda LED', merk: 'Naturehike',
    category_id: '5', kategori: 'Lampu', tarif_harian: 15000, stok_fisik: 25, stok_minimum: 6,
    status_kondisi: 'TERSEDIA', is_aktif: true, warna: '#b8860b',
  },
  {
    // Alat ini sengaja berstok menipis (di bawah minimum) agar dashboard admin
    // dan halaman inventaris benar-benar menampilkan peringatan restok. Kondisi
    // SEDANG_DISEWA membuatnya tetap "ada di peredaran" sehingga tidak muncul
    // di katalog (katalog hanya menampilkan alat TERSEDIA yang aktif).
    item_id: '11', kode_barang: 'LMP-002', nama: 'Senter Headlamp', merk: 'Black Diamond',
    category_id: '5', kategori: 'Lampu', tarif_harian: 18000, stok_fisik: 2, stok_minimum: 3,
    status_kondisi: 'SEDANG_DISEWA', is_aktif: true, warna: '#b8860b',
  },
];

// ─── Paket bundle ────────────────────────────────────────────────────────────

export const bundleDummy = [
  {
    bundle_id: '1',
    nama: 'Paket Camping 2 Orang',
    deskripsi: 'Perlengkapan lengkap untuk dua orang: tenda, nesting, kompor, dan lampu.',
    harga_bundle: 130000,
    is_aktif: true,
    komponen: [
      { item_id: '2', kode_barang: 'TND-002', nama: 'Tenda Dome 4 Orang', kuantitas: 1 },
      { item_id: '7', kode_barang: 'NES-001', nama: 'Sleeping Bag', kuantitas: 2 },
      { item_id: '8', kode_barang: 'MSK-001', nama: 'Kompor Portable', kuantitas: 1 },
      { item_id: '10', kode_barang: 'LMP-001', nama: 'Lampu Tenda LED', kuantitas: 1 },
    ],
  },
  {
    bundle_id: '2',
    nama: 'Paket Camping 4 Orang',
    deskripsi: 'Paket untuk rombongan empat orang dengan tenda besar dan alat masak lengkap.',
    harga_bundle: 240000,
    is_aktif: true,
    komponen: [
      { item_id: '2', kode_barang: 'TND-002', nama: 'Tenda Dome 4 Orang', kuantitas: 1 },
      { item_id: '7', kode_barang: 'NES-001', nama: 'Sleeping Bag', kuantitas: 4 },
      { item_id: '8', kode_barang: 'MSK-001', nama: 'Kompor Portable', kuantitas: 1 },
      { item_id: '10', kode_barang: 'LMP-001', nama: 'Lampu Tenda LED', kuantitas: 2 },
    ],
  },
];

// ─── Tarif denda ────────────────────────────────────────────────────────────
// Tabel PenaltyRate memakai `rate_id` dan TIDAK punya kolom `satuan`.

export const tarifDendaDummy = [
  {
    rate_id: '1', tipe: 'DENDA_PER_JAM', item_id: null, nama_item: null,
    nominal: 10000, diatur_oleh: '3', updated_at: capWaktu(-30),
  },
  {
    rate_id: '2', tipe: 'GANTI_RUGI_DEFAULT', item_id: null, nama_item: null,
    nominal: 200000, diatur_oleh: '3', updated_at: capWaktu(-30),
  },
];

// ─── Pesanan ─────────────────────────────────────────────────────────────────
// Delapan pesanan mencakup seluruh status pada enum SRS §2.8.

function barisItem(alat, kuantitas, hari) {
  return {
    tipe: 'ITEM',
    item_id: alat.item_id,
    bundle_id: null,
    nama: alat.nama,
    kuantitas,
    harga_satuan: alat.tarif_harian,
    subtotal: alat.tarif_harian * kuantitas * hari,
  };
}

function barisBundle(bundle, kuantitas, hari) {
  return {
    tipe: 'BUNDLE',
    item_id: null,
    bundle_id: bundle.bundle_id,
    nama: bundle.nama,
    kuantitas,
    harga_satuan: bundle.harga_bundle,
    subtotal: bundle.harga_bundle * kuantitas * hari,
  };
}

/**
 * Bangun pesanan lengkap dari baris ringkas. `nomor` dipakai untuk membuat kode
 * dan id yang stabil antar-pemuatan.
 */
function pesanan({ nomor, user, status, mulai, selesai, baris, denda = [], totalTambahan = 0, catatan = null, dibuatJam = 9 }) {
  const totalSewa = baris.reduce((j, b) => j + b.subtotal, 0);
  const totalDenda = denda.reduce((j, d) => j + d.nominal, 0);
  const kode = `RAC-${mulai.replace(/-/g, '')}-${String(nomor).padStart(6, '0')}`;

  return {
    order_id: String(nomor),
    kode_pesanan: kode,
    user_id: String(user.user_id),
    pelanggan: user.nama,
    pelanggan_telepon: user.nomor_telepon,
    tanggal_mulai: mulai,
    tanggal_selesai: selesai,
    status,
    total_sewa: totalSewa,
    total_biaya_tambahan: totalTambahan + totalDenda,
    total_akhir: totalSewa + totalTambahan + totalDenda,
    // Hanya bermakna saat MENUNGGU_PEMBAYARAN; dipakai hitung mundur di UI.
    batas_pembayaran: status === 'MENUNGGU_PEMBAYARAN' ? isoJam(0, 21) : null,
    catatan,
    created_at: capWaktu(nomor - 20, dibuatJam),
    updated_at: capWaktu(nomor - 19, dibuatJam),
    items: baris,
    denda,
  };
}

const A = (id) => alatDummy.find((a) => a.item_id === id);
const B = (id) => bundleDummy.find((b) => b.bundle_id === id);

export const pesananDummy = [
  // 1 — pelanggan, menunggu pembayaran (memicu hitung mundur di DetailPesanan).
  pesanan({
    nomor: 1, user: penggunaDummy[0], status: 'MENUNGGU_PEMBAYARAN',
    mulai: geserHari(2), selesai: geserHari(4),
    baris: [barisItem(A('2'), 1, 3), barisItem(A('7'), 2, 3)],
    catatan: 'Mohon tenda yang masih baru.',
  }),
  // 2 — pelanggan, sudah dibayar.
  pesanan({
    nomor: 2, user: penggunaDummy[0], status: 'DIBAYAR',
    mulai: geserHari(3), selesai: geserHari(5),
    baris: [barisBundle(B('1'), 1, 3)],
  }),
  // 3 — pelanggan, sedang disiapkan petugas (muncul di tugas penyerahan).
  pesanan({
    nomor: 3, user: penggunaDummy[0], status: 'DISIAPKAN',
    mulai: geserHari(1), selesai: geserHari(3),
    baris: [barisItem(A('4'), 1, 3), barisItem(A('8'), 1, 3)],
  }),
  // 4 — pelanggan, sedang disewa dan sudah lewat jadwal (penanda terlambat).
  pesanan({
    nomor: 4, user: penggunaDummy[0], status: 'SEDANG_DISEWA',
    mulai: geserHari(-6), selesai: geserHari(-2),
    baris: [barisItem(A('1'), 2, 5)],
  }),
  // 5 — pelanggan, sudah dikembalikan dengan denda keterlambatan yang belum lunas.
  pesanan({
    nomor: 5, user: penggunaDummy[0], status: 'DIKEMBALIKAN',
    mulai: geserHari(-10), selesai: geserHari(-8),
    baris: [barisItem(A('3'), 1, 3)],
    denda: [
      {
        penalty_id: '1', order_id: '5', tipe: 'DENDA_KETERLAMBATAN', item_id: null,
        nama_item: null, durasi_terlambat_menit: 150, nominal: 30000,
        status_pelunasan: 'BELUM_LUNAS', created_at: capWaktu(-7),
      },
    ],
  }),
  // 6 — pelanggan, selesai tanpa denda.
  pesanan({
    nomor: 6, user: penggunaDummy[0], status: 'SELESAI',
    mulai: geserHari(-20), selesai: geserHari(-18),
    baris: [barisItem(A('10'), 2, 3)],
  }),
  // 7 — gagal karena melewati batas pembayaran.
  pesanan({
    nomor: 7, user: penggunaDummy[0], status: 'GAGAL_KEDALUWARSA',
    mulai: geserHari(-15), selesai: geserHari(-13),
    baris: [barisItem(A('6'), 1, 3)],
  }),
  // 8 — dibatalkan pelanggan.
  pesanan({
    nomor: 8, user: penggunaDummy[0], status: 'DIBATALKAN',
    mulai: geserHari(-12), selesai: geserHari(-10),
    baris: [barisItem(A('5'), 1, 3)],
  }),
];

// ─── Catatan checklist serah-terima ──────────────────────────────────────────

export const checklistDummy = [
  {
    checklist_id: '1',
    order_id: '3',
    tipe: 'SERAH_TERIMA',
    petugas: 'Bagas Petugas',
    waktu_aktual: capWaktu(-1, 8),
    catatan: 'Alat diserahkan lengkap dan berfungsi baik.',
    foto_url: null,
    items: [
      { item_id: '4', kode_barang: 'TAS-001', nama: 'Carrier 60L', kuantitas: 1, kondisi: 'BAIK', kelengkapan: true, catatan: null },
      { item_id: '8', kode_barang: 'MSK-001', nama: 'Kompor Portable', kuantitas: 1, kondisi: 'BAIK', kelengkapan: true, catatan: null },
    ],
  },
  {
    checklist_id: '2',
    order_id: '5',
    tipe: 'PENGEMBALIAN',
    petugas: 'Bagas Petugas',
    waktu_aktual: capWaktu(-7, 10),
    catatan: 'Dikembalikan terlambat 2,5 jam.',
    foto_url: null,
    items: [
      { item_id: '3', kode_barang: 'TND-003', nama: 'Tenda Pleton 6 Orang', kuantitas: 1, kondisi: 'BAIK', kelengkapan: true, catatan: null },
    ],
  },
];

// ─── Rekap pesanan populer (untuk halaman Beranda) ───────────────────────────
// `populer` punya bentuk tersendiri: tanpa kode_barang, dengan jumlah_disewa.

export const populerDummy = [
  { item_id: '2', nama: 'Tenda Dome 4 Orang', tarif_harian: 75000, jumlah_disewa: 42 },
  { item_id: '4', nama: 'Carrier 60L', tarif_harian: 60000, jumlah_disewa: 37 },
  { item_id: '7', nama: 'Sleeping Bag', tarif_harian: 20000, jumlah_disewa: 31 },
  { item_id: '10', nama: 'Lampu Tenda LED', tarif_harian: 15000, jumlah_disewa: 28 },
];

/** Media per alat, disusun sekali agar konsisten di semua endpoint katalog. */
export const mediaPerAlat = Object.fromEntries(
  alatDummy.map((a) => [a.item_id, mediaAlat(a.nama, a.warna, a.item_id)])
);
