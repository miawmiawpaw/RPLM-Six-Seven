/**
 * Router mock — meniru backend di sisi peramban.
 *
 * `tanganiMock(jalur, opsi)` menerima jalur dan opsi yang SAMA dengan yang
 * diterima `panggil()` pada `../client.js`, lalu mengembalikan objek dengan
 * bentuk yang sama seperti respons backend:
 *
 *   sukses → { status: 'sukses', message?, data?, meta? }
 *   galat  → { status: 'error', code, message, details? }
 *
 * Semua endpoint mengembalikan Promise dan menambah jeda kecil supaya keadaan
 * "memuat" di antarmuka tetap terlihat (kalau terlalu instan, komponen terlihat
 * berkedip tanpa alasan).
 *
 * Bentuk data mengikuti `backend/src/modules/*` — lihat `dataDummy.js` untuk
 * sumber datanya. Bila kontrak backend berubah, berkas ini yang harus ikut
 * berubah agar mode mock tetap jujur.
 */

import {
  geserHari,
  capWaktu,
  isoJam,
  penggunaDummy,
  KATA_SANDI_DEMO,
  tokenVerifikasiDummy,
  tokenResetDummy,
  kategoriDummy,
  alatDummy,
  bundleDummy,
  tarifDendaDummy,
  pesananDummy,
  checklistDummy,
  populerDummy,
  mediaPerAlat,
} from './dataDummy.js';

// ─── Nama kunci penyimpanan (harus sama dengan `client.js`) ──────────────────
const KUNCI_PENGGUNA_MOCK = 'rac_mock_pengguna_id';

// ─── "Basis data" mock yang hidup selama tab terbuka ─────────────────────────
// Salinan dangkal supaya mutasi (buat pesanan, ubah kondisi, lunaskan denda)
// tidak merusak modul data aslinya saat halaman dimuat ulang oleh Vite.

const db = {
  pengguna: penggunaDummy.map((p) => ({ ...p })),
  alat: alatDummy.map((a) => ({ ...a })),
  bundle: bundleDummy.map((b) => ({ ...b, komponen: b.komponen.map((k) => ({ ...k })) })),
  pesanan: pesananDummy.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })), denda: p.denda.map((d) => ({ ...d })) })),
  checklist: checklistDummy.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) })),
  tarif: tarifDendaDummy.map((t) => ({ ...t })),
  urutanPesanan: 100,
  urutanChecklist: 100,
  urutanDenda: 100,
  urutanItem: 100,
};

/** Siapa yang sedang "masuk" di mode mock (disimpan agar tahan muat ulang). */
function idPenggunaAktif() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(KUNCI_PENGGUNA_MOCK) : null;
}

function setPenggunaAktif(id) {
  if (typeof localStorage === 'undefined') return;
  if (id === null) localStorage.removeItem(KUNCI_PENGGUNA_MOCK);
  else localStorage.setItem(KUNCI_PENGGUNA_MOCK, String(id));
}

function penggunaAktif() {
  const id = idPenggunaAktif();
  return id ? db.pengguna.find((p) => String(p.user_id) === String(id)) || null : null;
}

// ─── Pembantu respons ────────────────────────────────────────────────────────

const jeda = (ms = 120) => new Promise((r) => setTimeout(r, ms));

const sukses = (data, tambahan = {}) => ({ status: 'sukses', data, ...tambahan });

const galat = (code, message, status = 400, details) => ({
  status: 'error',
  code,
  message,
  status_http: status,
  ...(details === undefined ? {} : { details }),
});

/** Normalisasi angka halaman/batas seperti backend (default 1 / 20). */
function paginasi(kueri, bawaanBatas = 20) {
  const halaman = Math.max(1, Number(kueri.halaman) || 1);
  const batas = Math.max(1, Number(kueri.batas) || bawaanBatas);
  return { halaman, batas, offset: (halaman - 1) * batas };
}

function potongHalaman(daftar, { halaman, batas, offset }) {
  return {
    data: daftar.slice(offset, offset + batas),
    meta: { halaman, batas, total: daftar.length },
  };
}

function hariAntara(mulai, selesai) {
  const a = new Date(`${mulai}T00:00:00`);
  const b = new Date(`${selesai}T00:00:00`);
  return Math.round((b - a) / 86400000) + 1;
}

// ─── Katalog ─────────────────────────────────────────────────────────────────

/**
 * Ketersediaan DIHITUNG saat kueri (ADR-02), bukan disimpan.
 * Bila rentang tanggal tidak diberikan, hasilnya `null` — bukan 0.
 */
function tersediaUntuk(alat, mulai, selesai) {
  if (!mulai || !selesai) return null;
  if (alat.status_kondisi !== 'TERSEDIA' || !alat.is_aktif) return 0;

  // Unit terpakai = jumlah pada pesanan yang rentangnya bersinggungan dan
  // statusnya masih memegang stok.
  const memegangStok = ['DIBAYAR', 'DISIAPKAN', 'SEDANG_DISEWA'];
  let terpakai = 0;

  for (const p of db.pesanan) {
    if (!memegangStok.includes(p.status)) continue;
    if (p.tanggal_selesai < mulai || p.tanggal_mulai > selesai) continue;

    for (const b of p.items) {
      if (b.tipe === 'ITEM') {
        if (b.item_id === alat.item_id) terpakai += b.kuantitas;
      } else {
        const paket = db.bundle.find((x) => x.bundle_id === b.bundle_id);
        const komp = paket?.komponen.find((k) => k.item_id === alat.item_id);
        if (komp) terpakai += komp.kuantitas * b.kuantitas;
      }
    }
  }

  return Math.max(0, alat.stok_fisik - terpakai);
}

/** Bentuk ItemKatalog — identik dengan `formatAlat` katalog backend. */
function formatItemKatalog(a, mulai, selesai) {
  return {
    item_id: a.item_id,
    kode_barang: a.kode_barang,
    nama: a.nama,
    merk: a.merk,
    kategori: a.kategori,
    tarif_harian: Number(a.tarif_harian),
    status_kondisi: a.status_kondisi,
    stok_fisik: a.stok_fisik,
    stok_minimum: a.stok_minimum,
    tersedia: tersediaUntuk(a, mulai, selesai),
    media: mediaPerAlat[a.item_id] || [],
  };
}

function katalogKategori() {
  return sukses(kategoriDummy);
}

function katalogAlat(kueri) {
  const { halaman, batas, offset } = paginasi(kueri, 12);
  const q = (kueri.q || '').toString().toLowerCase().trim();

  let daftar = db.alat.filter((a) => a.is_aktif);

  if (kueri.kategori) {
    const kat = kategoriDummy.find(
      (k) => k.category_id === String(kueri.kategori) || k.nama === kueri.kategori
    );
    if (kat) daftar = daftar.filter((a) => a.category_id === kat.category_id);
  }

  if (q) {
    daftar = daftar.filter(
      (a) =>
        a.nama.toLowerCase().includes(q) ||
        a.kode_barang.toLowerCase().includes(q) ||
        (a.merk || '').toLowerCase().includes(q)
    );
  }

  daftar = daftar.map((a) => formatItemKatalog(a, kueri.mulai, kueri.selesai));

  const { data, meta } = potongHalaman(daftar, { halaman, batas, offset });
  return sukses(data, { meta });
}

function katalogPopuler() {
  return sukses(populerDummy.map((p) => ({ ...p })));
}

function katalogDetail(itemId, kueri) {
  const alat = db.alat.find((a) => a.item_id === String(itemId));
  if (!alat || !alat.is_aktif) {
    return galat('TIDAK_DITEMUKAN', 'Alat tidak ditemukan.', 404);
  }
  // Detail dibungkus dalam kunci `item` — UI membaca `hasil.data.item`.
  return sukses({ item: formatItemKatalog(alat, kueri.mulai, kueri.selesai) });
}

