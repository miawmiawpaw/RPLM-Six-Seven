# Product Requirements Document (PRD)
# Sistem Informasi Rental Alat Camping

| Atribut | Nilai |
| --- | --- |
| Nama Produk | Sistem Informasi Rental Alat Camping |
| Versi PRD | 1.0 |
| Tanggal | 28 September 2026 |
| Sumber Utama | `srs-app.md` v1.4 (Spesifikasi Kebutuhan Perangkat Lunak Multimedia) |
| Penyusun | Kelompok Six Seven — Fadlan Ahmad Kamil (Project Manager) |
| Status | Draft untuk ditinjau pemilik produk |

### Legenda Traceability

| Label | Arti |
| --- | --- |
| `[REQ-4.x.y]` | Requirement eksplisit dari SRS v1.4 — **otoritatif** |
| `[ASUMSI]` | Diasumsikan oleh penyusun PRD; **belum dikonfirmasi** ke pemilik produk |
| `[REKOMENDASI]` | Usulan penyusun PRD, bukan berasal dari SRS |
| `[KONTRADIKSI]` | Dua requirement/section yang saling bertentangan dan perlu keputusan |

> **Catatan penting:** PRD ini **tidak menggantikan** SRS. SRS tetap dokumen kontrak
> kebutuhan; PRD ini menerjemahkannya menjadi artefak siap implementasi (aktor, flow,
> halaman, data, aturan bisnis, acceptance criteria). Setiap kali SRS naik versi, PRD ini
> wajib ditinjau ulang — lihat §19.

---

## 1. Product Overview

### 1.1 Product Description

Aplikasi berbasis web yang mengelola proses penyewaan alat camping dan pendakian secara
digital. Pelanggan dapat mencari, memesan, dan membayar sewa alat secara mandiri
(*self-service*); pengelola rental dapat mengelola inventaris, jadwal ketersediaan,
transaksi pembayaran, serta proses serah-terima dan pengembalian alat. `[REQ-1.4]`

Sistem berjalan sebagai aplikasi tiga lapisan: React.js (klien), Node.js + Express.js
(REST API), MySQL 8.0+ (basis data). `[REQ-2.1, REQ-2.5, REQ-3.3]`

### 1.2 Problem Statement

Proses penyewaan saat ini dilakukan secara manual (berbasis kertas atau spreadsheet).
Akibatnya:

- Pencatatan transaksi lambat dan rawan kesalahan hitung.
- Ketersediaan alat tidak terpantau real-time, berisiko **satu unit dipesan dua kali**
  pada periode yang sama.
- Riwayat penyewaan dan perhitungan denda sulit ditelusuri.
- Jangkauan pemasaran terbatas pada pelanggan yang datang langsung.

### 1.3 Product Goal

Menggantikan proses pencatatan manual menjadi proses digital yang lebih **cepat, akurat,
dan minim kesalahan**, sekaligus memperluas jangkauan pemasaran kepada calon pelanggan
melalui akses daring. `[REQ-1.4]`

### 1.4 Target Users

| Segmen | Deskripsi | Tingkat Kepentingan |
| --- | --- | --- |
| Pelanggan (Penyewa) | Keluarga, komunitas, pekerja kantoran (*leisure camper*), pendaki gunung. Literasi digital bervariasi. Akses via browser. | Sangat penting — pengguna utama |
| Admin (Pengelola Rental) | Pemilik/pengelola bisnis persewaan. Mengelola inventaris, memverifikasi pembayaran, memantau transaksi. | Sangat penting — operasional katalog & stok |
| Petugas Lapangan | Staf rental yang menangani serah-terima dan pemeriksaan fisik alat. Menggunakan perangkat mobile. | Penting — operasional harian di lapangan |

`[REQ-2.3]`

---

## 2. Objectives

| ID | Objective | Indikator Keberhasilan | Trace |
| --- | --- | --- | --- |
| OBJ-01 | Digitalisasi proses sewa end-to-end | Seluruh 7 fitur inti (4.1–4.7) rilis dan dapat dipakai tanpa pencatatan manual paralel | REQ-1.4 |
| OBJ-02 | Menjamin satu unit alat tidak dipesan dobel pada periode beririsan | Tidak ditemukan kasus *double-booking* pada pengujian konkurensi | REQ-4.2.5 |
| OBJ-03 | Menyediakan perhitungan biaya sewa, denda, dan ganti rugi yang konsisten | Rincian biaya ditampilkan sebelum pelunasan pada setiap transaksi | REQ-4.2.7, REQ-4.7.3 |
| OBJ-04 | Menyediakan jejak audit atas aktivitas kritikal | Perubahan inventaris, status pembayaran, dan pembatalan tercatat lengkap | REQ-5.2, REQ-4.3.9 |
| OBJ-05 | Menjangkau pelanggan daring | Aplikasi dapat diakses dan dipakai penuh dari browser mobile tanpa instalasi | REQ-1.4, REQ-2.4 |

---

## 3. Actors & Roles

### 3.1 Definisi Aktor

| Aktor | Tipe | Goals | Modul yang Diakses | Aksi yang Diizinkan | Aksi yang Dibatasi |
| --- | --- | --- | --- | --- | --- |
| **Guest** (belum login) | Anonim | Melihat katalog, memutuskan sebelum mendaftar | Beranda, Katalog, Detail Barang, Registrasi, Login, Lupa Kata Sandi | Lihat katalog & detail, registrasi, login, lupa kata sandi | Checkout, lihat riwayat, bayar, akses dashboard `[ASUMSI]` |
| **Pelanggan** | Terautentikasi | Menyewa alat tanpa datang ke lokasi lebih dulu | Katalog, Keranjang, Checkout, Pembayaran, Riwayat Saya, Profil | Kelola keranjang, buat pesanan, bayar, lihat riwayat sendiri, batalkan pesanan belum bayar, bayar denda | Kelola inventaris, verifikasi pembayaran, lihat data pelanggan lain, akses laporan |
| **Admin** | Terautentikasi | Mengelola katalog, stok, transaksi, dan laporan usaha | Dashboard, Inventaris, Bundle, Verifikasi Pembayaran, Laporan, Pengaturan Tarif | CRUD alat, kelola bundle, atur tarif denda & ganti rugi, sesuaikan/bebaskan denda, lihat & ekspor laporan, ubah status kondisi alat | Melakukan serah-terima lapangan `[ASUMSI]`, mengubah data pelanggan `[ASUMSI]` |
| **Petugas Lapangan** | Terautentikasi | Menyerahkan & menerima alat dengan pencatatan kondisi yang benar | Daftar Pesanan Lapangan, Form Checklist Serah-Terima, Form Pengembalian | Lihat pesanan berstatus `DIBAYAR`/`SEDANG_DISEWA`, isi checklist, catat waktu pengembalian aktual & kondisi, ubah status ke `DISIAPKAN`/`SEDANG_DISEWA`/`DIKEMBALIKAN` | Kelola inventaris, ubah tarif, akses laporan & dashboard, verifikasi pembayaran |
| **Sistem** | Non-manusia | Menjaga konsistensi status & stok | — | Auto-cancel pesanan kedaluwarsa, lepas kunci stok, hitung ketersediaan, kirim notifikasi terjadwal, proses webhook | — |

`[REQ-2.3, REQ-4.6.5, REQ-5.5]`

### 3.2 Catatan Peran

- `[KONTRADIKSI-01]` SRS §2.2 menyebut "Registrasi dan login akun pelanggan **maupun
  petugas/admin**", tetapi §4.1 hanya mendeskripsikan pelanggan. **Belum ada requirement
  eksplisit** tentang: siapa yang boleh membuat akun admin/petugas, bagaimana akun tersebut
  dibuat, dan apakah ada *self-registration* untuk peran staf. Lihat §19 OQ-01.
- `[ASUMSI]` Admin dan Petugas **tidak** mendaftar sendiri; akun mereka dibuatkan oleh
  admin (atau di-seed saat implementasi awal) `[REQ-2.7 — data awal diinput admin]`.

### 3.3 Matriks Hak Akses (RBAC)

| Kapabilitas | Guest | Pelanggan | Petugas Lapangan | Admin |
| --- | :---: | :---: | :---: | :---: |
| Lihat katalog & detail barang | ✅ | ✅ | ✅ | ✅ |
| Registrasi / Login / Lupa kata sandi | ✅ | ✅ | ✅ | ✅ |
| Buat & kelola keranjang | ❌ | ✅ | ❌ | ❌ |
| Buat pesanan (checkout) | ❌ | ✅ | ❌ | ❌ |
| Bayar pesanan | ❌ | ✅ | ❌ | ❌ |
| Batalkan pesanan milik sendiri | ❌ | ✅ | ❌ | ❌ |
| Lihat riwayat pesanan sendiri | ❌ | ✅ | ❌ | ❌ |
| Lihat daftar pesanan lapangan | ❌ | ❌ | ✅ | ✅ |
| Isi checklist serah-terima / pengembalian | ❌ | ❌ | ✅ | ❌ `[ASUMSI]` |
| Ubah status kondisi fisik alat | ❌ | ❌ | ❌ | ✅ |
| CRUD data alat & bundle | ❌ | ❌ | ❌ | ✅ |
| Verifikasi pembayaran manual | ❌ | ❌ | ❌ | ✅ `[ASUMSI]` |
| Atur tarif denda & ganti rugi | ❌ | ❌ | ❌ | ✅ |
| Sesuaikan/bebaskan denda | ❌ | ❌ | ❌ | ✅ |
| Akses dashboard & laporan | ❌ | ❌ | ❌ | ✅ |

> **Catatan `[KONTRADIKSI-02]`:** REQ-4.6.5 melarang non-admin (termasuk Petugas) mengakses
> dashboard **dan** laporan. Namun SRS §3.1 menyatakan "Antarmuka admin menyediakan
> halaman verifikasi pembayaran", sementara §4.4.2 mengklaim pembaruan status pembayaran
> terjadi **otomatis via webhook**. Peran "verifikasi pembayaran" oleh admin belum jelas
> apakah masih dibutuhkan. Lihat §19 OQ-02.

---

## 4. Scope

### 4.1 In Scope (Rilis 1.0)

Katalog satuan & paket (bundle), keranjang, pemesanan, pembayaran daring, pengelolaan
inventaris, serah-terima & pengembalian, denda, dan laporan transaksi. `[REQ-1.4]`

| # | Modul | Fitur Sumber |
| --- | --- | --- |
| M1 | Autentikasi & Akun | 4.1 |
| M2 | Katalog, Keranjang & Pemesanan | 4.2 |
| M3 | Pengelolaan Inventaris & Bundle | 4.3 |
| M4 | Pembayaran Sewa | 4.4 |
| M5 | Serah-Terima & Pengembalian | 4.5 |
| M6 | Laporan & Riwayat | 4.6 |
| M7 | Denda & Ganti Rugi | 4.7 |

### 4.2 Out of Scope (Rilis 1.0)

Aplikasi mobile native, pengiriman alat (*delivery*), program loyalitas pelanggan, dan
multi-cabang/multi-gudang. `[REQ-1.4]`

Tambahan di luar lingkup `[REKOMENDASI]`:

- Pembayaran tunai/pada saat pengambilan di lokasi.
- Perpanjangan masa sewa di tengah periode sewa.
- *Chat* langsung antara pelanggan dan admin.
- Notifikasi WhatsApp.
- Manajemen denyut perawatan (*maintenance scheduling*) alat rusak.

---

## 5. User Stories

Format: *As a [actor], I want to [action], so that [benefit].*

### M1 — Autentikasi & Akun

| ID | User Story | Trace |
| --- | --- | --- |
| US-01 | Sebagai **Guest**, saya ingin mendaftar dengan email dan kata sandi, agar saya dapat mulai menyewa alat. | REQ-4.1.1 |
| US-02 | Sebagai **Guest**, saya ingin menerima email verifikasi, agar akun saya tidak disalahgunakan. | REQ-4.1.2 |
| US-03 | Sebagai **Pelanggan**, saya ingin diberi tahu bila email saya sudah terdaftar, agar saya bisa langsung login alih-alih mendaftar ulang. | REQ-4.1.3 |
| US-04 | Sebagai **Pelanggan**, saya ingin mereset kata sandi tanpa menghubungi admin, agar saya tetap bisa mengakses akun. | REQ-4.1.4 |
| US-05 | Sebagai **Pelanggan**, saya ingin akun saya terlindungi dari percobaan login berulang, agar data saya aman. | REQ-4.1.5 |

### M2 — Katalog, Keranjang & Pemesanan

| ID | User Story | Trace |
| --- | --- | --- |
| US-06 | Sebagai **Pelanggan**, saya ingin melihat katalog terpisah antara item satuan dan paket, agar mudah memilih sesuai kebutuhan. | REQ-4.2.1 |
| US-07 | Sebagai **Pelanggan**, saya ingin melihat isi sebuah paket beserta harganya, agar saya tahu apa yang saya dapat. | REQ-4.2.2 |
| US-08 | Sebagai **Pelanggan**, saya ingin menggabungkan paket dan item satuan dalam satu pesanan, agar tidak perlu membuat dua pesanan. | REQ-4.2.3 |
| US-09 | Sebagai **Pelanggan**, saya ingin paket yang tidak lengkap ditandai tidak tersedia, agar saya tidak memesan sesuatu yang tidak bisa disiapkan. | REQ-4.2.4 |
| US-10 | Sebagai **Pelanggan**, saya ingin melihat stok yang benar-benar tersedia pada tanggal saya, agar tidak kecewa setelah memesan. | REQ-4.2.5 |
| US-11 | Sebagai **Pelanggan**, saya ingin stok saya dijamin selama proses pemesanan, agar alat tidak diambil orang lain di tengah jalan. | REQ-4.2.6 |
| US-12 | Sebagai **Pelanggan**, saya ingin melihat estimasi biaya sebelum konfirmasi, agar tidak ada kejutan di halaman pembayaran. | REQ-4.2.7 |
| US-13 | Sebagai **Pelanggan**, saya ingin dicegah bila jumlah pesanan saya melebihi stok, agar pesanan saya pasti dapat dipenuhi. | REQ-4.2.8 |
| US-14 | Sebagai **Pelanggan**, saya ingin keranjang saya tetap tersimpan, agar saya bisa lanjut memesan nanti. | REQ-4.2.9 |

### M3 — Pengelolaan Inventaris & Bundle