function katalogBundle(kueri) {
  // Bundle yang komponennya tidak tersedia untuk rentang diminta DIKELUARKAN
  // seluruhnya (REQ-4.2.6) — bukan dikembalikan dengan `tersedia: 0`.
  const hasil = db.bundle
    .filter((b) => b.is_aktif)
    .map((b) => {
      let tersedia = null;
      if (kueri.mulai && kueri.selesai) {
        tersedia = Infinity;
        for (const k of b.komponen) {
          const alat = db.alat.find((a) => a.item_id === k.item_id);
          const sisa = alat ? tersediaUntuk(alat, kueri.mulai, kueri.selesai) : 0;
          tersedia = Math.min(tersedia, Math.floor(sisa / k.kuantitas));
        }
        if (!Number.isFinite(tersedia)) tersedia = 0;
      }
      return {
        bundle_id: b.bundle_id,
        nama: b.nama,
        deskripsi: b.deskripsi,
        harga_bundle: Number(b.harga_bundle),
        komponen: b.komponen.map((k) => ({ ...k })),
        tersedia,
      };
    })
    .filter((b) => b.tersedia === null || b.tersedia > 0);

  return sukses(hasil);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
// `penggunaAman` tidak pernah menyertakan kata sandi.

function penggunaAman(u) {
  return {
    user_id: u.user_id,
    nama: u.nama,
    email: u.email,
    nomor_telepon: u.nomor_telepon,
    role: u.role,
  };
}

function sesiUntuk(u) {
  return {
    pengguna: penggunaAman(u),
    accessToken: `mock-akses-${u.user_id}-${Date.now()}`,
    refreshToken: `mock-refresh-${u.user_id}`,
    tipeToken: 'Bearer',
    masaBerlakuDetik: 900,
  };
}

function authMasuk(body) {
  const email = (body?.email || '').toLowerCase().trim();
  const pengguna = db.pengguna.find((p) => p.email.toLowerCase() === email);

  // Nama field mengikuti skema backend (auth.schema.js): `password`, bukan
  // `kata_sandi`. Label UI tetap "Kata sandi", tetapi payload JSON-nya `password`.
  if (!pengguna || pengguna.kata_sandi !== body?.password) {
    return galat('KREDENSIAL_SALAH', 'Email atau kata sandi salah.', 401);
  }
  setPenggunaAktif(pengguna.user_id);
  return sukses(sesiUntuk(pengguna), { message: 'Berhasil masuk.' });
}

function authDaftar(body) {
  const email = (body?.email || '').toLowerCase().trim();
  const nama = (body?.nama || '').trim();

  if (!email || !nama || !body?.password) {
    return galat('VALIDASI_GAGAL', 'Nama, email, dan kata sandi wajib diisi.', 422);
  }
  if (db.pengguna.some((p) => p.email.toLowerCase() === email)) {
    return galat('EMAIL_TERPAKAI', 'Email sudah terdaftar.', 409);
  }

  const baru = {
    user_id: String(db.urutanItem++),
    nama,
    email,
    nomor_telepon: body.nomor_telepon || null,
    role: 'PELANGGAN',
    kata_sandi: body.password,
    sudah_verifikasi: false,
  };
  db.pengguna.push(baru);

  return sukses(
    { pengguna: penggunaAman(baru), tokenVerifikasi: tokenVerifikasiDummy },
    { message: 'Akun dibuat. Periksa email untuk verifikasi.' }
  );
}

function authVerifikasiEmail(body) {
  const pengguna = penggunaAktif();
  if (!pengguna) {
    return galat('TIDAK_ADA_SESI', 'Sesi tidak ditemukan.', 401);
  }
  if (body?.token !== tokenVerifikasiDummy && body?.token !== tokenResetDummy) {
    return galat('TOKEN_TIDAK_VALID', 'Token verifikasi tidak valid.', 400);
  }
  pengguna.sudah_verifikasi = true;
  return sukses({ pengguna: penggunaAman(pengguna), sudahVerifikasi: true });
}

function authLupaKataSandi(body) {
  const email = (body?.email || '').toLowerCase().trim();
  const ada = db.pengguna.some((p) => p.email.toLowerCase() === email);
  // Selalu berhasil; token hanya dikirim bila email memang terdaftar.
  return sukses(ada ? { terkirim: true, tokenReset: tokenResetDummy } : { terkirim: true });
}

function authAturUlangKataSandi(body) {
  if (body?.token !== tokenResetDummy) {
    return galat('TOKEN_TIDAK_VALID', 'Token atur ulang tidak valid.', 400);
  }
  // Tidak ada data pada respons — sama seperti backend.
  return { status: 'sukses', message: 'Kata sandi berhasil diatur ulang.' };
}

function authKeluar() {
  setPenggunaAktif(null);
  return { status: 'sukses', message: 'Berhasil keluar.' };
}

function authSaya() {
  const pengguna = penggunaAktif();
  if (!pengguna) return galat('BELUM_MASUK', 'Belum masuk.', 401);
  return sukses({ pengguna: penggunaAman(pengguna) });
}

function authPerbaruiProfil(body) {
  const pengguna = penggunaAktif();
  if (!pengguna) return galat('BELUM_MASUK', 'Belum masuk.', 401);
  if (body?.nama !== undefined) pengguna.nama = body.nama;
  if (body?.nomor_telepon !== undefined) pengguna.nomor_telepon = body.nomor_telepon;
  return sukses({ pengguna: penggunaAman(pengguna) });
}

function authRefresh(body) {
  // Mode mock tidak memakai kadaluwarsa token; cukup kembalikan sesi aktif.
  const id = body?.refreshToken ? String(body.refreshToken).split('-')[2] : idPenggunaAktif();
  const pengguna = db.pengguna.find((p) => String(p.user_id) === String(id)) || penggunaAktif();
  if (!pengguna) return galat('REFRESH_GAGAL', 'Sesi telah berakhir.', 401);
  return sukses(sesiUntuk(pengguna));
}

// ─── Pesanan ─────────────────────────────────────────────────────────────────

/** Bentuk `pesanan` lengkap (lihat `formatPesanan` backend). */
function formatPesanan(p) {
  return {
    order_id: p.order_id,
    kode_pesanan: p.kode_pesanan,
    user_id: p.user_id,
    pelanggan: p.pelanggan,
    pelanggan_telepon: p.pelanggan_telepon,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
    status: p.status,
    total_sewa: Number(p.total_sewa),
    total_biaya_tambahan: Number(p.total_biaya_tambahan),
    total_akhir: Number(p.total_akhir),
    batas_pembayaran: p.batas_pembayaran,
    catatan: p.catatan,
    items: p.items.map((i, idx) => ({
      order_item_id: i.order_item_id || `${p.order_id}-${idx + 1}`,
      tipe: i.tipe,
      item_id: i.item_id ? String(i.item_id) : null,
      bundle_id: i.bundle_id ? String(i.bundle_id) : null,
      nama: i.nama,
      kuantitas: i.kuantitas,
      harga_satuan: Number(i.harga_satuan),
      subtotal: Number(i.subtotal),
    })),
  };
}

/** Bentuk `pesananRingkas` untuk daftar riwayat. */
function ringkasPesanan(p) {
  return {
    order_id: p.order_id,
    kode_pesanan: p.kode_pesanan,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
    status: p.status,
    total_akhir: Number(p.total_akhir),
  };
}

function pesananRiwayat(kueri) {
  const { halaman, batas, offset } = paginasi(kueri, 10);
  const pengguna = penggunaAktif();
  if (!pengguna) return galat('BELUM_MASUK', 'Belum masuk.', 401);

  let daftar = db.pesanan.filter((p) => p.user_id === pengguna.user_id);

  // Filter status yang dikirim UI kini dihormati (sebelumnya diabaikan backend).
  if (kueri.status) daftar = daftar.filter((p) => p.status === kueri.status);

  daftar = daftar
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map(ringkasPesanan);

  const { data, meta } = potongHalaman(daftar, { halaman, batas, offset });
  return sukses(data, { meta });
}

function pesananDetail(orderId) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  return sukses({ pesanan: formatPesanan(pesanan) });
}

/** Hitung kebutuhan item satuan dari baris keranjang (bundle diekspansi). */
function ekspansiKebutuhan(baris) {
  const kebutuhan = new Map();
  for (const b of baris) {
    if (b.tipe === 'BUNDLE') {
      const paket = db.bundle.find((x) => x.bundle_id === String(b.bundle_id));
      if (!paket) continue;
      for (const k of paket.komponen) {
        const kunci = k.item_id;
        kebutuhan.set(kunci, (kebutuhan.get(kunci) || 0) + k.kuantitas * b.kuantitas);
      }
    } else {
      const kunci = String(b.item_id);
      kebutuhan.set(kunci, (kebutuhan.get(kunci) || 0) + b.kuantitas);
    }
  }
  return [...kebutuhan.entries()].map(([item_id, kuantitas]) => ({ item_id, kuantitas }));
}

function pesananBuat(body) {
  const pengguna = penggunaAktif();
  if (!pengguna) return galat('BELUM_MASUK', 'Belum masuk.', 401);

  const { tanggal_mulai, tanggal_selesai, catatan, items } = body || {};

  if (!items || items.length === 0) {
    return galat('KERANJANG_KOSONG', 'Keranjang kosong. Tambahkan alat sebelum melanjutkan.', 409);
  }
  if (!tanggal_mulai || !tanggal_selesai || tanggal_selesai < tanggal_mulai) {
    return galat('TANGGAL_TIDAK_VALID', 'Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.', 409);
  }
  if (tanggal_mulai < geserHari(0)) {
    return galat('TANGGAL_MULAI_MASA_LALU', 'Tanggal mulai tidak boleh sebelum hari ini.', 409);
  }

  // Periksa stok untuk rentang yang diminta — meniru Availability Engine.
  const kebutuhan = ekspansiKebutuhan(items);
  for (const k of kebutuhan) {
    const alat = db.alat.find((a) => a.item_id === k.item_id);
    if (!alat) return galat('ALAT_TIDAK_DITEMUKAN', 'Alat pada keranjang tidak ditemukan.', 404);
    const tersedia = tersediaUntuk(alat, tanggal_mulai, tanggal_selesai);
    if (tersedia !== null && k.kuantitas > tersedia) {
      return galat(
        'STOK_TIDAK_CUKUP',
        `Stok ${alat.nama} tidak mencukupi untuk tanggal tersebut (tersisa ${tersedia}).`,
        409
      );
    }
  }

  const hari = hariAntara(tanggal_mulai, tanggal_selesai);
  const nomor = db.urutanPesanan++;

  const baris = items.map((b) => {
    if (b.tipe === 'BUNDLE') {
      const paket = db.bundle.find((x) => x.bundle_id === String(b.bundle_id));
      return {
        tipe: 'BUNDLE', item_id: null, bundle_id: paket.bundle_id, nama: paket.nama,
        kuantitas: b.kuantitas, harga_satuan: paket.harga_bundle,
        subtotal: paket.harga_bundle * b.kuantitas * hari,
      };
    }
    const alat = db.alat.find((a) => a.item_id === String(b.item_id));
    return {
      tipe: 'ITEM', item_id: alat.item_id, bundle_id: null, nama: alat.nama,
      kuantitas: b.kuantitas, harga_satuan: alat.tarif_harian,
      subtotal: alat.tarif_harian * b.kuantitas * hari,
    };
  });

  const totalSewa = baris.reduce((j, b) => j + b.subtotal, 0);
  const baru = {
    order_id: String(nomor),
    kode_pesanan: `RAC-${tanggal_mulai.replace(/-/g, '')}-${String(nomor).padStart(6, '0')}`,
    user_id: pengguna.user_id,
    pelanggan: pengguna.nama,
    pelanggan_telepon: pengguna.nomor_telepon,
    tanggal_mulai, tanggal_selesai,
    status: 'MENUNGGU_PEMBAYARAN',
    total_sewa: totalSewa,
    total_biaya_tambahan: 0,
    total_akhir: totalSewa,
    batas_pembayaran: isoJam(0, 23),
    catatan: catatan || null,
    created_at: capWaktu(0),
    updated_at: capWaktu(0),
    items: baris,
    denda: [],
  };
  db.pesanan.unshift(baru);

  return sukses({ pesanan: formatPesanan(baru) }, { message: 'Pesanan berhasil dibuat.' });
}

function pesananBatalkan(orderId) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'MENUNGGU_PEMBAYARAN') {
    return galat(
      'STATUS_TIDAK_SESUAI',
      `Hanya pesanan yang menunggu pembayaran dapat dibatalkan. Status saat ini: ${pesanan.status}.`,
      409
    );
  }
  pesanan.status = 'DIBATALKAN';
  pesanan.updated_at = capWaktu(0);
  return sukses({ pesanan: formatPesanan(pesanan) }, { message: 'Pesanan dibatalkan.' });
}

function pesananTandaiSiap(orderId) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'DIBAYAR') {
    return galat('TRANSISI_TIDAK_SAH', `Transisi status dari ${pesanan.status} ke DISIAPKAN tidak diizinkan.`, 409);
  }
  pesanan.status = 'DISIAPKAN';
  pesanan.updated_at = capWaktu(0);
  return sukses({ pesanan: formatPesanan(pesanan) }, { message: 'Pesanan ditandai siap diambil.' });
}

/**
 * GET /orders/availability/check — dipakai halaman Keranjang.
 * Bentuk tiap entri: { item_id (Number), nama, kode_barang, stok_fisik,
 * terpakai, tersedia, status_kondisi }.
 */
function pesananCekKetersediaan(kueri) {
  const ids = String(kueri.item_ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return galat('VALIDASI_GAGAL', 'item_ids wajib diisi.', 422);
  }
  if (!kueri.mulai || !kueri.selesai) {
    return galat('VALIDASI_GAGAL', 'Rentang tanggal wajib diisi untuk memeriksa ketersediaan.', 422);
  }

  const ketersediaan = ids.map((id) => {
    const alat = db.alat.find((a) => a.item_id === String(id));
    if (!alat) {
      return {
        item_id: Number(id), nama: null, kode_barang: null,
        stok_fisik: 0, terpakai: 0, tersedia: 0, status_kondisi: 'HILANG',
      };
    }
    const tersedia = tersediaUntuk(alat, kueri.mulai, kueri.selesai) || 0;
    return {
      // Backend mengirim item_id sebagai Number di endpoint ini.
      item_id: Number(alat.item_id),
      nama: alat.nama,
      kode_barang: alat.kode_barang,
      stok_fisik: alat.stok_fisik,
      terpakai: Math.max(0, alat.stok_fisik - tersedia),
      tersedia,
      status_kondisi: alat.status_kondisi,
    };
  });

  return sukses({ ketersediaan });
}

// ─── Pembayaran ──────────────────────────────────────────────────────────────

function pembayaranBuat(body) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(body?.order_id));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'MENUNGGU_PEMBAYARAN') {
    return galat('STATUS_TIDAK_SESUAI', 'Pesanan ini tidak menunggu pembayaran.', 409);
  }

  return sukses({
    order_id: pesanan.order_id,
    kode_pesanan: pesanan.kode_pesanan,
    jumlah: Number(pesanan.total_akhir),
    // Mode mock tidak menyambung ke Midtrans; halaman pembayaran hanya membaca
    // `token`/`redirect_url` bila ada, jadi keduanya dikosongkan dengan jujur.
    token: null,
    redirect_url: null,
    mode_mock: true,
    pesan_mock: 'Pembayaran mock: tidak ada transaksi Midtrans yang dibuat. Gunakan tombol "Tandai sudah dibayar" untuk melanjutkan alur.',
  });
}

function pembayaranStatus(orderId) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);

  return sukses({
    order_id: pesanan.order_id,
    status_pesanan: pesanan.status,
    status_pembayaran: pesanan.status === 'MENUNGGU_PEMBAYARAN' ? 'MENUNGGU' : 'BERHASIL',
    jumlah: Number(pesanan.total_akhir),
    metode: 'MOCK',
  });
}