| ID | User Story | Trace |
| --- | --- | --- |
| US-15 | Sebagai **Admin**, saya ingin mengelola data alat lengkap dengan foto/video, agar pelanggan mendapat informasi yang jelas. | REQ-4.3.1 |
| US-16 | Sebagai **Admin**, saya ingin mengubah status kondisi alat secara manual, agar alat rusak tidak disewakan. | REQ-4.3.2 |
| US-17 | Sebagai **Admin**, saya ingin dicegah menghapus alat yang masih tersewa, agar riwayat transaksi tetap utuh. | REQ-4.3.3 |
| US-18 | Sebagai **Admin**, saya ingin melihat riwayat penyewaan per kode barang, agar saya tahu performa tiap unit. | REQ-4.3.4 |
| US-19 | Sebagai **Admin**, saya ingin merakit paket dari item satuan yang sudah ada, agar pembuatan paket cepat. | REQ-4.3.5 |
| US-20 | Sebagai **Admin**, saya ingin menentukan harga khusus paket, agar paket lebih menarik dari pembelian satuan. | REQ-4.3.6 |
| US-21 | Sebagai **Admin**, saya ingin stok komponen paket berkurang otomatis saat paket dipesan, agar stok selalu akurat. | REQ-4.3.7 |
| US-22 | Sebagai **Admin**, saya ingin dicegah menghapus item yang jadi komponen paket aktif, agar paket tidak rusak. | REQ-4.3.8 |
| US-23 | Sebagai **Admin**, saya ingin setiap perubahan inventaris tercatat, agar dapat diaudit. | REQ-4.3.9 |
| US-24 | Sebagai **Admin**, saya ingin diperingatkan saat stok menipis, agar bisa segera menambah stok. | REQ-4.3.10 |

### M4 — Pembayaran Sewa

| ID | User Story | Trace |
| --- | --- | --- |
| US-25 | Sebagai **Pelanggan**, saya ingin membayar via transfer bank atau e-wallet, agar sesuai preferensi saya. | REQ-4.4.1 |
| US-26 | Sebagai **Pelanggan**, saya ingin status pesanan saya diperbarui otomatis setelah membayar, agar tidak perlu konfirmasi manual. | REQ-4.4.2 |
| US-27 | Sebagai **Pelanggan**, saya ingin tahu batas waktu pembayaran, agar pesanan tidak hangus tanpa saya sadari. | REQ-4.4.3 |
| US-28 | Sebagai **Pelanggan**, saya ingin melihat rincian biaya saat membayar, agar saya yakin nominalnya benar. | REQ-4.4.4 |
| US-29 | Sebagai **Pelanggan**, saya ingin notifikasi konfirmasi setelah pembayaran terverifikasi, agar saya tenang. | REQ-4.4.6 |

### M5 — Serah-Terima & Pengembalian

| ID | User Story | Trace |
| --- | --- | --- |
| US-30 | Sebagai **Petugas Lapangan**, saya ingin mengisi checklist kondisi & kelengkapan saat serah terima, agar status alat terdokumentasi. | REQ-4.5.1 |
| US-31 | Sebagai **Petugas Lapangan**, saya ingin sistem menghitung denda & ganti rugi otomatis, agar tidak perlu hitung manual. | REQ-4.5.2 |
| US-32 | Sebagai **Admin**, saya ingin stok bertambah otomatis setelah pengembalian, kecuali alat rusak, agar ketersediaan akurat. | REQ-4.5.3 |
| US-33 | Sebagai **Admin**, saya ingin dokumentasi serah-terima tersimpan, agar dapat ditelusuri bila ada sengketa. | REQ-4.5.4 |
| US-34 | Sebagai **Pelanggan**, saya ingin diingatkan sebelum tanggal pengembalian, agar saya tidak terkena denda. | REQ-4.5.5 |

### M6 — Laporan & Riwayat

| ID | User Story | Trace |
| --- | --- | --- |
| US-35 | Sebagai **Admin**, saya ingin memfilter laporan transaksi, agar dapat menganalisis periode tertentu. | REQ-4.6.1 |
| US-36 | Sebagai **Admin**, saya ingin melihat ringkasan pendapatan, pesanan, alat tersewa, dan total denda, agar tahu kinerja usaha. | REQ-4.6.2 |
| US-37 | Sebagai **Pelanggan**, saya ingin melihat riwayat penyewaan saya, agar dapat melacak status pesanan. | REQ-4.6.3 |
| US-38 | Sebagai **Admin**, saya ingin mengekspor laporan ke CSV/Excel, agar dapat diolah di luar sistem. | REQ-4.6.4 |
| US-39 | Sebagai **Admin**, saya ingin laporan hanya dapat diakses admin, agar data keuangan aman. | REQ-4.6.5 |

### M7 — Denda & Ganti Rugi

| ID | User Story | Trace |
| --- | --- | --- |
| US-40 | Sebagai **Admin**, saya ingin mengatur tarif denda per jam dan per hari, agar penagihan sesuai kebijakan usaha. | REQ-4.7.1 |
| US-41 | Sebagai **Admin**, saya ingin menetapkan biaya ganti rugi per alat, agar kerusakan/kehilangan tergantikan. | REQ-4.7.2 |
| US-42 | Sebagai **Pelanggan**, saya ingin melihat rincian komponen biaya tambahan, agar saya tahu apa yang saya bayar. | REQ-4.7.3 |
| US-43 | Sebagai **Pelanggan**, saya ingin membayar denda secara daring, agar tidak perlu ke lokasi. | REQ-4.7.4 |
| US-44 | Sebagai **Admin**, saya ingin menyesuaikan/membebaskan denda dengan alasan tercatat, agar ada keleluasaan dengan tetap auditable. | REQ-4.7.5 |

---

## 6. Functional Requirements

### 6.1 Ketentuan Umum

- Seluruh **FR** diturunkan langsung dari `REQ-*` pada SRS v1.4. Nomor `REQ` asli
  dipertahankan sebagai kolom trace agar tidak terjadi kehilangan jejak.
- Prioritas SRS dipetakan ke skema MoSCoW (§17) mengikuti aturan:
  Tinggi → **Must Have**, Sedang → **Should Have**, Rendah → **Could Have**.

### 6.2 Matriks Functional Requirements

#### M1 — Autentikasi & Akun

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-001 | Sistem harus menyediakan formulir registrasi dengan validasi format email dan kekuatan kata sandi minimal 8 karakter. | Must | REQ-4.1.1 |
| FR-002 | Sistem harus mengirim email verifikasi setelah pendaftaran berhasil dan menonaktifkan login sebelum akun terverifikasi. | Must | REQ-4.1.2 |
| FR-003 | Sistem harus menampilkan pesan kesalahan yang jelas apabila email sudah terdaftar. | Must | REQ-4.1.3 |
| FR-004 | Sistem harus menyediakan fitur "lupa kata sandi" untuk mengatur ulang kata sandi melalui email. | Must | REQ-4.1.4 |
| FR-005 | Sistem harus membatasi percobaan login gagal maksimal 5 kali dalam 15 menit per akun untuk mencegah *brute-force*. | Must | REQ-4.1.5 |
| FR-006 | Sistem harus mengarahkan pengguna ke halaman beranda/daftar pesanan sesuai perannya setelah login berhasil. `[ASUMSI]` | Must | REQ-4.1.2 |

#### M2 — Katalog, Keranjang & Pemesanan

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-007 | Sistem harus menampilkan katalog yang terbagi antara penyewaan item satuan dan penyewaan paket (bundle). | Must | REQ-4.2.1 |
| FR-008 | Sistem harus menampilkan rincian item yang termasuk dalam sebuah paket bundle beserta harga total paket. | Must | REQ-4.2.2 |
| FR-009 | Sistem harus memungkinkan penambahan paket bundle dan item satuan ke dalam satu keranjang pesanan. | Must | REQ-4.2.3 |
| FR-010 | Sistem harus memfilter ketersediaan paket bundle secara dinamis berdasarkan ketersediaan tiap item satuan penyusunnya pada tanggal yang dipilih. | Must | REQ-4.2.4 |
| FR-011 | Sistem harus menghitung ketersediaan per rentang tanggal dengan rumus `stok tersedia = stok fisik − Σ unit terikat pesanan berstatus aktif pada rentang beririsan`. Status aktif: `MENUNGGU_PEMBAYARAN`, `DIBAYAR`, `DISIAPKAN`, `SEDANG_DISEWA`. | Must | REQ-4.2.5 |
| FR-012 | Sistem harus mengunci stok item satuan dan/atau komponen bundle saat pesanan dibuat, dan melepas kunci secara otomatis bila pesanan dibatalkan atau kedaluwarsa. | Must | REQ-4.2.6 |
| FR-013 | Sistem harus menghitung estimasi biaya sewa = `tarif harian × jumlah hari (inklusif) × kuantitas + biaya tambahan`, dan menampilkannya sebelum pelanggan mengonfirmasi pesanan. | Must | REQ-4.2.7 |
| FR-014 | Sistem harus mencegah konfirmasi pesanan bila jumlah melebihi stok tersedia, dan menampilkan pesan kekurangan stok. | Must | REQ-4.2.8 |
| FR-015 | Sistem harus menyimpan item keranjang dan/atau draf pesanan bila pelanggan keluar sebelum menyelesaikan pemesanan. | Could | REQ-4.2.9 |
| FR-016 | Sistem harus mewajibkan pelanggan terautentikasi sebelum dapat melakukan checkout. `[ASUMSI]` | Must | REQ-4.2.3 `[REKOMENDASI]` |

#### M3 — Pengelolaan Inventaris & Bundle

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-017 | Sistem harus menyediakan formulir tambah/ubah/hapus data alat (kategori, merk, nama, stok, tarif, beberapa foto dan video). | Must | REQ-4.3.1 |
| FR-018 | Sistem harus memungkinkan admin mengubah status kondisi fisik alat: Tersedia, Sedang Disewa, Rusak/Perlu Perbaikan, Hilang. | Must | REQ-4.3.2 |
| FR-019 | Sistem harus mencegah penghapusan data alat yang masih tercantum dalam transaksi sewa aktif. | Must | REQ-4.3.3 |
| FR-020 | Sistem harus menampilkan riwayat penyewaan untuk masing-masing kode barang. | Should | REQ-4.3.4 |
| FR-021 | Sistem harus menyediakan antarmuka untuk merakit paket bundle dari beberapa kode barang yang sudah ada. | Must | REQ-4.3.5 |
| FR-022 | Sistem harus memungkinkan admin menentukan harga khusus untuk paket bundle. | Must | REQ-4.3.6 |
| FR-023 | Sistem harus mengurangi/mengunci stok item satuan penyusun secara otomatis ketika paket bundle dipesan. | Must | REQ-4.3.7 |
| FR-024 | Sistem harus mencegah admin menghapus item satuan yang masih menjadi komponen paket bundle aktif. | Should | REQ-4.3.8 |
| FR-025 | Sistem harus mencatat (log) setiap penambahan, perubahan, dan penghapusan data inventaris beserta identitas admin dan waktu. | Should | REQ-4.3.9 |
| FR-026 | Sistem harus menampilkan peringatan kepada admin ketika stok fisik berada pada/di bawah ambang batas minimum. | Could | REQ-4.3.10 |
| FR-027 | Sistem harus memungkinkan admin mengatur nilai ambang batas minimum stok, baik per alat maupun nilai default global. `[REKOMENDASI]` | Could | REQ-4.3.10 |

#### M4 — Pembayaran Sewa

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-028 | Sistem harus terintegrasi dengan payment gateway pihak ketiga yang mendukung transfer bank dan e-wallet. | Must | REQ-4.4.1 |
| FR-029 | Sistem harus memperbarui status pesanan secara otomatis berdasarkan webhook payment gateway, setelah memverifikasi keaslian signature. | Must | REQ-4.4.2 |
| FR-030 | Sistem harus menampilkan batas waktu pembayaran (default 1×24 jam) dan membatalkan otomatis pesanan yang tidak dibayar hingga batas waktu. | Must | REQ-4.4.3 |
| FR-031 | Sistem harus menampilkan ringkasan rincian biaya (per item, biaya tambahan, total) pada halaman pembayaran. | Must | REQ-4.4.4 |
| FR-032 | Sistem harus menyimpan riwayat setiap percobaan pembayaran beserta status, waktu, metode, dan referensi transaksi gateway. | Should | REQ-4.4.5 |
| FR-033 | Sistem harus mengirim notifikasi konfirmasi kepada pelanggan setelah pembayaran terverifikasi. | Must | REQ-4.4.6 |
| FR-034 | Sistem harus menangani webhook secara idempoten, sehingga notifikasi berulang tidak menggandakan perubahan status atau pencatatan transaksi. | Should | REQ-4.4.7 |
| FR-035 | Sistem harus menyediakan mekanisme pengecekan status pembayaran manual dan rekonsiliasi untuk kasus webhook tidak pernah diterima. `[REKOMENDASI]` | Should | — *(celah SRS §4.4)* |

#### M5 — Serah-Terima & Pengembalian

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-036 | Sistem harus menyediakan formulir/checklist pencatatan kondisi dan kelengkapan setiap komponen alat pada saat serah terima dan pengembalian. | Should | REQ-4.5.1 |
| FR-037 | Sistem harus memicu perhitungan denda dan/atau biaya ganti rugi berdasarkan waktu pengembalian aktual dan kondisi alat yang diinput petugas. | Should | REQ-4.5.2 |
| FR-038 | Sistem harus menambah kembali stok ketersediaan alat secara otomatis setelah pengembalian dicatat, kecuali alat ditandai perlu perbaikan/rusak. | Should | REQ-4.5.3 |
| FR-039 | Sistem harus menyimpan dokumentasi hasil serah terima dan pengembalian: waktu, identitas petugas, checklist kondisi, foto alat (bila tersedia). | Should | REQ-4.5.4 |
| FR-040 | Sistem harus mengirim pengingat pengembalian kepada pelanggan sebelum tanggal pengembalian yang disepakati. | Could | REQ-4.5.5 |
| FR-041 | Sistem harus memungkinkan Petugas Lapangan memindahkan status pesanan `DIBAYAR` → `DISIAPKAN` → `SEDANG_DISEWA` dan `SEDANG_DISEWA` → `DIKEMBALIKAN`. | Should | REQ-4.5.2, SRS §2.8 |

#### M6 — Laporan & Riwayat

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-042 | Sistem harus menyediakan laporan transaksi yang dapat difilter berdasarkan rentang tanggal, status pesanan, kategori alat, dan metode pembayaran. | Should | REQ-4.6.1 |
| FR-043 | Sistem harus menampilkan ringkasan pendapatan, jumlah pesanan, jumlah alat tersewa, dan total denda pada periode terpilih. | Should | REQ-4.6.2 |
| FR-044 | Sistem harus menyediakan riwayat penyewaan bagi pelanggan: daftar pesanan, detail alat, dan status terkini. | Should | REQ-4.6.3 |
| FR-045 | Sistem harus memungkinkan admin mengekspor laporan transaksi ke CSV atau Excel. | Could | REQ-4.6.4 |
| FR-046 | Sistem harus membatasi akses laporan dan dashboard hanya untuk peran admin. | Must | REQ-4.6.5 |

#### M7 — Denda & Ganti Rugi