// ─── Inventaris ──────────────────────────────────────────────────────────────

/** Bentuk `formatAlat` inventaris — ada `is_aktif` dan `stok_menipis`. */
function formatAlatInventaris(a) {
  return {
    item_id: a.item_id,
    kode_barang: a.kode_barang,
    nama: a.nama,
    merk: a.merk,
    kategori: a.kategori,
    stok_fisik: a.stok_fisik,
    stok_minimum: a.stok_minimum,
    tarif_harian: Number(a.tarif_harian),
    status_kondisi: a.status_kondisi,
    is_aktif: Boolean(a.is_aktif),
    stok_menipis: a.stok_fisik <= a.stok_minimum,
  };
}

function inventarisAlat(kueri) {
  const { halaman, batas, offset } = paginasi(kueri, 20);
  const q = (kueri.q || '').toString().toLowerCase().trim();

  let daftar = db.alat.slice();
  if (kueri.kategori) {
    const kat = kategoriDummy.find(
      (k) => k.category_id === String(kueri.kategori) || k.nama === kueri.kategori
    );
    if (kat) daftar = daftar.filter((a) => a.category_id === kat.category_id);
  }
  if (q) {
    daftar = daftar.filter(
      (a) => a.nama.toLowerCase().includes(q) || a.kode_barang.toLowerCase().includes(q)
    );
  }

  daftar = daftar.map(formatAlatInventaris);
  const { data, meta } = potongHalaman(daftar, { halaman, batas, offset });
  return sukses(data, { meta });
}

function inventarisDetail(itemId) {
  const alat = db.alat.find((a) => a.item_id === String(itemId));
  if (!alat) return galat('TIDAK_DITEMUKAN', 'Alat tidak ditemukan.', 404);
  return sukses({ item: formatAlatInventaris(alat) });
}

function inventarisTambah(body) {
  const kategori = kategoriDummy.find((k) => k.category_id === String(body?.category_id));
  const baru = {
    item_id: String(db.urutanItem++),
    kode_barang: body?.kode_barang || `NEW-${db.urutanItem}`,
    nama: body?.nama || 'Alat Baru',
    merk: body?.merk || null,
    category_id: body?.category_id || '1',
    kategori: kategori?.nama || 'Tenda',
    tarif_harian: Number(body?.tarif_harian) || 0,
    stok_fisik: Number(body?.stok_fisik) || 0,
    stok_minimum: Number(body?.stok_minimum) || 1,
    status_kondisi: 'TERSEDIA',
    is_aktif: true,
    warna: '#3a6ea5',
  };
  db.alat.push(baru);
  return sukses({ item: formatAlatInventaris(baru) }, { message: 'Alat ditambahkan.' });
}

function inventarisUbah(itemId, body) {
  const alat = db.alat.find((a) => a.item_id === String(itemId));
  if (!alat) return galat('TIDAK_DITEMUKAN', 'Alat tidak ditemukan.', 404);

  for (const kunci of ['nama', 'merk', 'kode_barang', 'tarif_harian', 'stok_fisik', 'stok_minimum']) {
    if (body?.[kunci] !== undefined) alat[kunci] = body[kunci];
  }
  if (body?.category_id) {
    const kat = kategoriDummy.find((k) => k.category_id === String(body.category_id));
    if (kat) {
      alat.category_id = kat.category_id;
      alat.kategori = kat.nama;
    }
  }
  return sukses({ item: formatAlatInventaris(alat) }, { message: 'Alat diperbarui.' });
}

function inventarisUbahKondisi(itemId, body) {
  const alat = db.alat.find((a) => a.item_id === String(itemId));
  if (!alat) return galat('TIDAK_DITEMUKAN', 'Alat tidak ditemukan.', 404);

  const sah = ['TERSEDIA', 'SEDANG_DISEWA', 'RUSAK', 'HILANG'];
  if (!sah.includes(body?.status_kondisi)) {
    return galat('VALIDASI_GAGAL', `status_kondisi harus salah satu dari: ${sah.join(', ')}.`, 422);
  }
  alat.status_kondisi = body.status_kondisi;
  return sukses({ item: formatAlatInventaris(alat) }, { message: 'Kondisi alat diperbarui.' });
}

function inventarisHapus(itemId) {
  const alat = db.alat.find((a) => a.item_id === String(itemId));
  if (!alat) return galat('TIDAK_DITEMUKAN', 'Alat tidak ditemukan.', 404);
  // Soft delete (ADR-05) — hanya ditandai tidak aktif.
  alat.is_aktif = false;
  return { status: 'sukses', message: 'Alat dinonaktifkan.' };
}

function inventarisStokMenipis() {
  const daftar = db.alat
    .filter((a) => a.is_aktif && a.stok_fisik <= a.stok_minimum)
    .map((a) => ({
      item_id: a.item_id,
      kode_barang: a.kode_barang,
      nama: a.nama,
      stok_fisik: a.stok_fisik,
      stok_minimum: a.stok_minimum,
    }));
  return sukses(daftar);
}

function inventarisBundle(kueri) {
  // `sertakanNonaktif` default true — konsisten dengan backend.
  const sertakan = kueri.sertakan_nonaktif !== 'false';
  const hasil = db.bundle
    .filter((b) => sertakan || b.is_aktif)
    .map((b) => ({
      bundle_id: b.bundle_id,
      nama: b.nama,
      deskripsi: b.deskripsi,
      harga_bundle: Number(b.harga_bundle),
      is_aktif: Boolean(b.is_aktif),
      komponen: b.komponen.map((k) => ({ ...k })),
    }));
  return sukses(hasil);
}

function inventarisTambahBundle(body) {
  const baru = {
    bundle_id: String(db.urutanItem++),
    nama: body?.nama || 'Paket Baru',
    deskripsi: body?.deskripsi || null,
    harga_bundle: Number(body?.harga_bundle) || 0,
    is_aktif: true,
    komponen: (body?.komponen || []).map((k) => {
      const alat = db.alat.find((a) => a.item_id === String(k.item_id));
      return {
        item_id: String(k.item_id),
        kode_barang: alat?.kode_barang || '-',
        nama: alat?.nama || 'Alat',
        kuantitas: Number(k.kuantitas) || 1,
      };
    }),
  };
  db.bundle.push(baru);
  return sukses({ bundle: baru }, { message: 'Paket dibuat.' });
}

function inventarisUbahBundle(bundleId, body) {
  const paket = db.bundle.find((b) => b.bundle_id === String(bundleId));
  if (!paket) return galat('TIDAK_DITEMUKAN', 'Paket tidak ditemukan.', 404);

  if (body?.nama !== undefined) paket.nama = body.nama;
  if (body?.deskripsi !== undefined) paket.deskripsi = body.deskripsi;
  if (body?.harga_bundle !== undefined) paket.harga_bundle = Number(body.harga_bundle);
  if (body?.is_aktif !== undefined) paket.is_aktif = Boolean(body.is_aktif);
  if (Array.isArray(body?.komponen)) {
    paket.komponen = body.komponen.map((k) => {
      const alat = db.alat.find((a) => a.item_id === String(k.item_id));
      return {
        item_id: String(k.item_id),
        kode_barang: alat?.kode_barang || '-',
        nama: alat?.nama || 'Alat',
        kuantitas: Number(k.kuantitas) || 1,
      };
    });
  }
  return sukses({ bundle: paket }, { message: 'Paket diperbarui.' });
}

// ─── Serah-terima ────────────────────────────────────────────────────────────

function formatTugas(p) {
  return {
    order_id: p.order_id,
    kode_pesanan: p.kode_pesanan,
    pelanggan: p.pelanggan,
    pelanggan_telepon: p.pelanggan_telepon || null,
    jumlah_item: p.items.reduce((j, i) => j + i.kuantitas, 0),
    status: p.status,
    tanggal_mulai: p.tanggal_mulai,
    tanggal_selesai: p.tanggal_selesai,
  };
}