| FR | Requirement | Prioritas | Trace |
| --- | --- | --- | --- |
| FR-047 | Sistem harus menghitung denda keterlambatan berdasarkan tarif yang dapat diatur admin, dengan tarif berbeda untuk satuan jam dan satuan hari. | Should | REQ-4.7.1 |
| FR-048 | Sistem harus memungkinkan admin menentukan besaran biaya ganti rugi per alat untuk kondisi rusak berat atau hilang. | Should | REQ-4.7.2 |
| FR-049 | Sistem harus menampilkan rincian komponen biaya tambahan (durasi keterlambatan, denda, kerusakan/kehilangan, ganti rugi, total) sebelum pelunasan. | Should | REQ-4.7.3 |
| FR-050 | Sistem harus menyediakan mekanisme pembayaran daring untuk denda dan biaya ganti rugi. | Should | REQ-4.7.4 |
| FR-051 | Sistem harus memungkinkan admin menyesuaikan atau membebaskan denda, dengan mencatat alasan penyesuaian sebagai jejak audit. | Could | REQ-4.7.5 |

**Total FR: 51** (46 diturunkan dari 46 REQ; +5 tambahan `[REKOMENDASI]`/`[ASUMSI]` bertanda).

---

## 7. Non-Functional Requirements

| NFR | Kategori | Requirement | Trace |
| --- | --- | --- | --- |
| NFR-001 | Performance | Waktu muat halaman utama ≤ 3 detik pada koneksi 4G. | REQ-5.1 |
| NFR-002 | Performance | Sistem harus menangani minimal 200 pengguna aktif bersamaan tanpa penurunan performa berarti. | REQ-5.1 |
| NFR-003 | Performance | Respons REST API: operasi baca ≤ 1 detik, operasi tulis ≤ 3 detik pada beban normal. | REQ-5.1 |
| NFR-004 | Reliability | Uptime minimal 99%. | REQ-5.4 |
| NFR-005 | Safety | Validasi seluruh input pengguna untuk mencegah kesalahan data yang berujung kerugian finansial. | REQ-5.2 |
| NFR-006 | Safety | Backup basis data harian otomatis dengan retensi minimal 7 hari. | REQ-5.2 |
| NFR-007 | Auditability | Mencatat jejak audit untuk aktivitas kritikal: perubahan inventaris, perubahan status pembayaran, pembatalan pesanan. | REQ-5.2 |
| NFR-008 | Security | Kata sandi disimpan terenkripsi (bcrypt atau setara). | REQ-5.3 |
| NFR-009 | Security | Seluruh komunikasi wajib HTTPS. | REQ-5.3 |
| NFR-010 | Security | Menerapkan *role-based access control*. | REQ-5.3 |
| NFR-011 | Security | Pembayaran ditangani payment gateway bersertifikasi PCI-DSS. | REQ-5.3 |
| NFR-012 | Security | Token JWT memiliki masa berlaku terbatas dan dapat diperbarui (*refresh*). | REQ-5.3 |
| NFR-013 | Security | Endpoint webhook diverifikasi dengan signature key dan hanya menerima permintaan dari layanan gateway yang sah. | REQ-5.3 |
| NFR-014 | Portability | Responsive design; berjalan pada Chrome, Firefox, Safari, Edge di desktop dan mobile. | REQ-2.4, REQ-5.4 |
| NFR-015 | Usability | Alur pemesanan dapat diselesaikan dalam langkah terbatas; antarmuka intuitif tanpa pelatihan khusus. | REQ-5.4, REQ-3.1 |
| NFR-016 | Maintainability | Struktur MVC/REST API dengan pemisahan tanggung jawab yang jelas. | REQ-5.4 |
| NFR-017 | Scalability | Kapasitas dapat ditingkatkan untuk mendukung pertumbuhan jumlah alat dan transaksi. | REQ-5.4 |
| NFR-018 | Usability | Tombol dan label menggunakan Bahasa Indonesia yang sederhana. | REQ-3.1 |
| NFR-019 | Timezone | Seluruh data transaksi menggunakan Waktu Indonesia Barat (UTC+7). | REQ-2.5 |

> **[REKOMENDASI]** NFR-002 ("tanpa penurunan performa yang signifikan") pada SRS tidak
> testable. Usulan kuantifikasi: *pada 200 pengguna bersamaan, p95 waktu respons API tetap
> ≤ 3 detik dan tidak ada error rate > 1%*. Keputusan ada di pemilik produk — lihat §19 OQ-03.

---

## 8. Feature Specifications

Struktur: Purpose, Actor, Preconditions, Inputs, Process, Business Rules, Success State,
Error/Failure States, Dependencies.

### F-4.1 — Registrasi dan Login Pengguna

| Aspek | Detail |
| --- | --- |
| **Purpose** | Memungkinkan pembuatan akun dan autentikasi sebagai gerbang seluruh aksi yang butuh identitas. |
| **Actor** | Guest (registrasi/login), Pelanggan/Petugas/Admin (login) |
| **Preconditions** | Guest belum terautentikasi. Untuk login: akun sudah terverifikasi. |
| **Inputs** | Nama, email, nomor telepon, kata sandi (registrasi); email + kata sandi (login); email (lupa kata sandi); token reset + kata sandi baru |

**Process — Registrasi:**
1. Guest mengisi formulir registrasi.
2. Sistem memvalidasi format email, kekuatan kata sandi (≥8 karakter), dan uniknya email.
3. Bila valid → sistem membuat akun berstatus **belum terverifikasi** dan mengirim email verifikasi.
4. Guest membuka tautan verifikasi → akun menjadi **aktif**.
5. Login sebelum verifikasi → ditolak.

**Process — Login:**
1. Pengguna mengisi email + kata sandi.
2. Sistem memeriksa keberadaan akun, status verifikasi, dan kecocokan kata sandi.
3. Sistem menghitung percobaan gagal dalam 15 menit terakhir.
4. Jika berhasil → menerbitkan JWT dan mengarahkan sesuai peran.
5. Jika gagal → menambah penghitung gagal dan menampilkan pesan generik.

**Process — Lupa Kata Sandi:**
1. Pengguna memasukkan email.
2. Sistem mengirim tautan reset (berlaku terbatas `[ASUMSI]`).
3. Pengguna menetapkan kata sandi baru.
4. Sistem mengonfirmasi perubahan dan mencabut sesi lama `[REKOMENDASI]`.

**Business Rules:** BR-001, BR-002, BR-003, BR-004
**Success State:** Pengguna terautentikasi menerima JWT dan berada pada halaman sesuai perannya.
**Error States:** email sudah terdaftar; format email tidak valid; kata sandi <8 karakter; akun belum terverifikasi; kredensial salah; akun terkunci sementara (5× gagal); token reset kedaluwarsa/tidak valid.
**Dependencies:** Layanan email pihak ketiga `[REQ-2.7]`.

---

### F-4.2 — Pencarian dan Pemesanan Alat Camping

| Aspek | Detail |
| --- | --- |
| **Purpose** | Memungkinkan pelanggan menemukan alat yang benar-benar tersedia pada tanggal yang diinginkan dan memesan secara mandiri. |
| **Actor** | Pelanggan (Guest dapat melihat katalog `[ASUMSI]`) |
| **Preconditions** | Katalog terisi; admin sudah menetapkan stok dan tarif. |
| **Inputs** | Rentang tanggal (mulai, selesai), kategori, item satuan/bundle, kuantitas |

**Process:**
1. Pelanggan memasukkan rentang tanggal → sistem menghitung `stok tersedia` per item per tanggal (FR-011).
2. Sistem menampilkan item satuan dan bundle yang tersedia; bundle dianggap tersedia hanya bila **seluruh** komponennya tersedia (FR-010).
3. Pelanggan menambahkan item/bundle ke keranjang. **Belum ada kunci stok.**
4. Pelanggan membuka checkout → sistem menghitung estimasi biaya (FR-013) dan menampilkan rincian.
5. Pelanggan mengonfirmasi → sistem memeriksa ulang ketersediaan secara atomik.
   - Jika stok cukup → buat pesanan `MENUNGGU_PEMBAYARAN`, **kunci stok**, catat tanggal kedaluwarsa.
   - Jika stok kurang → tolak dengan pesan kekurangan stok (FR-014).
6. Sistem mengarahkan pelanggan ke halaman pembayaran.

**Business Rules:** BR-005, BR-006, BR-007, BR-008, BR-009, BR-010
**Success State:** Pesanan `MENUNGGU_PEMBAYARAN` terbuat, stok terkunci, pelanggan di halaman pembayaran.
**Error States:** tanggal tidak valid (selesai < mulai); item tidak tersedia pada tanggal dipilih; kuantitas melebihi stok; bundle tidak lengkap; keranjang kosong; harga berubah sejak item ditambahkan `[KONTRADIKSI-03 — lihat §15]`.
**Dependencies:** F-4.3 (data katalog & stok), F-4.4 (pembayaran), F-4.7 (biaya tambahan).

---

### F-4.3 — Pengelolaan Inventaris Alat Camping

| Aspek | Detail |
| --- | --- |
| **Purpose** | Menjaga akurasi katalog, stok, dan komposisi paket sebagai fondasi seluruh transaksi. |
| **Actor** | Admin |
| **Preconditions** | Admin terautentikasi dengan peran admin. |
| **Inputs** | Kategori, merk, nama barang, stok fisik, tarif sewa harian, beberapa foto & video, status kondisi; nama bundle, komponen bundle, harga khusus bundle |

**Process:**
1. Admin menambah/mengubah alat → sistem memvalidasi → menyimpan → memperbarui katalog.
2. Admin mengubah status kondisi alat → sistem memperbarui ketersediaan pada katalog.
3. Admin merakit bundle → memilih item satuan, menentukan kuantitas per komponen, menetapkan harga khusus.
4. Sistem memvalidasi bahwa harga bundle wajar dan komponennya ada & aktif `[REKOMENDASI]`.
5. Setiap perubahan dicatat ke log audit (FR-025).

**Business Rules:** BR-011, BR-012, BR-013, BR-014
**Success State:** Data tersimpan, katalog dan ketersediaan diperbarui, log audit tercatat.
**Error States:** input tidak lengkap; tarif negatif/nol; stok negatif; hapus alat yang terikat transaksi aktif; hapus item yang jadi komponen bundle aktif; bundle tanpa komponen `[REKOMENDASI]`.
**Dependencies:** F-4.2, F-4.5, F-4.6.

---

### F-4.4 — Pembayaran Sewa

| Aspek | Detail |
| --- | --- |
| **Purpose** | Mengubah pesanan `MENUNGGU_PEMBAYARAN` menjadi `DIBAYAR` secara otomatis dan aman. |
| **Actor** | Pelanggan (membayar), Sistem (memproses webhook), Admin (rekonsiliasi `[REKOMENDASI]`) |
| **Preconditions** | Pesanan ada, berstatus `MENUNGGU_PEMBAYARAN`, dan belum melewati batas waktu. |
| **Inputs** | Pilihan metode pembayaran; webhook dari gateway (referensi transaksi, status, signature) |

**Process:**
1. Pelanggan memilih metode pembayaran → sistem membuat transaksi ke gateway → gateway menampilkan instruksi.
2. Pelanggan menyelesaikan pembayaran.
3. Gateway mengirim webhook → sistem verifikasi signature (FR-029) → proses idempoten (FR-034) → ubah status ke `DIBAYAR`.
4. Sistem mengirim notifikasi konfirmasi (FR-033).
5. Bila batas waktu terlewat tanpa pembayaran → sistem ubah status ke `GAGAL_KEDALUWARSA`, lepas kunci stok, kirim notifikasi pembatalan.

**Business Rules:** BR-015, BR-016, BR-017, BR-018
**Success State:** Status `DIBAYAR`, stok tetap terkunci, notifikasi terkirim, riwayat pembayaran tersimpan.
**Error States:** webhook signature tidak valid; webhook duplikat; gateway timeout; pembayaran gagal; webhook tidak pernah datang (butuh rekonsiliasi manual — FR-035).
**Dependencies:** F-4.2, payment gateway, layanan email.

---

### F-4.5 — Serah-Terima dan Pengembalian Alat Camping

| Aspek | Detail |
| --- | --- |
| **Purpose** | Mendokumentasikan kondisi fisik alat saat keluar dan kembali, sebagai dasar perhitungan denda & ganti rugi. |
| **Actor** | Petugas Lapangan; Pelanggan (mengonfirmasi) |
| **Preconditions** | Pesanan berstatus `DIBAYAR` (untuk serah terima) atau `SEDANG_DISEWA` (untuk pengembalian). |
| **Inputs** | Checklist kondisi & kelengkapan per komponen, foto alat (opsional), waktu serah terima/pengembalian aktual, catatan kerusakan/kehilangan |

**Process — Serah Terima:**
1. Petugas membuka daftar pesanan `DIBAYAR`.
2. Petugas memindahkan status ke `DISIAPKAN` (menyiapkan alat).
3. Petugas mengisi checklist kondisi & kelengkapan tiap komponen.
4. Pelanggan mengonfirmasi penerimaan.
5. Sistem mengubah status ke `SEDANG_DISEWA` dan menyimpan dokumentasi.

**Process — Pengembalian:**
1. Petugas mengisi checklist kondisi pengembalian dan mencatat keterlambatan/kerusakan/kehilangan.
2. Sistem memicu perhitungan denda & ganti rugi (F-4.7).
3. Sistem mengubah status ke `DIKEMBALIKAN`.
4. Sistem menambah kembali stok alat yang layak sewa; alat rusak/hilang **tidak** dikembalikan ke stok (FR-038).
5. Bila tidak ada biaya tambahan → status `SELESAI`. Bila ada → menunggu pelunasan (F-4.7).

**Business Rules:** BR-019, BR-020, BR-021, BR-022
**Success State:** Dokumentasi tersimpan, status berpindah sesuai state machine, stok yang layak tersedia kembali.
**Error States:** pesanan belum `DIBAYAR`; checklist belum lengkap; waktu pengembalian lebih awal dari waktu serah terima; komponen hilang tanpa catatan.
**Dependencies:** **F-4.7 (wajib rilis bersamaan)** `[REQ-2.7]`, F-4.4.

---

### F-4.6 — Laporan Transaksi dan Riwayat Penyewaan

| Aspek | Detail |
| --- | --- |
| **Purpose** | Memberi admin visibilitas kinerja usaha dan memberi pelanggan transparansi status pesanan. |
| **Actor** | Admin (laporan & dashboard), Pelanggan (riwayat sendiri) |
| **Preconditions** | Admin terautentikasi (untuk laporan); pelanggan terautentikasi (untuk riwayat sendiri). |
| **Inputs** | Rentang tanggal, status pesanan, kategori alat, metode pembayaran, format ekspor |

**Process:**
1. Admin membuka dashboard → sistem menampilkan ringkasan pesanan, pendapatan, status terbaru.
2. Admin menerapkan filter → sistem menampilkan daftar transaksi sesuai filter.
3. Admin mengekspor hasil ke CSV/Excel.
4. Pelanggan membuka "Riwayat Saya" → sistem menampilkan **hanya** pesanan miliknya.

**Business Rules:** BR-023, BR-024, BR-025
**Success State:** Laporan/riwayat tampil akurat sesuai filter; berkas ekspor terunduh.
**Error States:** rentang tanggal tidak valid; tidak ada data pada periode terpilih (*empty state*); akses non-admin ditolak (403); ekspor gagal (timeout berkas besar) `[REKOMENDASI]`.
**Dependencies:** F-4.2, F-4.4, F-4.5, F-4.7.

---

### F-4.7 — Denda Keterlambatan dan Biaya Ganti Rugi

| Aspek | Detail |
| --- | --- |
| **Purpose** | Menghitung dan menagih konsekuensi finansial dari keterlambatan, kerusakan, atau kehilangan alat secara konsisten. |
| **Actor** | Admin (mengatur tarif, menyesuaikan), Petugas Lapangan (memicu lewat input kondisi), Pelanggan (membayar) |
| **Preconditions** | Pesanan berstatus `SEDANG_DISEWA` dan alat sedang dikembalikan. |
| **Inputs** | Waktu pengembalian aktual, kondisi per komponen, tarif denda per jam/hari (admin), biaya ganti rugi per alat (admin) |

**Process:**
1. Petugas mencatat waktu pengembalian aktual dan kondisi alat.
2. Sistem membandingkan dengan waktu yang disepakati → menghitung durasi keterlambatan.
3. Sistem menghitung denda (per jam atau per hari sesuai aturan) dan/atau biaya ganti rugi.
4. Sistem menampilkan rincian komponen biaya kepada petugas dan pelanggan.
5. Pelanggan membayar daring → sistem mencatat pelunasan → status `SELESAI`.
6. Admin dapat menyesuaikan/membebaskan denda dengan mencatat alasan (jejak audit).

**Business Rules:** BR-026, BR-027, BR-028, BR-029
**Success State:** Rincian biaya tampil, pelunasan tercatat, pesanan `SELESAI`.
**Error States:** tarif denda belum diatur admin `[KONTRADIKSI-04]`; waktu pengembalian tidak valid; pembayaran denda gagal; penyesuaian denda tanpa alasan.
**Dependencies:** F-4.5 (**dua arah**), F-4.4 (mekanisme pembayaran).

---

## 9. User Flows

Format: `User Action → System Response → Condition → Next State`

### 9.1 Flow Autentikasi

```
[Guest] Buka halaman Registrasi
  → Sistem tampilkan formulir
  → [INPUT] submit data
      → [VALIDASI GAGAL] → tampil error → STATE: tetap di Registrasi
      → [EMAIL SUDAH ADA] → tampil pesan + tautan Login → STATE: Registrasi
      → [VALID] → buat akun (belum terverifikasi) + kirim email → STATE: Cek Email
[Guest] Klik tautan verifikasi
  → [TOKEN VALID] → akun aktif → STATE: Bisa Login
  → [TOKEN KEDALUWARSA] → tampil pesan + opsi kirim ulang → STATE: Cek Email
[Pengguna] Login
  → [BELUM TERVERIFIKASI] → tolak + pesan → STATE: Login
  → [KREDENSIAL SALAH, gagal <5x] → tampil pesan generik → STATE: Login
  → [KREDENSIAL SALAH, gagal =5x dlm 15 mnt] → kunci sementara 15 mnt → STATE: Terkunci
  → [VALID] → terbitkan JWT → arahkan sesuai peran:
        Pelanggan → Beranda/Katalog
        Petugas   → Daftar Pesanan Lapangan
        Admin     → Dashboard
```

### 9.2 Flow Pemesanan → Pembayaran → Serah Terima → Pengembalian (utama, *happy path*)

```
[Pelanggan] Buka Katalog
  → [BELUM LOGIN] → boleh lihat katalog → STATE: Katalog
  → [LOGIN] → STATE: Katalog
[Pelanggan] Isi rentang tanggal
  → Sistem hitung stok tersedia per tanggal (FR-011)
  → [TIDAK ADA YANG TERSEDIA] → tampil empty state + saran ubah tanggal → STATE: Katalog (empty)
  → [ADA] → tampil daftar item & bundle → STATE: Katalog (terisi)
[Pelanggan] Tambah item/bundle ke keranjang
  → [BELUM ADA KUNCI STOK] → STATE: Keranjang
[Pelanggan] Buka Checkout
  → [BELUM LOGIN] → arahkan Login/Register, pertahankan keranjang (FR-016) → STATE: Login
  → [LOGIN] → STATE: Checkout
  → Sistem tampil rincian biaya (FR-013)
[Pelanggan] Konfirmasi Pesanan
  → Sistem periksa ulang stok secara atomik
      → [STOK KURANG] → tolak + pesan kekurangan stok → STATE: Keranjang
      → [STOK CUKUP] → buat pesanan MENUNGGU_PEMBAYARAN + KUNCI STOK + set batas waktu 1×24 jam
  → STATE: Halaman Pembayaran
[Pelanggan] Pilih metode & bayar
  → Sistem buat transaksi ke gateway → STATE: Menunggu Pembayaran (instruksi tampil)
      ├─ [GATEWAY WEBHOOK SUKSES, signature valid] → DIBAYAR + notifikasi → STATE: Dibayar
      ├─ [WEBHOOK SIGNATURE INVALID] → tolak, catat log → STATE: Menunggu Pembayaran
      ├─ [PEMBAYARAN GAGAL] → GAGAL_KEDALUWARSA + lepas stok → STATE: Gagal
      └─ [LEWAT 1×24 JAM] → GAGAL_KEDALUWARSA + lepas stok + notifikasi → STATE: Kedaluwarsa
[Petugas] Lihat daftar pesanan DIBAYAR → ubah ke DISIAPKAN
  → STATE: Disiapkan
[Petugas] Isi checklist serah terima + pelanggan konfirmasi
  → Sistem simpan dokumentasi → STATE: Sedang Disewa
[Pelanggan] Kembalikan alat
[Petugas] Isi checklist pengembalian + catat keterlambatan/kerusakan
  → Sistem hitung denda & ganti rugi (F-4.7)
  → [TIDAK ADA BIAYA TAMBAHAN] → stok kembali → STATE: SELESAI
  → [ADA BIAYA TAMBAHAN] → tampil rincian → STATE: Dikembalikan (menunggu pelunasan)
[Pelanggan] Bayar denda/ganti rugi
  → [BERHASIL] → catat pelunasan → STATE: SELESAI
  → [GAGAL] → STATE: Dikembalikan (menunggu pelunasan), boleh retry
```

### 9.3 Flow Pembatalan oleh Pelanggan

```
[Pelanggan] Buka detail pesanan MENUNGGU_PEMBAYARAN
  → [STATUS LAIN] → tombol Batal tidak ditampilkan `[REKOMENDASI]` → STATE: Detail
  → [MENUNGGU_PEMBAYARAN] → klik "Batalkan Pesanan"
      → [KONFIRMASI YA] → DIBATALKAN + LEPAS KUNCI STOK → STATE: Dibatalkan
      → [KONFIRMASI TIDAK] → STATE: Detail
```

### 9.4 Flow Admin — Kelola Inventaris

```
[Admin] Buka Inventaris → Pilih "Tambah Alat"
  → isi kategori, merk, nama, stok, tarif, unggah foto/video
  → [VALIDASI GAGAL] → tampil error → STATE: Form
  → [VALID] → simpan + log audit → STATE: Daftar Inventaris
[Admin] Ubah status kondisi alat → "Rusak/Perlu Perbaikan"
  → Sistem keluarkan alat dari ketersediaan katalog → STATE: Inventaris (terupdate)
[Admin] Hapus alat
  → [TERIKAT TRANSAKSI AKTIF] → tolak + alasan → STATE: Inventaris
  → [TIDAK TERIKAT] → konfirmasi → hapus (soft delete `[REKOMENDASI]`) + log → STATE: Inventaris
```

### 9.5 Flow Petugas — Serah Terima Lapangan

```
[Petugas] Login (mobile) → Daftar Pesanan Lapangan
  → [TIDAK ADA PESANAN DIBAYAR] → empty state → STATE: Daftar (empty)
  → [ADA] → pilih pesanan → STATE: Detail Pesanan
  → Ubah ke DISIAPKAN → isi checklist kondisi & kelengkapan
      → [CHECKLIST BELUM LENGKAP] → tombol "Selesai" nonaktif → STATE: Form Checklist
      → [LENGKAP] + pelanggan konfirmasi → SEDANG_DISEWA → STATE: Detail Pesanan (terupdate)
```

---

## 10. Information Architecture & Pages

### 10.1 Peta Halaman

| # | Halaman | Aktor | Modul |
| --- | --- | --- | --- |
| P-01 | Beranda | Publik | — |
| P-02 | Katalog (item satuan & bundle) | Publik | M2 |
| P-03 | Detail Barang / Detail Bundle | Publik | M2 |
| P-04 | Keranjang Sewa | Pelanggan | M2 |
| P-05 | Checkout | Pelanggan | M2 |
| P-06 | Pembayaran | Pelanggan | M4 |
| P-07 | Riwayat Saya | Pelanggan | M6 |
| P-08 | Detail Pesanan (Pelanggan) | Pelanggan | M2, M4, M6, M7 |
| P-09 | Profil Saya | Pelanggan | M1 |
| P-10 | Registrasi | Publik | M1 |
| P-11 | Login | Publik | M1 |
| P-12 | Lupa Kata Sandi / Reset Kata Sandi | Publik | M1 |
| P-13 | Dashboard Admin | Admin | M6 |
| P-14 | Inventaris Alat (tabel + form) | Admin | M3 |
| P-15 | Pengelolaan Bundle (tabel + form) | Admin | M3 |
| P-16 | Pengaturan Tarif (denda & ganti rugi) | Admin | M7 |
| P-17 | Verifikasi / Rekonsiliasi Pembayaran | Admin | M4 |
| P-18 | Laporan Transaksi | Admin | M6 |
| P-19 | Daftar Pesanan Lapangan | Petugas | M5 |
| P-20 | Form Checklist Serah Terima | Petugas | M5 |
| P-21 | Form Checklist Pengembalian | Petugas | M5 |

### 10.2 Spesifikasi Halaman Kunci

#### P-02 — Katalog

| Aspek | Detail |
| --- | --- |
| Purpose | Menampilkan item satuan & bundle yang tersedia pada rentang tanggal pelanggan |
| Actor | Publik (Guest & Pelanggan) |
| Entry Points | Beranda, menu navigasi, tautan dari halaman lain |
| Components | Filter rentang tanggal, filter kategori, pencarian teks, tab "Satuan"/"Paket", kartu item (foto, nama, tarif/hari, badge ketersediaan) |
| Primary Actions | Pilih rentang tanggal; tambah ke keranjang; buka detail |
| Secondary Actions | Reset filter; ubah urutan |
| States | **Loading:** skeleton kartu. **Empty:** "Tidak ada alat tersedia pada tanggal ini" + saran ubah tanggal. **Normal:** grid kartu. **Error:** gagal memuat katalog + tombol Coba Lagi. **Partial:** sebagian bundle ditandai "Tidak tersedia — komponen kurang" |
| Navigation | → P-03 (detail), → P-04 (keranjang), → Login bila checkout tanpa sesi |

#### P-05 — Checkout

| Aspek | Detail |
| --- | --- |
| Purpose | Menampilkan rincian biaya final dan mengonfirmasi pembuatan pesanan + penguncian stok |
| Actor | Pelanggan **(wajib terautentikasi)** |
| Entry Points | Keranjang, tautan langsung (redirect ke Login bila tanpa sesi) |
| Components | Ringkasan item, rentang tanggal, perhitungan hari inklusif, kuantitas, rincian biaya (per item + biaya tambahan + total), data pemesanan, tombol Konfirmasi |
| Primary Actions | Konfirmasi Pesanan |
| Secondary Actions | Kembali ke Keranjang; ubah kuantitas |
| States | **Loading:** menghitung estimasi. **Empty:** keranjang kosong → arahkan ke Katalog. **Normal:** rincian tampil. **Error:** stok berubah → pesan kekurangan stok per item. **Permission denied:** belum login → redirect Login, keranjang dipertahankan. **Conflict:** harga berubah sejak item ditambahkan → tampilkan perbandingan harga dan minta konfirmasi ulang |
| Navigation | → P-06 (pembayaran), → P-04 (keranjang), → P-02 (katalog) |

> **Catatan desain (prinsip reuse data `[REKOMENDASI]`):** pelanggan sudah terautentikasi di
> tahap ini, sehingga data identitas yang sudah tersimpan di akun (nama, email, nomor
> telepon) **harus dipakai ulang**, bukan ditanyakan kembali. Halaman Checkout hanya
> menampilkan ringkasan data tersebut dengan tautan "Ubah di Profil" bila pelanggan ingin
> memperbarui. Hal ini konsisten dengan NFR-015 (langkah terbatas). SRS tidak menyebut
> eksplisit mengenai hal ini — lihat §19 OQ-04.

#### P-06 — Pembayaran

| Aspek | Detail |
| --- | --- |
| Purpose | Menampilkan instruksi pembayaran, batas waktu, dan memantau perubahan status |
| Actor | Pelanggan |
| Entry Points | Setelah konfirmasi Checkout; dari Riwayat/Detail Pesanan bila pesanan belum dibayar |
| Components | Metode pembayaran (transfer bank, e-wallet), nominal total, countdown batas waktu, instruksi gateway, status pembayaran, tombol Batal Pesanan |
| Primary Actions | Pilih metode & lanjut ke gateway; cek status pembayaran `[REKOMENDASI]` |
| Secondary Actions | Batalkan pesanan; kembali ke Detail Pesanan |
| States | **Loading:** membuat transaksi. **Pending:** instruksi tampil + countdown berjalan. **Paid:** status `DIBAYAR` + notifikasi terkirim. **Expired:** batas waktu lewat → status `GAGAL_KEDALUWARSA`, stok dilepas. **Failed:** pembayaran gagal → opsi coba lagi selama belum kedaluwarsa. **Error:** gateway tidak merespons → tombol Coba Lagi + instruksi menghubungi admin |
| Navigation | → P-08 (detail pesanan), → P-07 (riwayat), → P-02 (katalog) |

#### P-14 — Inventaris Alat