function serahTerimaTugas() {
  // Nama kunci mengikuti backend: `perlu_disarahkan` (bukan "diserahkan").
  return sukses({
    perlu_disarahkan: db.pesanan.filter((p) => p.status === 'DISIAPKAN').map(formatTugas),
    perlu_dikembalikan: db.pesanan.filter((p) => p.status === 'SEDANG_DISEWA').map(formatTugas),
  });
}

function serahTerimaChecklist(orderId) {
  const daftar = db.checklist.filter((c) => c.order_id === String(orderId));
  return sukses(daftar.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) })));
}

function serahTerimaSerahkan(orderId, body) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'DISIAPKAN') {
    return galat(
      'STATUS_TIDAK_SESUAI',
      `Serah-terima hanya dapat dicatat saat pesanan berstatus DISIAPKAN. Status saat ini: ${pesanan.status}.`,
      409
    );
  }

  const petugas = penggunaAktif();
  const items = (body?.items || []).map((i) => {
    const alat = db.alat.find((a) => a.item_id === String(i.item_id));
    return {
      item_id: String(i.item_id),
      kode_barang: alat?.kode_barang || '-',
      nama: alat?.nama || 'Alat',
      kuantitas: Number(i.kuantitas) || 1,
      kondisi: i.kondisi || 'BAIK',
      kelengkapan: Boolean(i.kelengkapan),
      catatan: i.catatan || null,
    };
  });

  const checklistId = String(db.urutanChecklist++);
  db.checklist.push({
    checklist_id: checklistId,
    order_id: pesanan.order_id,
    tipe: 'SERAH_TERIMA',
    petugas: petugas?.nama || 'Petugas',
    waktu_aktual: capWaktu(0),
    catatan: body?.catatan || null,
    foto_url: body?.foto_url || null,
    items,
  });

  pesanan.status = 'SEDANG_DISEWA';
  pesanan.updated_at = capWaktu(0);

  return sukses({ checklist_id: checklistId }, { message: 'Serah-terima dicatat.' });
}

function serahTerimaKembalikan(orderId, body) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'SEDANG_DISEWA') {
    return galat(
      'STATUS_TIDAK_SESUAI',
      `Pengembalian hanya dapat dicatat saat pesanan berstatus SEDANG_DISEWA. Status saat ini: ${pesanan.status}.`,
      409
    );
  }

  const petugas = penggunaAktif();

  // 1) Denda keterlambatan — dihitung dari akhir hari tanggal selesai.
  const batas = new Date(`${pesanan.tanggal_selesai}T23:59:59+07:00`);
  const menitTerlambat = Math.max(0, Math.floor((Date.now() - batas) / 60000));

  let totalTambahan = 0;
  if (menitTerlambat > 0) {
    const tarif = db.tarif.find((t) => t.tipe === 'DENDA_PER_JAM') || { nominal: 0 };
    const jam = Math.ceil(menitTerlambat / 60);
    const nominal = jam * Number(tarif.nominal);
    if (nominal > 0) {
      pesanan.denda.push({
        penalty_id: String(db.urutanDenda++),
        order_id: pesanan.order_id,
        tipe: 'DENDA_KETERLAMBATAN',
        item_id: null,
        nama_item: null,
        durasi_terlambat_menit: menitTerlambat,
        nominal,
        status_pelunasan: 'BELUM_LUNAS',
        created_at: capWaktu(0),
      });
      totalTambahan += nominal;
    }
  }

  // 2) Ganti rugi untuk alat rusak berat / hilang (REQ-4.7.2).
  const items = (body?.items || []).map((i) => {
    const alat = db.alat.find((a) => a.item_id === String(i.item_id));
    const kondisi = i.kondisi || 'BAIK';

    if (kondisi === 'RUSAK_BERAT' || kondisi === 'HILANG') {
      const tarifGanti =
        db.tarif.find((t) => t.tipe === 'GANTI_RUGI_DEFAULT' && t.item_id === String(i.item_id)) ||
        db.tarif.find((t) => t.tipe === 'GANTI_RUGI_DEFAULT' && t.item_id === null);
      const nominal = Number(tarifGanti?.nominal || 0) * (Number(i.kuantitas) || 1);
      if (nominal > 0) {
        pesanan.denda.push({
          penalty_id: String(db.urutanDenda++),
          order_id: pesanan.order_id,
          tipe: 'GANTI_RUGI',
          item_id: String(i.item_id),
          nama_item: alat?.nama || null,
          durasi_terlambat_menit: null,
          nominal,
          status_pelunasan: 'BELUM_LUNAS',
          created_at: capWaktu(0),
        });
        totalTambahan += nominal;
      }
      // Alat rusak berat/ hilang keluar dari peredaran.
      if (alat) {
        alat.status_kondisi = kondisi === 'HILANG' ? 'HILANG' : 'RUSAK';
        if (kondisi === 'HILANG') alat.stok_fisik = Math.max(0, alat.stok_fisik - (Number(i.kuantitas) || 1));
      }
    }

    return {
      item_id: String(i.item_id),
      kode_barang: alat?.kode_barang || '-',
      nama: alat?.nama || 'Alat',
      kuantitas: Number(i.kuantitas) || 1,
      kondisi,
      kelengkapan: Boolean(i.kelengkapan),
      catatan: i.catatan || null,
    };
  });

  const checklistId = String(db.urutanChecklist++);
  db.checklist.push({
    checklist_id: checklistId,
    order_id: pesanan.order_id,
    tipe: 'PENGEMBALIAN',
    petugas: petugas?.nama || 'Petugas',
    waktu_aktual: capWaktu(0),
    catatan: body?.catatan || null,
    foto_url: body?.foto_url || null,
    items,
  });

  pesanan.total_biaya_tambahan = Number(pesanan.total_biaya_tambahan) + totalTambahan;
  pesanan.total_akhir = Number(pesanan.total_sewa) + Number(pesanan.total_biaya_tambahan);
  pesanan.status = 'DIKEMBALIKAN';
  pesanan.updated_at = capWaktu(0);

  return sukses(
    {
      checklist_id: checklistId,
      menit_terlambat: menitTerlambat,
      total_biaya_tambahan: totalTambahan,
      total_akhir: pesanan.total_akhir,
    },
    { message: 'Pengembalian dicatat.' }
  );
}

// ─── Denda ───────────────────────────────────────────────────────────────────

function dendaPesanan(orderId) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  const daftar = pesanan ? pesanan.denda : [];
  return sukses(daftar.map(formatDenda));
}

function formatDenda(d) {
  return {
    penalty_id: d.penalty_id,
    order_id: d.order_id,
    tipe: d.tipe,
    item_id: d.item_id ? String(d.item_id) : null,
    nama_item: d.nama_item,
    durasi_terlambat_menit: d.durasi_terlambat_menit,
    nominal: Number(d.nominal),
    status_pelunasan: d.status_pelunasan,
    created_at: d.created_at,
  };
}

function dendaTarif() {
  return sukses(
    db.tarif.map((t) => ({
      rate_id: t.rate_id,
      tipe: t.tipe,
      item_id: t.item_id ? String(t.item_id) : null,
      nama_item: t.nama_item,
      nominal: Number(t.nominal),
      diatur_oleh: t.diatur_oleh ? String(t.diatur_oleh) : null,
      updated_at: t.updated_at,
    }))
  );
}

function dendaSimpanTarif(body) {
  const tipe = body?.tipe;
  const itemId = body?.item_id ? String(body.item_id) : null;
  if (!tipe) return galat('VALIDASI_GAGAL', 'Tipe tarif wajib diisi.', 422);

  const ada = db.tarif.find((t) => t.tipe === tipe && t.item_id === itemId);
  if (ada) {
    ada.nominal = Number(body.nominal);
    ada.diatur_oleh = penggunaAktif()?.user_id || null;
    ada.updated_at = capWaktu(0);
    return sukses({ rate: { ...ada } }, { message: 'Tarif diperbarui.' });
  }

  const alat = itemId ? db.alat.find((a) => a.item_id === itemId) : null;
  const baru = {
    rate_id: String(db.urutanDenda++),
    tipe,
    item_id: itemId,
    nama_item: alat?.nama || null,
    nominal: Number(body.nominal) || 0,
    diatur_oleh: penggunaAktif()?.user_id || null,
    updated_at: capWaktu(0),
  };
  db.tarif.push(baru);
  return sukses({ rate: { ...baru } }, { message: 'Tarif dibuat.' });
}