| Aspek | Detail |
| --- | --- |
| Purpose | Mengelola data alat, stok, tarif, media, dan status kondisi |
| Actor | Admin |
| Entry Points | Dashboard Admin, menu navigasi admin |
| Components | Tabel alat (kode, nama, kategori, merk, stok, tarif, status kondisi, badge stok menipis), pencarian, filter kategori & kondisi, tombol Tambah/Ubah/Hapus, tautan Riwayat Penyewaan per baris |
| Primary Actions | Tambah/Ubah/Hapus alat; ubah status kondisi |
| Secondary Actions | Filter; lihat riwayat penyewaan per kode barang |
| States | **Loading:** skeleton tabel. **Empty:** "Belum ada alat" + CTA Tambah. **Normal:** tabel terisi. **Error:** gagal menyimpan + pesan validasi. **Permission denied:** non-admin → 403. **Warning:** stok ≤ ambang minimum → badge peringatan |
| Navigation | → P-15 (bundle), → P-13 (dashboard), → Detail riwayat per alat |

#### P-19 — Daftar Pesanan Lapangan

| Aspek | Detail |
| --- | --- |
| Purpose | Antrean kerja petugas: pesanan yang perlu diserahkan atau dikembalikan |
| Actor | Petugas Lapangan |
| Entry Points | Login petugas, menu navigasi lapangan |
| Components | Tab "Perlu Diserahkan" (`DIBAYAR`/`DISIAPKAN`), tab "Perlu Dikembalikan" (`SEDANG_DISEWA`), kartu pesanan (kode, pelanggan, tanggal sewa, jumlah item) |
| Primary Actions | Buka form checklist serah terima / pengembalian |
| Secondary Actions | Lihat detail pesanan |
| States | **Loading:** skeleton kartu. **Empty:** "Tidak ada pesanan hari ini". **Normal:** daftar kartu. **Error:** gagal memuat + Coba Lagi. **Permission denied:** non-petugas/non-admin → 403 |
| Navigation | → P-20, → P-21, → Detail Pesanan |

### 10.3 Struktur Navigasi

```
PUBLIK
  Beranda ─┬─ Katalog ─── Detail Barang
           ├─ Login / Registrasi / Lupa Kata Sandi
           └─ Keranjang (guest: lihat saja; checkout → Login)

PELANGGAN (setelah login)
  Katalog ─ Detail ─ Keranjang ─ Checkout ─ Pembayaran
  Riwayat Saya ─ Detail Pesanan ─ (Bayar Denda | Batalkan)
  Profil Saya

ADMIN
  Dashboard ─┬─ Inventaris ─ Riwayat per Alat
             ├─ Bundle
             ├─ Tarif (Denda & Ganti Rugi)
             ├─ Verifikasi/Rekonsiliasi Pembayaran
             └─ Laporan Transaksi (filter + ekspor)

PETUGAS LAPANGAN
  Daftar Pesanan ─┬─ Checklist Serah Terima
                  └─ Checklist Pengembalian
```

---

## 11. Data Requirements

### 11.1 Entity & Field

**User**

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| user_id | BIGINT / UUID | ✅ | PK, unik | |
| nama | VARCHAR(100) | ✅ | 2–100 karakter | |
| email | VARCHAR(150) | ✅ | format email, **unik** | BR-003 |
| nomor_telepon | VARCHAR(20) | ✅ | format nomor Indonesia `[ASUMSI]` | |
| password_hash | VARCHAR(255) | ✅ | bcrypt | NFR-008; **plaintext tidak pernah disimpan** |
| role | ENUM | ✅ | `PELANGGAN`\|`PETUGAS`\|`ADMIN` | RBAC |
| status_verifikasi | ENUM | ✅ | `BELUM_VERIFIKASI`\|`AKTIF` | FR-002 |
| failed_login_count | INT | ✅ | default 0 | FR-005 |
| last_failed_login_at | DATETIME | ❌ | | FR-005 |
| created_at / updated_at | DATETIME | ✅ | UTC+7 | NFR-019 |

**Category** — `category_id` (PK), `nama` (unik, wajib), `deskripsi`.

**Item** (alat satuan)

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| item_id | BIGINT | ✅ | PK | |
| kode_barang | VARCHAR(30) | ✅ | **unik** | REQ-4.3.4 merujuk "kode barang" |
| nama | VARCHAR(150) | ✅ | | |
| category_id | BIGINT | ✅ | FK → Category | |
| merk | VARCHAR(100) | ❌ | | |
| stok_fisik | INT | ✅ | ≥ 0 | |
| stok_minimum | INT | ❌ | ≥ 0, default global | FR-027 `[REKOMENDASI]` |
| tarif_harian | DECIMAL(12,2) | ✅ | > 0 | |
| status_kondisi | ENUM | ✅ | `TERSEDIA`\|`SEDANG_DISEWA`\|`RUSAK`\|`HILANG` | FR-018 |
| is_aktif | BOOLEAN | ✅ | default true | soft delete `[REKOMENDASI]` |
| created_at / updated_at | DATETIME | ✅ | UTC+7 | |

**ItemMedia** — `media_id` (PK), `item_id` (FK), `tipe` (`FOTO`\|`VIDEO`), `url`, `urutan`.

**Bundle**

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| bundle_id | BIGINT | ✅ | PK | |
| nama | VARCHAR(150) | ✅ | | |
| harga_bundle | DECIMAL(12,2) | ✅ | > 0 | FR-022 |
| is_aktif | BOOLEAN | ✅ | default true | |

**BundleItem** (komposisi) — `bundle_item_id` (PK), `bundle_id` (FK), `item_id` (FK),
`kuantitas` (INT, ≥1). Unik gabungan (`bundle_id`, `item_id`).

**Order**

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| order_id | BIGINT | ✅ | PK | |
| kode_pesanan | VARCHAR(30) | ✅ | **unik**, human-readable | |
| user_id | BIGINT | ✅ | FK → User | |
| tanggal_mulai | DATE | ✅ | | |
| tanggal_selesai | DATE | ✅ | ≥ tanggal_mulai | inklusif (FR-013) |
| status | ENUM | ✅ | 8 status §2.8 SRS | state machine |
| total_sewa | DECIMAL(12,2) | ✅ | ≥ 0 | |
| total_biaya_tambahan | DECIMAL(12,2) | ✅ | ≥ 0 | denda + ganti rugi |
| total_akhir | DECIMAL(12,2) | ✅ | ≥ 0 | |
| batas_pembayaran | DATETIME | ✅ | dibuat + 1×24 jam | FR-030 |
| created_at / updated_at | DATETIME | ✅ | UTC+7 | |

**OrderItem**

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| order_item_id | BIGINT | ✅ | PK | |
| order_id | BIGINT | ✅ | FK → Order | |
| tipe | ENUM | ✅ | `ITEM`\|`BUNDLE` | |
| item_id | BIGINT | ❌ | FK → Item (bila tipe ITEM) | |
| bundle_id | BIGINT | ❌ | FK → Bundle (bila tipe BUNDLE) | |
| kuantitas | INT | ✅ | ≥ 1 | |
| harga_satuan_snapshot | DECIMAL(12,2) | ✅ | | **snapshot harga saat transaksi** — penting agar harga historis tidak berubah |
| subtotal | DECIMAL(12,2) | ✅ | ≥ 0 | |

**StockReservation** (kunci stok)

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| reservation_id | BIGINT | ✅ | PK | |
| order_id | BIGINT | ✅ | FK → Order | |
| item_id | BIGINT | ✅ | FK → Item | untuk bundle, **dibuat satu baris per komponen** |
| kuantitas | INT | ✅ | ≥ 1 | |
| tanggal_mulai / tanggal_selesai | DATE | ✅ | | menentukan irisan (FR-011) |
| status | ENUM | ✅ | `AKTIF`\|`DILEPAS`\|`TERPAKAI` | |

**Payment**

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| payment_id | BIGINT | ✅ | PK | |
| order_id | BIGINT | ✅ | FK → Order | |
| metode | VARCHAR(50) | ✅ | `TRANSFER_BANK`\|`E_WALLET` | FR-028 |
| status | ENUM | ✅ | `PENDING`\|`SUKSES`\|`GAGAL`\|`KEDALUWARSA` | |
| nominal | DECIMAL(12,2) | ✅ | > 0 | |
| referensi_gateway | VARCHAR(100) | ❌ | **unik bila ada** | idempotensi webhook (FR-034) |
| waktu | DATETIME | ✅ | UTC+7 | |

**ChecklistRecord** (serah terima & pengembalian)

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| checklist_id | BIGINT | ✅ | PK | |
| order_id | BIGINT | ✅ | FK → Order | |
| tipe | ENUM | ✅ | `SERAH_TERIMA`\|`PENGEMBALIAN` | |
| petugas_id | BIGINT | ✅ | FK → User (role PETUGAS/ADMIN) | FR-039 |
| waktu_aktual | DATETIME | ✅ | UTC+7 | |
| catatan | TEXT | ❌ | | |
| foto_url | VARCHAR | ❌ | | |

**ChecklistItem** — `checklist_item_id`, `checklist_id` (FK), `item_id` (FK),
`kondisi` (ENUM: `BAIK`\|`RUSAK_RINGAN`\|`RUSAK_BERAT`\|`HILANG`), `kelengkapan`
(BOOLEAN), `catatan`.

**Penalty** (denda & ganti rugi)

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| penalty_id | BIGINT | ✅ | PK | |
| order_id | BIGINT | ✅ | FK → Order | |
| tipe | ENUM | ✅ | `DENDA_KETERLAMBATAN`\|`GANTI_RUGI` | |
| durasi_terlambat_menit | INT | ❌ | ≥ 0 | |
| nominal | DECIMAL(12,2) | ✅ | ≥ 0 | |
| disesuaikan_oleh | BIGINT | ❌ | FK → User (ADMIN) | FR-051 |
| alasan_penyesuaian | TEXT | ❌ | **wajib bila disesuaikan** | jejak audit |
| status_pelunasan | ENUM | ✅ | `BELUM_LUNAS`\|`LUNAS` | |

**PenaltyRate** (pengaturan tarif) — `rate_id`, `tipe`
(`DENDA_PER_JAM`\|`DENDA_PER_HARI`\|`GANTI_RUGI_DEFAULT`), `nominal`, `item_id` (nullable
untuk default), `diatur_oleh`, `updated_at`.

**AuditLog** — `log_id`, `aktor_id` (FK → User), `aksi`, `entity`, `entity_id`,
`nilai_lama` (JSON), `nilai_baru` (JSON), `waktu`. `[REQ-5.2, REQ-4.3.9]`

**NotificationLog** (opsional `[REKOMENDASI]`) — `notif_id`, `user_id`, `jenis`, `kanal`,
`status_kirim`, `waktu`.

### 11.2 Relasi

```
User          1 ─── N Order                    (pelanggan memesan)
User(PETUGAS) 1 ─── N ChecklistRecord          (petugas mencatat)
User(ADMIN)   1 ─── N Penalty                  (admin menyesuaikan)
User(ADMIN)   1 ─── N AuditLog                 (aktor perubahan)

Category      1 ─── N Item
Item          1 ─── N ItemMedia
Bundle        1 ─── N BundleItem
Item          1 ─── N BundleItem                (item sebagai komponen)

Order         1 ─── N OrderItem
Item          1 ─── N OrderItem                 (bila tipe ITEM)
Bundle        1 ─── N OrderItem                 (bila tipe BUNDLE)

Order         1 ─── N StockReservation
Item          1 ─── N StockReservation          (per komponen bundle)

Order         1 ─── N Payment
Order         1 ─── N ChecklistRecord
ChecklistRecord 1 ─ N ChecklistItem
Order         1 ─── N Penalty
Item          1 ─── N PenaltyRate               (nullable: default global)
```

### 11.3 Catatan Data

- **`harga_satuan_snapshot` pada OrderItem wajib** — tanpa ini, perubahan tarif oleh admin
  akan mengubah nilai pesanan lama `[REKOMENDASI]`. SRS tidak menyebut mekanisme ini,
  tetapi REQ-4.2.7 dan REQ-4.4.4 menuntut rincian biaya yang konsisten.
- **Ketersediaan stok dihitung, bukan disimpan.** `stok tersedia` = kolom turunan dari
  `stok_fisik` − Σ `StockReservation` berstatus `AKTIF` pada rentang beririsan (FR-011).
  Jangan menyimpan nilai ini sebagai kolom statis.
- **`StockReservation` untuk bundle dipecah per komponen.** REQ-4.3.7 menuntut 1 paket
  memakai 1 tenda + 2 matras; karenanya reservasi harus pada level item satuan, bukan
  pada level bundle.

---

## 12. Business Rules

| ID | Aturan | Trace | Testable |
| --- | --- | --- | --- |
| BR-001 | Pelanggan **harus** terautentikasi sebelum melakukan checkout. Keranjang boleh dibentuk tanpa login. | REQ-4.2.3, §5.5 | ✅ |
| BR-002 | Registrasi **tidak** mengaktifkan akun; email harus diverifikasi lebih dulu. Login sebelum verifikasi ditolak. | REQ-4.1.2 | ✅ |
| BR-003 | Email bersifat **unik** di seluruh sistem. Registrasi dengan email terdaftar ditolak tanpa menggandakan akun. | REQ-4.1.3 | ✅ |
| BR-004 | Maksimal 5 percobaan login gagal per akun dalam 15 menit; melebihi batas → pembatasan sementara. | REQ-4.1.5 | ✅ |
| BR-005 | `stok tersedia = stok fisik − Σ unit terikat pesanan berstatus aktif pada rentang tanggal beririsan`. Status aktif: `MENUNGGU_PEMBAYARAN`, `DIBAYAR`, `DISIAPKAN`, `SEDANG_DISEWA`. | REQ-4.2.5, §2.8 | ✅ |
| BR-006 | Pesanan dengan tanggal beririsan **tidak boleh** menggunakan unit fisik yang sama. | REQ-4.2.5 | ✅ |
| BR-007 | Stok dikunci **saat pesanan dibuat**, bukan saat pembukaan/menambahan keranjang. | §5.5 | ✅ |
| BR-008 | Bundle dianggap tersedia **hanya bila seluruh** item satuan penyusunnya tersedia pada tanggal yang dipilih. | REQ-4.2.4 | ✅ |
| BR-009 | Biaya sewa = `tarif harian × jumlah hari sewa × kuantitas + biaya tambahan`. Hari dihitung **inklusif** dari tanggal mulai sampai selesai. | REQ-4.2.7 | ✅ |
| BR-010 | Pesanan **tidak dapat** dikonfirmasi bila kuantitas melebihi stok tersedia. | REQ-4.2.8 | ✅ |
| BR-011 | Hanya **admin** yang boleh menambah, mengubah, atau menghapus data alat dan mengelola bundle. | §5.5 | ✅ |
| BR-012 | Data alat yang masih tercantum pada transaksi sewa aktif **tidak boleh** dihapus. | REQ-4.3.3 | ✅ |
| BR-013 | Item satuan yang masih menjadi komponen paket bundle aktif **tidak boleh** dihapus. | REQ-4.3.8 | ✅ |
| BR-014 | Pemesan 1 paket bundle otomatis mengunci stok seluruh item satuan penyusunnya sesuai kuantitas komponen. | REQ-4.3.7 | ✅ |
| BR-015 | Pesanan `MENUNGGU_PEMBAYARAN` yang tidak dibayar dalam **1×24 jam** batal otomatis dan kunci stok dilepas. | REQ-4.4.3, §5.5 | ✅ |
| BR-016 | Perubahan status pembayaran hanya sah bila webhook lolos verifikasi signature. | REQ-4.4.2 | ✅ |
| BR-017 | Webhook yang sama boleh diterima berulang **tanpa** menggandakan perubahan status atau pencatatan transaksi (idempoten). | REQ-4.4.7 | ✅ |
| BR-018 | Pembayaran hanya ditangani payment gateway bersertifikasi PCI-DSS; sistem **tidak** menyimpan data kartu. | REQ-5.3 | ✅ |
| BR-019 | Serah terima hanya boleh dilakukan untuk pesanan berstatus `DIBAYAR`/`DISIAPKAN`. | §2.8 | ✅ |
| BR-020 | Pengembalian hanya boleh dicatat untuk pesanan berstatus `SEDANG_DISEWA`. | §2.8 | ✅ |
| BR-021 | Stok ketersediaan bertambah kembali setelah pengembalian dicatat, **kecuali** alat ditandai perlu perbaikan/rusak atau hilang. | REQ-4.5.3, §5.5 | ✅ |
| BR-022 | Alat berstatus `RUSAK` atau `HILANG` **tidak** dapat disewakan kembali sebelum admin mengubah statusnya menjadi `TERSEDIA`. | §5.5 | ✅ |
| BR-023 | Dashboard dan laporan transaksi **hanya** dapat diakses pengguna dengan peran `ADMIN`. | REQ-4.6.5 | ✅ |
| BR-024 | Pelanggan hanya dapat melihat riwayat dan detail pesanan **miliknya sendiri**. | REQ-4.6.3 `[REKOMENDASI]` | ✅ |
| BR-025 | Denda & biaya ganti rugi dihitung berdasarkan tarif yang ditentukan admin, dengan tarif berbeda untuk satuan jam dan satuan hari. | REQ-4.7.1, §5.5 | ✅ |
| BR-026 | Biaya ganti rugi hanya dikenakan untuk kondisi **rusak berat** atau **hilang**, bukan rusak ringan. `[ASUMSI]` | REQ-4.7.2 | ✅ |
| BR-027 | Penyesuaian atau pembebasan denda **wajib** disertai alasan yang tercatat sebagai jejak audit. | REQ-4.7.5 | ✅ |
| BR-028 | Pesanan hanya berstatus `SELESAI` setelah seluruh kewajiban finansial (sewa + denda + ganti rugi) terlunasi. | §2.8 | ✅ |
| BR-029 | Seluruh data transaksi menggunakan zona waktu Waktu Indonesia Barat (UTC+7). | REQ-2.5 | ✅ |
| BR-030 | Perubahan atas aktivitas kritikal (inventaris, status pembayaran, pembatalan) **wajib** tercatat di audit log. | REQ-5.2, REQ-4.3.9 | ✅ |

---

## 13. Validation & Error Handling

### 13.1 Validasi Input

| Entitas.Field | Required | Format | Min/Max | Nilai Diizinkan | Unik | Pesan Kesalahan |
| --- | --- | --- | --- | --- | --- | --- |
| User.nama | ✅ | Teks | 2–100 | — | ❌ | "Nama harus diisi minimal 2 karakter." |
| User.email | ✅ | Email | ≤150 | — | ✅ | "Format email tidak valid." / "Email sudah terdaftar, silakan login." |
| User.nomor_telepon | ✅ | Digit/+ | 9–15 | — | ❌ | "Nomor telepon tidak valid." |
| User.password | ✅ | Teks | ≥8 | — | ❌ | "Kata sandi minimal 8 karakter." |
| Item.nama | ✅ | Teks | 2–150 | — | ❌ | "Nama barang wajib diisi." |
| Item.kode_barang | ✅ | Alfanumerik | ≤30 | — | ✅ | "Kode barang sudah digunakan." |
| Item.stok_fisik | ✅ | Integer | ≥0 | — | ❌ | "Stok tidak boleh negatif." |
| Item.tarif_harian | ✅ | Decimal | >0 | — | ❌ | "Tarif harus lebih dari 0." |
| Item.status_kondisi | ✅ | Enum | — | `TERSEDIA`, `SEDANG_DISEWA`, `RUSAK`, `HILANG` | ❌ | "Status kondisi tidak valid." |
| Bundle.harga_bundle | ✅ | Decimal | >0 | — | ❌ | "Harga paket harus lebih dari 0." |
| BundleItem.kuantitas | ✅ | Integer | ≥1 | — | ❌ | "Jumlah komponen minimal 1." |
| Order.tanggal_selesai | ✅ | Date | ≥ tanggal_mulai | — | ❌ | "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." |
| OrderItem.kuantitas | ✅ | Integer | ≥1, ≤ stok tersedia | — | ❌ | "Jumlah melebihi stok tersedia (tersedia: N)." |
| PenaltyRate.nominal | ✅ | Decimal | ≥0 | — | ❌ | "Nominal tarif tidak boleh negatif." |
| Penalty.alasan_penyesuaian | ⚠️ wajib bila disesuaikan | Teks | 10–500 | — | ❌ | "Alasan penyesuaian denda wajib diisi." |

### 13.2 Penanganan Kegagalan

| Skenario | Apa yang gagal | Yang dilihat pengguna | Retry? | State sebelumnya dipertahankan? |
| --- | --- | --- | --- | --- |
| Registrasi email duplikat | Pembuatan akun | "Email sudah terdaftar" + tautan Login | ✅ ubah email | ✅ seluruh isian form dipertahankan |
| Login kredensial salah | Autentikasi | Pesan generik (tidak membocorkan mana yang salah) | ✅ | ✅ email terisi |
| Login akun belum terverifikasi | Autentikasi | "Akun belum diverifikasi" + tombol Kirim Ulang Email | ✅ | ✅ |
| Login melebihi 5× gagal | Autentikasi | "Terlalu banyak percobaan. Coba lagi dalam 15 menit." | ⏳ tertunda | ✅ |
| Token reset kedaluwarsa | Reset kata sandi | "Tautan sudah kedaluwarsa" + minta tautan baru | ✅ | ✅ |
| Stok berubah saat checkout | Konfirmasi pesanan | "Stok kurang untuk: [item]. Tersedia N." | ✅ ubah kuantitas | ✅ keranjang dipertahankan |
| Harga berubah sejak item ditambahkan | Konfirmasi pesanan | Tampilkan harga lama vs baru, minta konfirmasi ulang | ✅ | ✅ keranjang dipertahankan |
| Kuantitas melebihi stok | Validasi keranjang | "Jumlah melebihi stok tersedia." | ✅ | ✅ |
| Bundle komponen habis | Ketersediaan | "Paket tidak tersedia — komponen kurang: [list]" | ✅ ganti tanggal | ✅ |
| Webhook signature tidak valid | Verifikasi webhook | *(internal)* — log + tolak; pelanggan tidak melihat perubahan status | ✅ webhook berikutnya | ✅ status tetap `MENUNGGU_PEMBAYARAN` |
| Webhook duplikat | Idempotensi | *(tidak ada notifikasi ganda)* | — | ✅ status tidak berubah dua kali |
| Webhook tidak diterima | Sinkronisasi status | Status tetap "Menunggu Pembayaran" → tombol "Cek Status Pembayaran" `[REKOMENDASI]` | ✅ | ✅ |
| Payment gateway timeout | Pembuatan transaksi | "Gagal menghubungi layanan pembayaran. Coba lagi." | ✅ | ✅ pesanan `MENUNGGU_PEMBAYARAN` |
| Pembayaran gagal | Pembayaran | Status `GAGAL_KEDALUWARSA` + notifikasi | ✅ buat pesanan baru | ⚠️ stok dilepas |
| Batas waktu lewat | Pembayaran | "Pesanan dibatalkan otomatis" | ✅ buat pesanan baru | ⚠️ stok dilepas |
| Hapus alat terikat transaksi aktif | Penghapusan | "Alat tidak dapat dihapus karena masih tersewa." | ❌ | ✅ data utuh |
| Hapus item komponen bundle aktif | Penghapusan | "Item masih dipakai pada paket: [nama]." | ❌ | ✅ |
| Checklist belum lengkap | Serah terima | Tombol "Selesai" nonaktif + indikator komponen terlewat | ✅ | ✅ isian dipertahankan |
| Pengembalian sebelum waktu serah terima | Pengembalian | "Waktu pengembalian tidak valid." | ✅ perbaiki input | ✅ |
| Tarif denda belum diatur | Perhitungan denda | "Tarif denda belum dikonfigurasi. Hubungi admin." `[KONTRADIKSI-04]` | ❌ butuh admin | ✅ status `DIKEMBALIKAN` |
| Akses non-admin ke dashboard/laporan | Otorisasi | Halaman 403 atau redirect ke beranda | ❌ | — |
| Session JWT kedaluwarsa | Otorisasi | Redirect ke Login dengan pesan "Sesi berakhir, silakan masuk kembali"; aksi terakhir diulang otomatis setelah login `[REKOMENDASI]` | ✅ | ✅ |
| Ekspor laporan gagal (data besar) | Ekspor | "Ekspor gagal, coba periode lebih pendek." | ✅ | ✅ |

---

## 14. Permissions & Access Control

### 14.1 Model Otorisasi

- **RBAC** berbasis `User.role` ∈ {`PELANGGAN`, `PETUGAS`, `ADMIN`} `[REQ-5.3]`.
- Autentikasi via **JWT** dengan masa berlaku terbatas dan mekanisme refresh `[REQ-5.3]`.
- Aksi sensitif (checkout, ubah status, atur tarif) **wajib** melalui endpoint ber-otorisasi `[REKOMENDASI]`.
- **Ownership check** wajib untuk seluruh data pelanggan (BR-024).
- **Idempotency key** wajib untuk aksi yang memicu duplikasi (checkout, pembayaran) `[REKOMENDASI]`.

### 14.2 Matriks Keputusan Otorisasi

| Aksi | Endpoint `[REKOMENDASI]` | Pelanggan | Petugas | Admin |
| --- | --- | :---: | :---: | :---: |
| Lihat katalog | `GET /items`, `GET /bundles` | ✅ | ✅ | ✅ |
| Buat pesanan | `POST /orders` | ✅ | ❌ | ❌ |
| Lihat pesanan sendiri | `GET /orders/:id` + ownership | ✅ | ❌ | ❌ |
| Lihat semua pesanan | `GET /admin/orders` | ❌ | ✅ (lapangan) | ✅ |
| Batalkan pesanan sendiri | `POST /orders/:id/cancel` + ownership + status guard | ✅ | ❌ | ❌ |
| CRUD item | `POST/PUT/DELETE /admin/items` | ❌ | ❌ | ✅ |
| CRUD bundle | `POST/PUT/DELETE /admin/bundles` | ❌ | ❌ | ✅ |
| Atur tarif denda | `PUT /admin/penalty-rates` | ❌ | ❌ | ✅ |
| Sesuaikan denda | `POST /admin/penalties/:id/adjust` | ❌ | ❌ | ✅ |
| Update status serah terima | `POST /staff/orders/:id/handover` | ❌ | ✅ | ❌ `[ASUMSI]` |
| Update status pengembalian | `POST /staff/orders/:id/return` | ❌ | ✅ | ❌ `[ASUMSI]` |
| Lihat laporan & dashboard | `GET /admin/reports` | ❌ | ❌ | ✅ |
| Webhook gateway | `POST /webhooks/payment` | *(signature only)* | — | — |

### 14.3 Celah Keamanan yang Perlu Ditutup `[REKOMENDASI]`

1. **Endpoint webhook harus tidak dapat diakses publik tanpa signature valid** dan
   sebaiknya dibatasi pada alamat/IP gateway `[REQ-5.3]`.
2. **Rate limiting** jangan hanya di level akun; tambahkan juga di level IP untuk mencegah
   penyebaran serangan lintas akun.
3. **Audit log tidak boleh dapat diubah** oleh admin manapun (append-only).
4. **Refresh token** harus dapat dicabut saat logout atau setelah reset kata sandi.

---

## 15. Edge Cases

### 15.1 Autentikasi

| # | Skenario | Perilaku yang Diharapkan |
| --- | --- | --- |
| EC-01 | Kredensial salah | Pesan generik; tidak membocorkan apakah email atau kata sandi yang salah |
| EC-02 | Akun belum terverifikasi | Login ditolak + opsi kirim ulang email verifikasi |
| EC-03 | Sesi kedaluwarsa di tengah checkout | Redirect Login, keranjang & tanggal dipertahankan, lanjut otomatis setelah login |
| EC-04 | Akses halaman admin tanpa peran | 403 atau redirect beranda |
| EC-05 | Reset kata sandi saat sedang login di perangkat lain | Sesi lama dicabut `[REKOMENDASI]` |

### 15.2 Katalog & Inventaris

| # | Skenario | Perilaku yang Diharapkan |
| --- | --- | --- |
| EC-06 | Item tidak tersedia pada tanggal dipilih | Ditandai tidak tersedia, tidak bisa ditambahkan ke keranjang |
| EC-07 | Stok berubah setelah item dipilih tapi sebelum checkout | Ditolak di checkout dengan pesan kekurangan stok per item |
| EC-08 | Kuantitas invalid (0, negatif, bukan angka) | Ditolak validasi |
| EC-09 | Item dinonaktifkan/dihapus setelah masuk keranjang | Item ditandai "sudah tidak tersedia" dan dikeluarkan dari perhitungan total |
| EC-10 | Bundle berisi komponen yang dinonaktifkan | Bundle ditandai tidak tersedia |
| EC-11 | Kode barang duplikat saat admin tambah alat | Ditolak validasi keunikan |

### 15.3 Keranjang & Checkout

| # | Skenario | Perilaku yang Diharapkan |
| --- | --- | --- |
| EC-12 | Keranjang kosong → buka checkout | Redirect ke katalog dengan pesan |
| EC-13 | Keranjang *stale* (item dihapus/harga berubah) | Tampilkan perbandingan, minta konfirmasi ulang |
| EC-14 | Data profil pelanggan tidak lengkap | **Pertahankan prinsip reuse (FR-016, §10.2):** checkout memakai data tersimpan; bila ada field wajib yang kosong, minta hanya field tersebut, bukan seluruh formulir |
| EC-15 | Harga berubah setelah item masuk keranjang | Tampilkan selisih, minta konfirmasi sebelum konfirmasi pesanan |
| EC-16 | Pelanggan belum login mencoba checkout | Redirect Login; keranjang dipertahankan |