function dendaRingkasan() {
  const belum = [];
  for (const p of db.pesanan) {
    for (const d of p.denda) if (d.status_pelunasan === 'BELUM_LUNAS') belum.push(d);
  }

  const perTipe = {};
  for (const d of belum) {
    const t = (perTipe[d.tipe] = perTipe[d.tipe] || { tipe: d.tipe, nominal: 0, jumlah: 0 });
    t.nominal += Number(d.nominal);
    t.jumlah += 1;
  }

  return sukses({
    total_belum_lunas: belum.reduce((j, d) => j + Number(d.nominal), 0),
    jumlah_denda: belum.length,
    per_tipe: Object.values(perTipe),
  });
}

function dendaDaftar(kueri) {
  // Satu entri per pesanan yang punya denda, dengan daftar dendanya.
  const sertakanLunas = kueri.sertakan_lunas === 'true';
  const hasil = [];

  for (const p of db.pesanan) {
    if (p.denda.length === 0) continue;
    if (!sertakanLunas && !p.denda.some((d) => d.status_pelunasan === 'BELUM_LUNAS')) continue;

    hasil.push({
      order_id: p.order_id,
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      status: p.status,
      updated_at: p.updated_at,
      denda: p.denda.map(formatDenda),
    });
  }

  hasil.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return sukses(hasil);
}

function dendaLunaskan(penaltyId) {
  let ditemukan = null;
  for (const p of db.pesanan) {
    const d = p.denda.find((x) => x.penalty_id === String(penaltyId));
    if (d) {
      ditemukan = d;
      break;
    }
  }
  if (!ditemukan) return galat('TIDAK_DITEMUKAN', 'Denda tidak ditemukan.', 404);
  if (ditemukan.status_pelunasan === 'LUNAS') {
    return galat('SUDAH_LUNAS', 'Denda ini sudah ditandai lunas.', 409);
  }

  ditemukan.status_pelunasan = 'LUNAS';
  return sukses({ penalty: formatDenda(ditemukan) }, { message: 'Denda ditandai lunas.' });
}

function dendaSelesaikan(orderId, kueri) {
  const pesanan = db.pesanan.find((p) => p.order_id === String(orderId));
  if (!pesanan) return galat('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.', 404);
  if (pesanan.status !== 'DIKEMBALIKAN') {
    return galat(
      'STATUS_TIDAK_SESUAI',
      `Pesanan hanya dapat diselesaikan setelah alat dikembalikan. Status saat ini: ${pesanan.status}.`,
      409
    );
  }

  const belum = pesanan.denda.filter((d) => d.status_pelunasan === 'BELUM_LUNAS');
  const paksa = kueri.paksa === 'true';
  if (belum.length > 0 && !paksa) {
    const total = belum.reduce((j, d) => j + Number(d.nominal), 0);
    return galat(
      'ADA_TUNGGAKAN',
      `Pesanan masih memiliki ${belum.length} denda belum lunas (total Rp${total.toLocaleString('id-ID')}).`,
      409
    );
  }

  pesanan.status = 'SELESAI';
  pesanan.updated_at = capWaktu(0);
  return sukses({ pesanan: formatPesanan(pesanan) }, { message: 'Pesanan ditandai selesai.' });
}

// ─── Laporan ─────────────────────────────────────────────────────────────────

/** Rentang default: 30 hari terakhir — meniru perilaku layar laporan. */
function periodeDari(kueri) {
  return {
    dari: kueri.dari || geserHari(-29),
    sampai: kueri.sampai || geserHari(0),
  };
}

function laporanPenyewaan(kueri) {
  const { dari, sampai } = periodeDari(kueri);
  const dalamPeriode = db.pesanan.filter((p) => p.tanggal_mulai >= dari && p.tanggal_mulai <= sampai);
  const hitung = ['DIBAYAR', 'DISIAPKAN', 'SEDANG_DISEWA', 'DIKEMBALIKAN', 'SELESAI'];

  const perStatus = {};
  for (const p of dalamPeriode) {
    const s = (perStatus[p.status] = perStatus[p.status] || { status: p.status, jumlah: 0, total: 0 });
    s.jumlah += 1;
    s.total += Number(p.total_akhir);
  }

  const perHari = {};
  for (const p of dalamPeriode) {
    if (!hitung.includes(p.status)) continue;
    const h = (perHari[p.tanggal_mulai] = perHari[p.tanggal_mulai] || {
      tanggal: p.tanggal_mulai, jumlah_pesanan: 0, pendapatan: 0,
    });
    h.jumlah_pesanan += 1;
    h.pendapatan += Number(p.total_akhir);
  }

  return sukses({
    periode: { dari, sampai },
    total_pendapatan: dalamPeriode
      .filter((p) => hitung.includes(p.status))
      .reduce((j, p) => j + Number(p.total_akhir), 0),
    per_status: Object.values(perStatus),
    per_hari: Object.values(perHari).sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)),
    pesanan: dalamPeriode.map((p) => ({
      order_id: p.order_id,
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      jumlah_item: p.items.reduce((j, i) => j + i.kuantitas, 0),
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      total_akhir: Number(p.total_akhir),
      status: p.status,
    })),
  });
}

function laporanPemanfaatan(kueri) {
  const { dari, sampai } = periodeDari(kueri);
  const jumlahHari = Math.max(1, hariAntara(dari, sampai));

  const terpakaiPerAlat = new Map();
  const pendapatanPerAlat = new Map();

  for (const p of db.pesanan) {
    if (p.tanggal_selesai < dari || p.tanggal_mulai > sampai) continue;
    if (p.status === 'DIBATALKAN' || p.status === 'GAGAL_KEDALUWARSA') continue;

    for (const b of p.items) {
      const satuan =
        b.tipe === 'ITEM'
          ? [{ item_id: b.item_id, kuantitas: b.kuantitas, subtotal: b.subtotal }]
          : (db.bundle.find((x) => x.bundle_id === b.bundle_id)?.komponen || []).map((k) => ({
              item_id: k.item_id,
              kuantitas: k.kuantitas * b.kuantitas,
              subtotal: b.subtotal / Math.max(1, k.kuantitas * b.kuantitas),
            }));

      for (const s of satuan) {
        terpakaiPerAlat.set(s.item_id, (terpakaiPerAlat.get(s.item_id) || 0) + s.kuantitas);
        pendapatanPerAlat.set(s.item_id, (pendapatanPerAlat.get(s.item_id) || 0) + s.subtotal);
      }
    }
  }

  const alatAktif = db.alat.filter((a) => a.is_aktif);

  const alat = alatAktif.map((a) => {
    const total_unit = terpakaiPerAlat.get(a.item_id) || 0;
    const totalHariTersedia = a.stok_fisik * jumlahHari;
    const rasio = totalHariTersedia > 0 ? Math.min(1, total_unit / totalHariTersedia) : 0;
    return {
      item_id: a.item_id,
      kode_barang: a.kode_barang,
      nama: a.nama,
      stok_fisik: a.stok_fisik,
      jumlah_sewa: total_unit,
      kali_disewa: total_unit,
      total_unit_hari: total_unit,
      hari_tersewa: total_unit,
      rasio_pemanfaatan: rasio,
      utilisasi_persen: Math.round(rasio * 1000) / 10,
      pendapatan: pendapatanPerAlat.get(a.item_id) || 0,
    };
  });

  const rataRata = alat.length > 0 ? alat.reduce((s, a) => s + a.rasio_pemanfaatan, 0) / alat.length : 0;

  return sukses({
    periode: { dari, sampai, jumlah_hari: jumlahHari },
    total_alat: alatAktif.length,
    utilisasi_rata_rata: Math.round(rataRata * 1000) / 10,
    alat_tidak_terpakai: alatAktif.filter((a) => (terpakaiPerAlat.get(a.item_id) || 0) === 0).length,
    alat,
  });
}

function laporanPendapatan(kueri) {
  const { dari, sampai } = periodeDari(kueri);
  const dalamPeriode = db.pesanan.filter((p) => p.tanggal_mulai >= dari && p.tanggal_mulai <= sampai);
  const dihitung = dalamPeriode.filter((p) => p.status !== 'DIBATALKAN' && p.status !== 'GAGAL_KEDALUWARSA');

  const pendapatanSewa = dihitung.reduce((j, p) => j + Number(p.total_sewa), 0);
  const biayaTambahan = dihitung.reduce((j, p) => j + Number(p.total_biaya_tambahan), 0);

  const dendaSemua = [];
  for (const p of db.pesanan) {
    for (const d of p.denda) if (d.created_at >= dari && d.created_at <= `${sampai} 23:59:59`) dendaSemua.push(d);
  }
  const totalDenda = dendaSemua.reduce((j, d) => j + Number(d.nominal), 0);

  const perHari = {};
  for (const p of dihitung) {
    const h = (perHari[p.tanggal_mulai] = perHari[p.tanggal_mulai] || {
      tanggal: p.tanggal_mulai, jumlah_transaksi: 0, nilai_sewa: 0, nilai_denda: 0,
    });
    h.jumlah_transaksi += 1;
    h.nilai_sewa += Number(p.total_sewa);
  }
  for (const d of dendaSemua) {
    const tanggal = d.created_at.slice(0, 10);
    const h = (perHari[tanggal] = perHari[tanggal] || {
      tanggal, jumlah_transaksi: 0, nilai_sewa: 0, nilai_denda: 0,
    });
    h.nilai_denda += Number(d.nominal);
  }

  const perTipe = {};
  for (const d of dendaSemua) {
    const t = (perTipe[d.tipe] = perTipe[d.tipe] || { tipe: d.tipe, jumlah: 0, nominal: 0 });
    t.jumlah += 1;
    t.nominal += Number(d.nominal);
  }

  return sukses({
    periode: { dari, sampai },
    pendapatan_sewa: pendapatanSewa,
    biaya_tambahan: biayaTambahan,
    total_pendapatan: pendapatanSewa,
    total_denda: totalDenda,
    total_keseluruhan: pendapatanSewa + biayaTambahan + totalDenda,
    rincian: Object.values(perHari).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)),
    rincian_denda: Object.values(perTipe),
  });
}

function laporanPesanan(kueri) {
  const { halaman, batas, offset } = paginasi(kueri, 20);
  let daftar = db.pesanan.slice();

  // Penyaringan status DIHORMATI di sini (backend asli belum meneruskannya).
  if (kueri.status) daftar = daftar.filter((p) => p.status === kueri.status);

  // Rentang tanggal opsional, sesuai kueri `dari`/`sampai`.
  if (kueri.dari) daftar = daftar.filter((p) => p.created_at >= kueri.dari);
  if (kueri.sampai) daftar = daftar.filter((p) => p.created_at <= `${kueri.sampai} 23:59:59`);

  daftar = daftar
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((p) => ({
      order_id: p.order_id,
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      pelanggan_telepon: p.pelanggan_telepon,
      jumlah_item: p.items.reduce((j, i) => j + i.kuantitas, 0),
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      total_akhir: Number(p.total_akhir),
      status: p.status,
      created_at: p.created_at,
    }));

  const { data, meta } = potongHalaman(daftar, { halaman, batas, offset });
  return sukses(data, { meta });
}

function laporanDasbor() {
  const hitung = (s) => db.pesanan.filter((p) => p.status === s).length;
  const alatAktif = db.alat.filter((a) => a.is_aktif);

  const awalBulan = `${geserHari(0).slice(0, 7)}-01`;
  const pendapatanBulanIni = db.pesanan
    .filter((p) => p.tanggal_mulai >= awalBulan && ['DIBAYAR', 'DISIAPKAN', 'SEDANG_DISEWA', 'DIKEMBALIKAN', 'SELESAI'].includes(p.status))
    .reduce((j, p) => j + Number(p.total_akhir), 0);

  let dendaBelumLunas = 0;
  for (const p of db.pesanan) for (const d of p.denda) if (d.status_pelunasan === 'BELUM_LUNAS') dendaBelumLunas += Number(d.nominal);

  const hariIni = geserHari(0);
  const pesananTerlambat = db.pesanan.filter(
    (p) => p.status === 'SEDANG_DISEWA' && p.tanggal_selesai < hariIni
  ).length;

  return sukses({
    tanggal: hariIni,
    pesanan_aktif: hitung('DIBAYAR') + hitung('DISIAPKAN') + hitung('SEDANG_DISEWA'),
    menunggu_pembayaran: hitung('MENUNGGU_PEMBAYARAN'),
    pesanan_menunggu_pembayaran: hitung('MENUNGGU_PEMBAYARAN'),
    pesanan_perlu_disiapkan: hitung('DISIAPKAN'),
    pesanan_sedang_disewa: hitung('SEDANG_DISEWA'),
    pendapatan_bulan_ini: pendapatanBulanIni,
    total_alat_aktif: alatAktif.length,
    alat_stok_menipis: alatAktif.filter((a) => a.stok_fisik <= a.stok_minimum).length,
    stok_menipis: alatAktif.filter((a) => a.stok_fisik <= a.stok_minimum).length,
    pesanan_terlambat: pesananTerlambat,
    denda_belum_lunas: dendaBelumLunas,
    pesanan_terbaru: db.pesanan
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((p) => ({
        order_id: p.order_id,
        kode_pesanan: p.kode_pesanan,
        pelanggan: p.pelanggan,
        status: p.status,
        total_akhir: Number(p.total_akhir),
        created_at: p.created_at,
      })),
  });
}

// ─── Media ───────────────────────────────────────────────────────────────────
// Router media TIDAK dipasang di backend (`app.js` tidak memuatnya). Di mock,
// endpoint ini tetap dilayani agar layar yang memanggilnya tidak pecah.

function mediaDaftar(itemId) {
  return sukses((mediaPerAlat[String(itemId)] || []).map((m) => ({ ...m })));
}

// ─── Tabel rute ──────────────────────────────────────────────────────────────
// Setiap entri: [metode, RegExp, penangan(hasilCocok, kueri, body)].