### 15.4 Transaksi & Pesanan

| # | Skenario | Perilaku yang Diharapkan |
| --- | --- | --- |
| EC-17 | Pembayaran gagal | `GAGAL_KEDALUWARSA`, stok dilepas, notifikasi; pelanggan boleh buat pesanan baru |
| EC-18 | Pembayaran *pending* (instruksi belum diselesaikan) | Status tetap `MENUNGGU_PEMBAYARAN` hingga webhook atau batas waktu |
| EC-19 | Duplikat submission checkout (dobel klik) | Hanya satu pesanan terbentuk (idempotency key) |
| EC-20 | Webhook duplikat | Tidak menggandakan perubahan status atau pencatatan pembayaran |
| EC-21 | Pembatalan setelah alat diserahkan | **Tidak diizinkan** — hanya boleh sebelum `DIBAYAR`/`DISIAPKAN` `[REKOMENDASI]` |
| EC-22 | Pesanan kedaluwarsa saat pelanggan sedang di halaman gateway | Status berubah ke `GAGAL_KEDALUWARSA`; bila pembayaran tetap masuk, perlu proses **refund** `[REKOMENDASI]` |
| EC-23 | Konflik transisi status (dua petugas memproses pesanan sama) | Transaksi kedua ditolak dengan pesan "status sudah berubah"; gunakan *optimistic locking* |
| EC-24 | Pengembalian lebih awal dari waktu serah terima | Ditolak validasi |
| EC-25 | Alat hilang seluruhnya | Ganti rugi penuh + status alat `HILANG` + stok tidak kembali |
| EC-26 | Alat rusak ringan | Tidak dikenakan ganti rugi `[ASUMSI]`, alat tetap dapat disewakan setelah dicatat |

### 15.5 Kontradiksi yang Teridentifikasi (perlu keputusan pemilik produk)

| ID | Kontradiksi | Dampak | Rekomendasi |
| --- | --- | --- | --- |
| `KONTRADIKSI-03` | SRS tidak mendefinisikan perilaku **harga berubah** setelah item masuk keranjang, padahal REQ-4.2.7 menuntut estimasi biaya akurat dan REQ-4.2.5 mengunci ketersediaan (bukan harga) saat pesanan dibuat. | Risiko pelanggan merasa tertipu; atau sistem menanggung selisih. | **Snapshot harga saat checkout** (§11.3) + tampilkan perubahan & minta konfirmasi (EC-15). |
| `KONTRADIKSI-04` | REQ-4.7.1 mengharuskan tarif denda **dapat diatur admin**, tetapi tidak ada requirement tentang apa yang terjadi bila tarif belum diatur, sementara REQ-4.5.2 mewajibkan sistem menghitung denda otomatis saat pengembalian. | Proses pengembalian bisa gagal total di awal implementasi. | Tetapkan **nilai default tarif** saat instalasi, atau wajibkan admin mengatur tarif sebelum alat dapat disewakan. |
| `KONTRADIKSI-05` | REQ-4.4.3 memakai kata "misalnya 1×24 jam" (tidak mengikat), sementara §5.5 menetapkan 1×24 jam secara tegas. | Nilai batas waktu ambigu bagi developer. | Hapus "misalnya"; jadikan 1×24 jam sebagai default yang dapat dikonfigurasi admin. |
| `KONTRADIKSI-06` | NFR-002 "tanpa penurunan performa **yang signifikan**" tidak testable. | Sulit diverifikasi saat *performance testing*. | Kuantifikasi menjadi p95 ≤ 3 s pada 200 *concurrent users*. |

---

## 16. Acceptance Criteria

Format **Given → When → Then**. Mencakup seluruh FR prioritas **Must have**.

### 16.1 Autentikasi

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-001 | Pelanggan baru di halaman Registrasi | Pelanggan mengisi email valid dan kata sandi 8+ karakter | Sistem membuat akun belum terverifikasi dan mengirim email verifikasi | FR-001, FR-002 |
| AC-002 | Pelanggan baru mengisi kata sandi `123` (3 karakter) | Pelanggan menekan tombol Daftar | Sistem menolak dan menampilkan "Kata sandi minimal 8 karakter"; data isian lain tetap | FR-001 |
| AC-003 | Sudah ada akun dengan email `budi@mail.com` | Pelanggan mendaftar dengan email yang sama | Sistem menampilkan "Email sudah terdaftar" dan tidak membuat akun baru | FR-003, BR-003 |
| AC-004 | Akun terdaftar tetapi belum diverifikasi | Pelanggan mencoba login | Sistem menolak dan menawarkan kirim ulang email verifikasi | FR-002, BR-002 |
| AC-005 | Akun aktif | Terjadi 5 kali login gagal dalam 15 menit | Percobaan ke-6 ditolak dengan pesan pembatasan sementara meski kata sandi benar | FR-005, BR-004 |
| AC-006 | Pelanggan lupa kata sandi | Pelanggan meminta reset, membuka tautan, dan menetapkan kata sandi baru | Login dengan kata sandi baru berhasil; kata sandi lama tidak berlaku | FR-004 |
| AC-007 | Pengguna dengan peran Admin/Petugas/Pelanggan berhasil login | Login sukses | Sistem mengarahkan ke halaman sesuai perannya | FR-006 |

### 16.2 Katalog, Keranjang & Pemesanan

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-008 | Pelanggan membuka katalog | Tanpa filter apa pun | Katalog menampilkan pemisahan antara item satuan dan paket bundle | FR-007 |
| AC-009 | Pelanggan membuka detail "Paket Camping 2 Orang" | Halaman dimuat | Tampil daftar komponen (1 tenda, 2 matras, 2 kursi lipat) dan harga total paket | FR-008 |
| AC-010 | Pelanggan memilih rentang tanggal saat salah satu komponen bundle habis | Sistem memuat katalog | Bundle ditandai tidak tersedia dengan alasan komponen yang kurang | FR-010, BR-008 |
| AC-011 | Stok fisik tenda = 1 | Pelanggan A memesan tenda tanggal 1–3, lalu Pelanggan B memesan tenda sama tanggal 2–4 | Pesanan B ditolak karena stok tersedia = 0 pada rentang beririsan | FR-011, BR-005, BR-006 |
| AC-012 | Pelanggan menambahkan item ke keranjang | Pelanggan **belum** mengonfirmasi pesanan | Stok **belum** terkunci dan masih dapat dipesan pelanggan lain | FR-012, BR-007 |
| AC-013 | Pelanggan berhasil mengonfirmasi pesanan | Pesanan terbuat berstatus `MENUNGGU_PEMBAYARAN` | Stok terkunci dan tercatat pada `StockReservation` | FR-012, BR-007 |
| AC-014 | Pelanggan memiliki pesanan `MENUNGGU_PEMBAYARAN` | Pesanan dibatalkan pelanggan atau kedaluwarsa | Kunci stok dilepas dan unit tersedia kembali | FR-012, BR-015 |
| AC-015 | Tarif item Rp25.000/hari | Pelanggan menyewa tanggal 1–3, kuantitas 2 | Sistem menampilkan estimasi biaya Rp150.000 sebelum konfirmasi | FR-013, BR-009 |
| AC-016 | Stok tersedia = 2 | Pelanggan mengonfirmasi pesanan dengan kuantitas 5 | Sistem menolak konfirmasi dan menampilkan pesan kekurangan stok | FR-014, BR-010 |
| AC-017 | Pelanggan memesan 1 paket "Paket Tenda" (1 tenda + 2 matras) | Pesanan berhasil dikonfirmasi | Stok 1 tenda dan 2 matras terkunci otomatis | FR-023, BR-014 |
| AC-018 | Guest menambahkan item ke keranjang | Guest menekan tombol Checkout | Sistem mengarahkan ke Login/Register dan keranjang dipertahankan | FR-016, BR-001, EC-16 |
| AC-019 | Pelanggan terautentikasi membuka Checkout | Halaman Checkout dimuat | Sistem menampilkan data identitas yang sudah tersimpan di akun **tanpa meminta memasukkannya ulang** | FR-016, EC-14 |
| AC-019b | Pelanggan memiliki satu paket bundle di keranjang | Pelanggan menambahkan dua item satuan ke keranjang yang sama | Keduanya berada dalam **satu** keranjang/keranjang pesanan yang sama, bukan dua keranjang terpisah | FR-009 |

### 16.3 Inventaris & Bundle

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-021 | Admin terautentikasi di halaman Inventaris | Admin menambah alat dengan data lengkap & valid | Alat tersimpan, muncul di katalog, dan tercatat pada audit log | FR-017, FR-025, BR-030 |
| AC-022 | Admin mengubah status alat menjadi `RUSAK` | Perubahan disimpan | Alat tidak lagi tampil sebagai tersedia di katalog | FR-018, BR-022 |
| AC-023 | Alat terikat pada transaksi sewa aktif | Admin mencoba menghapus alat | Sistem menolak dan menampilkan alasan | FR-019, BR-012 |
| AC-024 | Item satuan masih menjadi komponen bundle aktif | Admin mencoba menghapus item | Sistem menolak dan menyebutkan nama paket yang memakainya | FR-024, BR-013 |
| AC-025 | Admin membuat bundle dari 3 kode barang | Bundle disimpan | Bundle tampil di katalog dengan komposisi 3 item dan harga khusus | FR-021, FR-022 |
| AC-026 | Stok fisik alat berada pada/di bawah ambang minimum | Admin membuka Inventaris | Muncul peringatan/badge stok menipis pada baris alat tersebut | FR-026 |

### 16.4 Pembayaran

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-027 | Pesanan `MENUNGGU_PEMBAYARAN` | Pelanggan membuka halaman pembayaran | Tampil metode transfer bank & e-wallet, rincian biaya per item, biaya tambahan, dan total | FR-028, FR-031 |
| AC-028 | Gateway mengirim webhook pembayaran sukses dengan signature valid | Sistem menerima webhook | Status pesanan berubah ke `DIBAYAR` dan notifikasi konfirmasi terkirim | FR-029, FR-033, BR-016 |
| AC-029 | Pesanan masih `MENUNGGU_PEMBAYARAN` | Gateway mengirim webhook dengan signature **tidak** valid | Sistem menolak, mencatat log, dan status pesanan **tidak** berubah | FR-029, BR-016 |
| AC-030 | Pesanan `MENUNGGU_PEMBAYARAN` | Webhook identik diterima 3 kali | Status berubah ke `DIBAYAR` **satu kali**; tidak ada pencatatan pembayaran ganda | FR-034, BR-017 |
| AC-031 | Pesanan dibuat 25 jam lalu dan belum dibayar | Sistem menjalankan pemeriksaan kedaluwarsa | Status menjadi `GAGAL_KEDALUWARSA`, kunci stok dilepas, notifikasi pembatalan terkirim | FR-030, BR-015 |

### 16.5 Serah-Terima, Pengembalian & Denda

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-032 | Pesanan berstatus `DIBAYAR` | Petugas mengisi checklist serah terima lengkap dan pelanggan mengonfirmasi | Status berubah ke `SEDANG_DISEWA` dan dokumentasi tersimpan | FR-036, FR-039, FR-041, BR-019 |
| AC-033 | Pesanan berstatus `SEDANG_DISEWA`, dikembalikan tepat waktu tanpa kerusakan | Petugas menyelesaikan checklist pengembalian | Stok alat kembali tersedia dan status menjadi `SELESAI` | FR-038, BR-021 |
| AC-034 | Pesanan `SEDANG_DISEWA`, dikembalikan 4 jam terlambat, tarif denda per jam diatur admin | Petugas mencatat waktu pengembalian aktual | Sistem menampilkan rincian denda; status menjadi `DIKEMBALIKAN` menunggu pelunasan | FR-037, FR-047, FR-049, BR-025 |
| AC-035 | Alat dikembalikan dengan kondisi rusak berat | Petugas menandai kondisi di checklist | Sistem menambahkan biaya ganti rugi dan alat **tidak** dikembalikan ke stok tersedia | FR-038, FR-048, BR-021, BR-026 |
| AC-036 | Rincian biaya tambahan telah tampil | Pelanggan melunasi denda secara daring | Sistem mencatat pelunasan dan status pesanan menjadi `SELESAI` | FR-050, BR-028 |
| AC-037 | Admin ingin membebaskan denda | Admin mengosongkan alasan penyesuaian | Sistem menolak dan mewajibkan alasan diisi | FR-051, BR-027 |
| AC-038 | Admin menyesuaikan denda dengan alasan "alat terlambat karena banjir" | Perubahan disimpan | Penyesuaian dan alasannya tercatat pada jejak audit | FR-051, BR-027, BR-030 |

### 16.6 Laporan, Riwayat & Otorisasi

| ID | Given | When | Then | Trace |
| --- | --- | --- | --- | --- |
| AC-039 | Akun Pelanggan/Petugas terautentikasi | Mengakses URL dashboard atau laporan admin | Akses ditolak (403) dan halaman tidak ditampilkan | FR-046, BR-023 |
| AC-040 | Pelanggan memiliki 3 pesanan, sedangkan pelanggan lain memiliki pesanan lain | Pelanggan membuka "Riwayat Saya" | Hanya 3 pesanan miliknya yang tampil | FR-044, BR-024 |
| AC-041 | Admin berada di halaman Laporan | Admin memfilter status `DIBAYAR` pada periode tertentu | Daftar hanya memuat pesanan `DIBAYAR` pada periode tersebut beserta ringkasannya | FR-042, FR-043 |
| AC-042 | Admin sudah memfilter laporan | Admin menekan tombol Ekspor | Berkas CSV/Excel terunduh dengan data sesuai filter aktif | FR-045 |

**Total Acceptance Criteria: 42** (41 AC untuk FR Must Have + AC-019b untuk FR-009)

---

## 17. MVP Scope

Prioritas mengikuti MoSCoW. Dasar penilaian: **apakah produk dapat beroperasi tanpa fitur
ini**, bukan daya tariknya.

### Must Have — Rilis 1.0 wajib berfungsi

| Modul | Cakupan | FR |
| --- | --- | --- |
| M1 Autentikasi | Registrasi + verifikasi email, login, pembatasan brute-force | FR-001–FR-006 |
| M2 Katalog & Pemesanan | Katalog satuan+bundle, keranjang, ketersediaan berbasis tanggal, kunci stok, estimasi biaya, validasi stok | FR-007–FR-014, FR-016 |
| M3 Inventaris | CRUD alat, status kondisi, proteksi hapus, bundle & harga khusus, pengurangan stok komponen | FR-017–FR-019, FR-021–FR-023 |
| M4 Pembayaran | Integrasi gateway, webhook + signature, batas waktu & auto-cancel, rincian biaya, notifikasi | FR-028–FR-031, FR-033 |
| M6 Laporan (subset) | Pembatasan akses dashboard/laporan admin | FR-046 |

### Should Have — Rilis 1.1