const rute = [
  // Auth
  ['POST', /^\/auth\/register$/, (m, q, body) => authDaftar(body)],
  ['POST', /^\/auth\/login$/, (m, q, body) => authMasuk(body)],
  ['POST', /^\/auth\/refresh$/, (m, q, body) => authRefresh(body)],
  ['POST', /^\/auth\/verify-email$/, (m, q, body) => authVerifikasiEmail(body)],
  ['POST', /^\/auth\/forgot-password$/, (m, q, body) => authLupaKataSandi(body)],
  ['POST', /^\/auth\/reset-password$/, (m, q, body) => authAturUlangKataSandi(body)],
  ['POST', /^\/auth\/logout$/, () => authKeluar()],
  ['GET', /^\/auth\/me$/, () => authSaya()],
  ['PATCH', /^\/auth\/me$/, (m, q, body) => authPerbaruiProfil(body)],

  // Katalog (publik)
  ['GET', /^\/catalog\/categories$/, () => katalogKategori()],
  ['GET', /^\/catalog\/items\/popular$/, () => katalogPopuler()],
  ['GET', /^\/catalog\/items\/([^/]+)$/, (m, q) => katalogDetail(m[1], q)],
  ['GET', /^\/catalog\/items$/, (m, q) => katalogAlat(q)],
  ['GET', /^\/catalog\/bundles$/, (m, q) => katalogBundle(q)],

  // Pesanan
  ['GET', /^\/orders\/availability\/check$/, (m, q) => pesananCekKetersediaan(q)],
  ['GET', /^\/orders\/([^/]+)$/, (m) => pesananDetail(m[1])],
  ['GET', /^\/orders$/, (m, q) => pesananRiwayat(q)],
  ['POST', /^\/orders$/, (m, q, body) => pesananBuat(body)],
  ['POST', /^\/orders\/([^/]+)\/cancel$/, (m) => pesananBatalkan(m[1])],
  ['POST', /^\/orders\/([^/]+)\/ready$/, (m) => pesananTandaiSiap(m[1])],

  // Pembayaran
  ['POST', /^\/payment\/create$/, (m, q, body) => pembayaranBuat(body)],
  ['GET', /^\/payment\/status\/([^/]+)$/, (m) => pembayaranStatus(m[1])],

  // Inventaris
  ['GET', /^\/inventory\/items\/low-stock$/, () => inventarisStokMenipis()],
  ['GET', /^\/inventory\/items\/([^/]+)$/, (m) => inventarisDetail(m[1])],
  ['GET', /^\/inventory\/items$/, (m, q) => inventarisAlat(q)],
  ['POST', /^\/inventory\/items$/, (m, q, body) => inventarisTambah(body)],
  ['PATCH', /^\/inventory\/items\/([^/]+)\/condition$/, (m, q, body) => inventarisUbahKondisi(m[1], body)],
  ['PATCH', /^\/inventory\/items\/([^/]+)$/, (m, q, body) => inventarisUbah(m[1], body)],
  ['DELETE', /^\/inventory\/items\/([^/]+)$/, (m) => inventarisHapus(m[1])],
  ['GET', /^\/inventory\/bundles$/, (m, q) => inventarisBundle(q)],
  ['POST', /^\/inventory\/bundles$/, (m, q, body) => inventarisTambahBundle(body)],
  ['PATCH', /^\/inventory\/bundles\/([^/]+)$/, (m, q, body) => inventarisUbahBundle(m[1], body)],

  // Serah-terima
  ['GET', /^\/handover\/tasks$/, () => serahTerimaTugas()],
  ['GET', /^\/handover\/([^/]+)\/checklist$/, (m) => serahTerimaChecklist(m[1])],
  ['POST', /^\/handover\/([^/]+)\/handover$/, (m, q, body) => serahTerimaSerahkan(m[1], body)],
  ['POST', /^\/handover\/([^/]+)\/return$/, (m, q, body) => serahTerimaKembalikan(m[1], body)],

  // Denda
  ['GET', /^\/penalty\/rates$/, () => dendaTarif()],
  ['PUT', /^\/penalty\/rates$/, (m, q, body) => dendaSimpanTarif(body)],
  ['GET', /^\/penalty\/summary$/, () => dendaRingkasan()],
  ['GET', /^\/penalty\/orders$/, (m, q) => dendaDaftar(q)],
  ['GET', /^\/penalty\/order\/([^/]+)$/, (m) => dendaPesanan(m[1])],
  ['POST', /^\/penalty\/order\/([^/]+)\/complete$/, (m, q) => dendaSelesaikan(m[1], q)],
  ['PATCH', /^\/penalty\/([^/]+)\/pay$/, (m) => dendaLunaskan(m[1])],

  // Laporan
  ['GET', /^\/reports\/dashboard$/, () => laporanDasbor()],
  ['GET', /^\/reports\/orders$/, (m, q) => laporanPesanan(q)],
  ['GET', /^\/reports\/rentals$/, (m, q) => laporanPenyewaan(q)],
  ['GET', /^\/reports\/utilization$/, (m, q) => laporanPemanfaatan(q)],
  ['GET', /^\/reports\/revenue$/, (m, q) => laporanPendapatan(q)],

  // Media (lihat catatan di atas)
  ['GET', /^\/media\/item\/([^/]+)$/, (m) => mediaDaftar(m[1])],
];

/** Ubah `?a=1&b=2` menjadi objek sederhana (nilai tetap string). */
function uraiKueri(jalur) {
  const idx = jalur.indexOf('?');
  if (idx === -1) return {};
  const hasil = {};
  for (const pasangan of jalur.slice(idx + 1).split('&')) {
    if (!pasangan) continue;
    const [k, v = ''] = pasangan.split('=');
    hasil[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return hasil;
}

/** Bungkus satu sel CSV: kutip bila mengandung koma, kutip, atau baris baru. */
function selCsv(nilai) {
  const teks = nilai === null || nilai === undefined ? '' : String(nilai);
  return /[",\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

/** Rangkai header + baris menjadi teks CSV (CRLF, sesuai kebiasaan CSV). */
function jadikanCsv(header, baris) {
  return [header, ...baris].map((r) => r.map(selCsv).join(',')).join('\r\n');
}

/**
 * Hasilkan isi CSV untuk endpoint ekspor laporan.
 *
 * Dipakai oleh `urlEkspor()` di client saat mode mock aktif. Endpoint ekspor
 * sengaja TIDAK berbentuk envelope JSON di backend (ia mengalirkan berkas),
 * sehingga tidak bisa dilayani lewat tabel rute biasa; sebagai gantinya berkas
 * dibuat di sisi peramban dan diserahkan sebagai blob URL.
 */
export function eksporCsvMock(kueri = {}) {
  const jenis = kueri.jenis || 'penyewaan';

  if (jenis === 'pemanfaatan') {
    const laporan = laporanPemanfaatan(kueri).data;
    return jadikanCsv(
      ['kode_barang', 'nama', 'jumlah_sewa', 'total_unit_hari', 'rasio_pemanfaatan', 'utilisasi_persen', 'pendapatan'],
      laporan.alat.map((a) => [
        a.kode_barang, a.nama, a.jumlah_sewa, a.total_unit_hari,
        a.rasio_pemanfaatan, a.utilisasi_persen, a.pendapatan,
      ])
    );
  }

  if (jenis === 'pendapatan') {
    const laporan = laporanPendapatan(kueri).data;
    return jadikanCsv(
      ['tanggal', 'jumlah_transaksi', 'nilai_sewa', 'nilai_denda'],
      laporan.rincian.map((r) => [
        r.tanggal, r.jumlah_transaksi, r.nilai_sewa, r.nilai_denda,
      ])
    );
  }

  // Bawaan: laporan penyewaan.
  const laporan = laporanPenyewaan(kueri).data;
  return jadikanCsv(
    ['kode_pesanan', 'tanggal_mulai', 'tanggal_selesai', 'pelanggan', 'jumlah_item', 'total', 'status'],
    laporan.pesanan.map((p) => [
      p.kode_pesanan, p.tanggal_mulai, p.tanggal_selesai, p.pelanggan,
      p.jumlah_item, p.total_akhir, p.status,
    ])
  );
}

/**
 * Titik masuk router mock.
 *
 * @param {string} jalur contoh '/catalog/items?q=tenda'
 * @param {object} [opsi] sama dengan opsi `panggil()`
 * @returns {Promise<object>} respons berenvelope
 */
export async function tanganiMock(jalur, { metode = 'GET', body } = {}) {
  const bersih = jalur.split('?')[0];
  const kueri = uraiKueri(jalur);

  await jeda();

  for (const [mtd, pola, penangan] of rute) {
    if (mtd !== metode) continue;
    const cocok = bersih.match(pola);
    if (cocok) {
      const hasil = penangan(cocok, kueri, body);
      // Beberapa penangan mengembalikan envelope galat dengan penanda status HTTP.
      if (hasil && hasil.status === 'error') {
        throw Object.assign(new Error(hasil.message), {
          code: hasil.code,
          status: hasil.status_http,
          details: hasil.details,
        });
      }
      return hasil;
    }
  }

  throw Object.assign(new Error(`Endpoint mock belum tersedia: ${metode} ${bersih}`), {
    code: 'MOCK_BELUM_ADA',
    status: 404,
  });
}