| Modul | Cakupan | FR |
| --- | --- | --- |
| M1 | Lupa kata sandi | FR-004 |
| M3 | Riwayat per kode barang, proteksi hapus komponen, log inventaris | FR-020, FR-024, FR-025 |
| M4 | Riwayat percobaan pembayaran, idempotensi webhook, rekonsiliasi manual | FR-032, FR-034, FR-035 |
| M5 | Checklist, perhitungan denda otomatis, pemulihan stok, dokumentasi, transisi status | FR-036–FR-039, FR-041 |
| M6 | Laporan dengan filter & ringkasan, riwayat pelanggan | FR-042–FR-044 |
| M7 | Perhitungan denda & ganti rugi, rincian biaya, pembayaran daring | FR-047–FR-050 |

> **⚠️ Catatan dependensi:** M5 dan M7 **harus** dirilis bersamaan. `[REQ-2.7]`
> Pengembalian alat memicu perhitungan denda; bila M5 rilis tanpa M7, proses
> pengembalian tidak dapat diselesaikan.

### Could Have — Rilis 1.2+

| Modul | Cakupan | FR |
| --- | --- | --- |
| M2 | Persistensi keranjang / draf pesanan | FR-015 |
| M3 | Ambang batas minimum stok + konfigurasinya | FR-026, FR-027 |
| M5 | Pengingat pengembalian | FR-040 |
| M6 | Ekspor laporan CSV/Excel | FR-045 |
| M7 | Penyesuaian/pembebasan denda dengan jejak audit | FR-051 |

### Won't Have — Versi ini

Aplikasi mobile native · Pengiriman alat (*delivery*) · Program loyalitas pelanggan ·
Multi-cabang/multi-gudang `[REQ-1.4]` · Pembayaran tunai · Perpanjangan sewa ·
Notifikasi WhatsApp · *Chat* pelanggan–admin.

---

## 18. Future Improvements

| # | Usulan | Nilai |
| --- | --- | --- |
| FI-01 | **Multi-cabang / multi-gudang** dengan ketersediaan per lokasi | Diperlukan bila bisnis berkembang; SRS sudah menandainya di luar lingkup |
| FI-02 | **Perpanjangan masa sewa** oleh pelanggan dari halaman Riwayat | Mengurangi friksi pelanggan yang ingin menambah hari |
| FI-03 | **Program loyalitas** (poin/diskon berulang) | Meningkatkan retensi |
| FI-04 | **Notifikasi WhatsApp** selain email | Tingkat buka pesan lebih tinggi di Indonesia |
| FI-05 | **Pembayaran tunai / di lokasi** untuk pelanggan tanpa rekening digital | Memperluas jangkauan |
| FI-06 | **Manajemen perawatan alat** (jadwal servis, riwayat perbaikan) | Memperpanjang umur alat |
| FI-07 | **Rekomendasi paket otomatis** berdasarkan tanggal & jumlah orang | Meningkatkan nilai keranjang |
| FI-08 | **Kalender ketersediaan visual** per alat | Memudahkan pemilihan tanggal |
| FI-09 | **Dasbor analitik lanjutan** (tren musiman, alat terpopuler) | Mendukung keputusan pengadaan |
| FI-10 | **Aplikasi mobile native / PWA** dengan mode offline untuk petugas lapangan | Petugas di lokasi terpencil sering tanpa sinyal |

---

## 19. Open Questions & Assumptions

### 19.1 Open Questions (perlu keputusan pemilik produk)

| ID | Pertanyaan | Mengapa Penting | Dampak bila tidak dijawab | Usulan |
| --- | --- | --- | --- | --- |
| OQ-01 | Siapa yang boleh membuat akun Admin dan Petugas Lapangan? Apakah ada *self-registration* untuk peran staf? | SRS §2.2 menyebut registrasi "petugas/admin", tetapi §4.1 hanya membahas pelanggan | Risiko celah keamanan bila siapa pun bisa mendaftar sebagai admin | `[REKOMENDASI]` Akun staf dibuatkan admin; tidak ada self-registration |
| OQ-02 | Apakah admin masih perlu **verifikasi pembayaran manual** padahal status diperbarui otomatis via webhook? | SRS §3.1 menyebut "halaman verifikasi pembayaran", sedangkan §4.4.2 mengklaim otomatis | Halaman P-17 bisa jadi tidak perlu → pemborosan effort | `[REKOMENDASI]` Ubah P-17 menjadi halaman **rekonsiliasi/pengecekan status**, bukan verifikasi manual |
| OQ-03 | Berapa ambang "penurunan performa yang signifikan" pada NFR-002? | Tidak testable tanpa angka | QA tidak dapat memverifikasi NFR | `[REKOMENDASI]` p95 ≤ 3 s pada 200 *concurrent users*, error rate < 1% |
| OQ-04 | Apakah data profil pelanggan dipakai ulang saat checkout, atau diminta ulang? | SRS tidak menyebut; memengaruhi jumlah langkah & UX | Developer bisa menebak → pengalaman pelanggan tidak konsisten | `[REKOMENDASI]` Pakai ulang data tersimpan (§10.2, AC-019) |
| OQ-05 | Apa yang harus terjadi bila harga berubah setelah item masuk keranjang? | SRS tidak mendefinisikan (KONTRADIKSI-03) | Risiko sengketa harga dengan pelanggan | `[REKOMENDASI]` Snapshot harga saat checkout + konfirmasi ulang |
| OQ-06 | Bagaimana perilaku bila tarif denda belum diatur admin sementara pengembalian terjadi? | SRS tidak mendefinisikan (KONTRADIKSI-04) | Proses pengembalian gagal total | `[REKOMENDASI]` Tetapkan nilai default saat instalasi |
| OQ-07 | Apakah Petugas Lapangan boleh melakukan serah-terima atas nama admin, dan sebaliknya? | Matriks RBAC SRS tidak eksplisit | Kebingungan implementasi otorisasi | `[REKOMENDASI]` Admin **tidak** melakukan serah-terima; petugas **tidak** mengakses laporan |
| OQ-08 | Berapa lama masa berlaku token reset kata sandi dan token JWT? | NFR-012 menyebut "terbatas" tanpa angka | *Security review* tidak dapat diverifikasi | `[REKOMENDASI]` Reset: 30 menit · JWT akses: 15 menit · refresh: 7 hari |
| OQ-09 | Apakah pelanggan boleh membatalkan pesanan **setelah** `DIBAYAR`? | SRS tidak menyebut; hanya mendefinisikan status `DIBATALKAN` | Berpotensi kebutuhan **refund** yang sama sekali belum dirancang | `[REKOMENDASI]` Tidak boleh; hanya sebelum `DIBAYAR`. Pembatalan setelah bayar → proses manual di luar sistem |
| OQ-10 | Apakah perlu kuota minimum sewa (misal minimal 2 hari) atau deposit jaminan? | Tidak ada di SRS | Bisa jadi kebutuhan bisnis nyata yang terlewat | Perlu konfirmasi pemilik produk |
| OQ-11 | Bagaimana menangani alat yang dikembalikan tetapi **tidak lengkap** (pasak kurang) tanpa kerusakan? | SRS menyebut checklist kelengkapan, tetapi tidak mendefinisikan konsekuensi finansialnya | Perhitungan ganti rugi tidak jelas | `[REKOMENDASI]` Perlakukan sebagai ganti rugi komponen hilang |
| OQ-12 | Apakah laporan harus memisahkan pendapatan sewa vs pendapatan denda? | REQ-4.6.2 menyebut "total denda" terpisah dari pendapatan | Salah tafsir angka pendapatan | `[REKOMENDASI]` Pisahkan: Pendapatan Sewa · Pendapatan Denda · Pendapatan Ganti Rugi |

### 19.2 Assumptions

Seluruh asumsi berikut **belum dikonfirmasi** dan wajib diverifikasi sebelum implementasi:

| ID | Asumsi | Basis | Risiko bila salah |
| --- | --- | --- | --- |
| AS-01 | Admin & Petugas tidak melakukan *self-registration*; akunnya dibuatkan | SRS §2.7 "data awal diinput admin" | Celah eskalasi hak akses |
| AS-02 | Admin tidak melakukan operasi serah-terima lapangan | Peran dipisah pada SRS §2.3 | Matriks RBAC perlu diperluas |
| AS-03 | Guest dapat melihat katalog tanpa login; hanya checkout yang butuh autentikasi | BR-001 diturunkan dari REQ-4.2.3 | Alur katalog publik perlu dibatasi |
| AS-04 | Rusak **ringan** tidak dikenakan ganti rugi | REQ-4.7.2 hanya menyebut "rusak berat atau hilang" | Perlu kategori kondisi tambahan |
| AS-05 | Masa berlaku token reset kata sandi terbatas dan tidak dapat dipakai ulang | Praktik keamanan umum; SRS tidak menyebut | Risiko keamanan |
| AS-06 | Nomor telepon pelanggan mengikuti format Indonesia | Konteks produk lokal; SRS tidak menyebut format | Validasi perlu disesuaikan |
| AS-07 | Harga item di-*snapshot* saat pesanan dibuat, bukan saat pelunasan | Diturunkan dari kebutuhan konsistensi REQ-4.2.7 & REQ-4.4.4 | Sengketa harga |
| AS-08 | Penghapusan data alat dilakukan secara *soft delete* agar riwayat tetap utuh | Diperlukan oleh REQ-4.3.4 & REQ-4.3.3 | Riwayat transaksi kehilangan referensi |

### 19.3 Kontradiksi SRS yang Teridentifikasi

| ID | Deskripsi | Lokasi | Status |
| --- | --- | --- | --- |
| KONTRADIKSI-01 | Registrasi "petugas/admin" disebut, tetapi tidak ada requirement-nya | SRS §2.2 vs §4.1 | → OQ-01 |
| KONTRADIKSI-02 | Halaman verifikasi pembayaran manual vs klaim pembaruan otomatis via webhook | SRS §3.1 vs §4.4.2 | → OQ-02 |
| KONTRADIKSI-03 | Perubahan harga setelah item masuk keranjang tidak didefinisikan | SRS §4.2 | → OQ-05 |
| KONTRADIKSI-04 | Denda wajib dihitung otomatis, tetapi tarif mungkin belum diatur | REQ-4.5.2 vs REQ-4.7.1 | → OQ-06 |
| KONTRADIKSI-05 | "misalnya 1×24 jam" (tidak mengikat) vs penetapan tegas 1×24 jam | REQ-4.4.3 vs SRS §5.5 | → §12 BR-015 |
| KONTRADIKSI-06 | NFR performa tidak testable | SRS §5.1 | → OQ-03 |

---

## Lampiran Peta Traceability

### REQ (SRS) → FR (PRD) → AC

| REQ SRS | FR PRD | AC Terkait |
| --- | --- | --- |
| REQ-4.1.1 | FR-001 | AC-001, AC-002 |
| REQ-4.1.2 | FR-002, FR-006 | AC-001, AC-004, AC-007 |
| REQ-4.1.3 | FR-003 | AC-003 |
| REQ-4.1.4 | FR-004 | AC-006 |
| REQ-4.1.5 | FR-005 | AC-005 |
| REQ-4.2.1 | FR-007 | AC-008 |
| REQ-4.2.2 | FR-008 | AC-009 |
| REQ-4.2.3 | FR-009, FR-016 | AC-018, AC-019, AC-019b |
| REQ-4.2.4 | FR-010 | AC-010 |
| REQ-4.2.5 | FR-011 | AC-011 |
| REQ-4.2.6 | FR-012 | AC-012, AC-013, AC-014 |
| REQ-4.2.7 | FR-013 | AC-015 |
| REQ-4.2.8 | FR-014 | AC-016 |
| REQ-4.2.9 | FR-015 | *(Could Have — AC menyusul)* |
| REQ-4.3.1 | FR-017 | AC-021 |
| REQ-4.3.2 | FR-018 | AC-022 |
| REQ-4.3.3 | FR-019 | AC-023 |
| REQ-4.3.4 | FR-020 | *(Should Have)* |
| REQ-4.3.5 | FR-021 | AC-025 |
| REQ-4.3.6 | FR-022 | AC-025 |
| REQ-4.3.7 | FR-023 | AC-017 |
| REQ-4.3.8 | FR-024 | AC-024 |
| REQ-4.3.9 | FR-025 | AC-021 |
| REQ-4.3.10 | FR-026, FR-027 | AC-026 |
| REQ-4.4.1 | FR-028 | AC-027 |
| REQ-4.4.2 | FR-029 | AC-028, AC-029 |
| REQ-4.4.3 | FR-030 | AC-031 |
| REQ-4.4.4 | FR-031 | AC-027 |
| REQ-4.4.5 | FR-032 | *(Should Have)* |
| REQ-4.4.6 | FR-033 | AC-028 |
| REQ-4.4.7 | FR-034 | AC-030 |
| REQ-4.5.1 | FR-036 | AC-032 |
| REQ-4.5.2 | FR-037, FR-041 | AC-032, AC-034 |
| REQ-4.5.3 | FR-038 | AC-033, AC-035 |
| REQ-4.5.4 | FR-039 | AC-032 |
| REQ-4.5.5 | FR-040 | *(Could Have)* |
| REQ-4.6.1 | FR-042 | AC-041 |
| REQ-4.6.2 | FR-043 | AC-041 |
| REQ-4.6.3 | FR-044 | AC-040 |
| REQ-4.6.4 | FR-045 | AC-042 |
| REQ-4.6.5 | FR-046 | AC-039 |
| REQ-4.7.1 | FR-047 | AC-034 |
| REQ-4.7.2 | FR-048 | AC-035 |
| REQ-4.7.3 | FR-049 | AC-034 |
| REQ-4.7.4 | FR-050 | AC-036 |
| REQ-4.7.5 | FR-051 | AC-037, AC-038 |

> **Catatan cakupan AC:** target AC hanya untuk FR **Must Have**. FR Should/Could
> (FR-015, FR-020, FR-027, FR-032, FR-035, FR-040) sengaja belum diberi AC pada rilis
> dokumen ini — lihat §17 dan §19.2.

> **FR tanpa REQ asal:** FR-035 *(rekonsiliasi pembayaran)*, FR-006 *(redirect per peran)*,
> dan FR-027 *(ambang stok minimum)* adalah `[REKOMENDASI]`/`[ASUMSI]` yang ditambahkan
> PRD untuk menutup celah SRS. FR-035 sengaja tidak memiliki baris pada tabel di atas
> karena tidak diturunkan dari REQ mana pun — lihat §6.2 dan §19.1.

**Cakupan: 46/46 REQ SRS dipetakan ✅**

---

*Dokumen ini diturunkan dari `srs-app.md` v1.4. Setiap perubahan pada SRS wajib diikuti
peninjauan ulang bagian yang terdampak pada PRD ini (lihat §19.3 untuk kontradiksi yang
masih terbuka).*
