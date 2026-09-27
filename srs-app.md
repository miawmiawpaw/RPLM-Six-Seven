Spesifikasi Kebutuhan Perangkat Lunak Multimedia
untuk
Sistem Informasi Rental Alat Camping

Disusun oleh Kelompok Six Seven

- Ribby Julina Bangun / 2507431055 / Back-end Developer
- Fazri Reihansyah / 2507431058 / Front-end Developer
- Nadine Safira / 2507431027 / UI/UX Designer
- Fadlan Ahmad Kamil / 2507431064 / Project Manager

Program Studi D4 Teknik Multimedia Digital
Jurusan Teknik Informatika dan Komputer
Politeknik Negeri Jakarta
3 September 2026

Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SKPL) ini disusun untuk menguraikan
seluruh kebutuhan Sistem Informasi Rental Alat Camping, serta berfungsi sebagai
acuan dan kesepakatan bersama antara tim pengembang dan pemilik proyek.

---

## Daftar Isi

- [Riwayat Revisi](#riwayat-revisi)
- [1. Pendahuluan](#1-pendahuluan)
  - [1.1 Tujuan](#11-tujuan)
  - [1.2 Konvensi Dokumen](#12-konvensi-dokumen)
  - [1.3 Target Pembaca dan Saran Pembaca](#13-target-pembaca-dan-saran-pembaca)
  - [1.4 Ruang Lingkup Produk](#14-ruang-lingkup-produk)
  - [1.5 Referensi](#15-referensi)
- [2. Deskripsi Umum](#2-deskripsi-umum)
  - [2.1 Perspektif Produk](#21-perspektif-produk)
  - [2.2 Fungsi Produk](#22-fungsi-produk)
  - [2.3 Kelas dan Karakteristik Pengguna](#23-kelas-dan-karakteristik-pengguna)
  - [2.4 Lingkungan Operasi](#24-lingkungan-operasi)
  - [2.5 Batasan Desain dan Implementasi](#25-batasan-desain-dan-implementasi)
  - [2.6 Dokumentasi Pengguna](#26-dokumentasi-pengguna)
  - [2.7 Asumsi dan Ketergantungan](#27-asumsi-dan-ketergantungan)
  - [2.8 Daftar Status Pesanan](#28-daftar-status-pesanan)
- [3. Kebutuhan Antarmuka Eksternal](#3-kebutuhan-antarmuka-eksternal)
  - [3.1 Antarmuka Pengguna](#31-antarmuka-pengguna)
  - [3.2 Antarmuka Perangkat Keras](#32-antarmuka-perangkat-keras)
  - [3.3 Antarmuka Perangkat Lunak](#33-antarmuka-perangkat-lunak)
  - [3.4 Antarmuka Komunikasi](#34-antarmuka-komunikasi)
- [4. Fitur Sistem](#4-fitur-sistem)
  - [4.1 Registrasi dan Login Pengguna](#41-registrasi-dan-login-pengguna)
  - [4.2 Pencarian dan Pemesanan Alat Camping](#42-pencarian-dan-pemesanan-alat-camping)
  - [4.3 Pengelolaan Inventaris Alat Camping](#43-pengelolaan-inventaris-alat-camping)
  - [4.4 Pembayaran Sewa](#44-pembayaran-sewa)
  - [4.5 Serah-Terima dan Pengembalian Alat Camping](#45-serah-terima-dan-pengembalian-alat-camping)
  - [4.6 Laporan Transaksi dan Riwayat Penyewaan](#46-laporan-transaksi-dan-riwayat-penyewaan)
  - [4.7 Denda Keterlambatan dan Biaya Ganti Rugi](#47-denda-keterlambatan-dan-biaya-ganti-rugi)
- [5. Kebutuhan Non-Fungsional Lainnya](#5-kebutuhan-non-fungsional-lainnya)
  - [5.1 Kebutuhan Performa](#51-kebutuhan-performa)
  - [5.2 Kebutuhan Keselamatan](#52-kebutuhan-keselamatan)
  - [5.3 Kebutuhan Keamanan](#53-kebutuhan-keamanan)
  - [5.4 Atribut Kualitas](#54-atribut-kualitas)
  - [5.5 Aturan Bisnis](#55-aturan-bisnis)
- [Lampiran A. Pemetaan Kebutuhan ke Fitur](#lampiran-a-pemetaan-kebutuhan-ke-fitur)
- [Lampiran B. Istilah dan Singkatan](#lampiran-b-istilah-dan-singkatan)

---

## Riwayat Revisi

| Nama | Tanggal | Keterangan | Versi |
| --- | --- | --- | --- |
| Tim | 03/09/2026 | Dokumen SRS awal disusun untuk proyek Sistem Informasi Rental Alat Camping | 1.0 |
| Fadlan | 10/09/2026 | Melengkapi dokumen SRS (Bagian 2–5) | 1.1 |
| Fadlan | 23/09/2026 | Menambahkan fitur Laporan Transaksi (4.6) dan Denda (4.7); memperbaiki penomoran kebutuhan, aturan reservasi stok, serta format tabel dan istilah | 1.2 |
| Fadlan | 28/09/2026 | Konsistensi: menyeragamkan nama produk, merapikan tabel kelas pengguna (2.3), dan menghilangkan duplikasi aturan denda antara REQ-4.5.2 dan Fitur 4.7 | 1.3 |
| Fadlan | 28/09/2026 | Menambahkan subbab 2.8 Daftar Status Pesanan (state machine) dan subbab Kriteria Uji pada fitur prioritas Tinggi (4.1, 4.2, 4.3, 4.4, dan REQ-4.6.5); menambahkan ketergantungan Fitur 4.5→4.7 pada 2.7 | 1.4 |

> Catatan: setiap perubahan kebutuhan wajib dicatat pada tabel di atas dengan menaikkan
> nomor versi. Nomor kebutuhan (REQ-*) yang sudah pernah dirilis tidak boleh digunakan
> ulang untuk makna yang berbeda.

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini menjelaskan kebutuhan perangkat lunak untuk Sistem Informasi Rental Alat
Camping Versi 1.0. Dokumen ini mencakup seluruh kebutuhan fungsional dan
non-fungsional sistem, mulai dari proses pemesanan perlengkapan outdoor (tenda, carrier,
sleeping bag, kompor, dll.) oleh pendaki hingga pengelolaan inventaris dan transaksi oleh
pihak pengelola rental. Dokumen ini menjadi acuan utama bagi tim pengembang, penguji, dan
pemilik proyek selama proses perancangan, pengembangan, dan pengujian sistem.

### 1.2 Konvensi Dokumen

Setiap kebutuhan fungsional pada dokumen ini diberi kode unik dengan format
`REQ-<nomor fitur>.<nomor urut>`, misalnya `REQ-4.1.1`. Prioritas kebutuhan ditulis dalam
tiga tingkat: **Tinggi**, **Sedang**, dan **Rendah**. Kebutuhan dengan prioritas Tinggi wajib
dipenuhi pada rilis pertama, sedangkan prioritas Sedang dan Rendah dapat dikerjakan pada
iterasi berikutnya. Istilah "pengguna" yang tidak diberi keterangan lebih lanjut merujuk pada
pelanggan (pendaki/penyewa) kecuali dinyatakan lain. Setiap subbab fitur pada Bagian 4
mengikuti pola yang sama: **Deskripsi dan Prioritas**, **Urutan Stimulus/Respons**, dan
**Kebutuhan Fungsional**.

### 1.3 Target Pembaca dan Saran Pembaca

Dokumen ini ditujukan untuk beberapa kelompok pembaca: (1) pengembang perangkat lunak
yang akan merancang dan membangun sistem; (2) manajer proyek yang mengelola jadwal dan
sumber daya pengembangan; (3) pemilik/pengelola bisnis rental alat camping dan pendakian
selaku pemberi kebutuhan; dan (4) penguji (tester) yang akan memverifikasi bahwa sistem
berjalan sesuai kebutuhan. Pembaca baru disarankan membaca Bagian 2 (Deskripsi Umum)
terlebih dahulu untuk memahami gambaran besar sistem, sebelum masuk ke Bagian 4 (Fitur
Sistem) yang berisi kebutuhan fungsional secara rinci.

### 1.4 Ruang Lingkup Produk

Sistem Informasi Rental Alat Camping adalah aplikasi berbasis web yang dapat diakses
melalui komputer maupun perangkat smartphone (responsive), yang digunakan untuk
mengelola proses penyewaan alat camping secara digital. Sistem ini memungkinkan pelanggan
untuk mencari, memesan, dan membayar sewa alat camping secara mandiri (self-service),
sekaligus membantu pihak pengelola rental dalam mengelola data alat, jadwal ketersediaan
alat, transaksi pembayaran, serta proses serah-terima dan pengembalian alat.

Tujuan utama pengembangan sistem ini adalah untuk menggantikan proses pencatatan manual
(berbasis kertas atau spreadsheet) menjadi proses digital yang lebih cepat, akurat, dan minim
kesalahan, sekaligus memperluas jangkauan pemasaran rental alat camping kepada calon
pelanggan melalui akses daring.

Batasan ruang lingkup rilis 1.0:

- **Termasuk:** katalog satuan & paket (bundle), keranjang, pemesanan, pembayaran daring,
  pengelolaan inventaris, serah-terima & pengembalian, denda, dan laporan transaksi.
- **Tidak termasuk:** aplikasi mobile native, pengiriman alat (delivery), program loyalitas
  pelanggan, dan multi-cabang/multi-gudang.

### 1.5 Referensi

- IEEE Recommended Practice for Software Requirements Specifications (IEEE Std 830-1998).
- Template Analisis Kebutuhan Proyek Multimedia, dokumen internal tim pengembang.
- Dokumentasi resmi React.js, <https://react.dev>
- Dokumentasi resmi Node.js dan Express.js, <https://nodejs.org>, <https://expressjs.com>
- Dokumentasi resmi MySQL, <https://dev.mysql.com/doc>

---

## 2. Deskripsi Umum

### 2.1 Perspektif Produk

Sistem Informasi Rental Alat Camping merupakan produk baru yang berdiri sendiri. Sistem ini
menggantikan proses manual yang sebelumnya digunakan oleh pengelola rental outdoor. Secara
arsitektur, sistem terdiri atas tiga lapisan utama: (1) antarmuka pengguna (frontend) yang
dibangun menggunakan React.js dan dapat diakses melalui browser desktop maupun mobile;
(2) server aplikasi (backend) yang dibangun menggunakan Node.js dan Express.js untuk
menangani logika bisnis dan REST API; serta (3) basis data MySQL yang menyimpan seluruh
data pelanggan, inventaris alat, dan transaksi.

### 2.2 Fungsi Produk

Secara garis besar, sistem informasi rental alat camping menyediakan fungsi-fungsi berikut:

- Registrasi dan login akun pelanggan maupun petugas/admin.
- Pencarian alat pendakian berdasarkan kategori (tenda, tas/carrier, nesting, alat masak,
  lampu, dll.).
- Penyewaan alat secara custom/satuan (a la carte) maupun dalam bentuk paket (bundle),
  misalnya "Paket Camping 2 Orang" (berisi 1 tenda, 2 matras, 2 kursi lipat, dll.).
- Pemilihan tanggal sewa dan ketersediaan alat, serta pemesanan secara daring.
- Pengelolaan data inventaris alat oleh admin (tambah, ubah, hapus, atur jumlah stok dan
  kondisi alat).
- Pembayaran sewa secara daring melalui integrasi payment gateway.
- Proses serah-terima dan pengembalian alat serta pencatatan kondisi fisik dan
  kelengkapan.
- Penghitungan denda keterlambatan dan biaya ganti rugi kerusakan/kehilangan alat.
- Pengelolaan akun pengguna dan hak akses.
- Pembuatan laporan transaksi dan riwayat penyewaan alat.

### 2.3 Kelas dan Karakteristik Pengguna

| Kelas Pengguna | Karakteristik | Tingkat Kepentingan |
| --- | --- | --- |
| Pelanggan (Penyewa / Camper / Pendaki) | Keluarga, komunitas, pekerja kantoran (leisure camper), maupun pendaki gunung yang ingin menyewa alat; tingkat literasi digital bervariasi, mengakses web melalui browser. | Sangat penting; pengguna utama sistem. |
| Admin (Vendor / Pengelola Rental) | Pemilik atau pengelola bisnis persewaan alat camping; mengelola data inventaris, memverifikasi pembayaran, dan memantau transaksi usahanya. | Sangat penting; mengelola operasional katalog, stok, dan transaksi. |
| Petugas Lapangan / Mitra Campsite | Petugas persewaan alat camping; staf rental yang bertugas pada proses serah-terima dan pemeriksaan fisik alat; menggunakan perangkat mobile. | Penting; mendukung operasional harian di lapangan. |

### 2.4 Lingkungan Operasi

- **Sisi klien (frontend):** berjalan pada peramban modern (Chrome, Firefox, Safari, Edge) di
  desktop dan smartphone, responsive.
- **Sisi server (backend):** berjalan pada server Node.js LTS dengan Express.js di VPS/Cloud
  Linux.
- **Basis data:** MySQL versi 8.0 ke atas. Koneksi internet stabil diperlukan pada sisi klien
  dan server.

### 2.5 Batasan Desain dan Implementasi

- Sistem wajib dibangun menggunakan React.js, Node.js + Express.js, dan MySQL.
- Komunikasi frontend dan backend menggunakan REST API dengan format JSON.
- Akses via smartphone berbasis web responsive tanpa instalasi aplikasi native.
- Pembayaran terintegrasi dengan payment gateway pihak ketiga (transfer bank/e-wallet).
- Zona waktu seluruh data transaksi menggunakan Waktu Indonesia Barat (UTC+7).

### 2.6 Dokumentasi Pengguna

- Manual Pengguna untuk Pelanggan (panduan registrasi, pencarian alat, pemesanan, dan
  pembayaran).
- Manual Pengguna untuk Admin (panduan manajemen inventaris, verifikasi, dan laporan).
- Manual Pengguna untuk Petugas Lapangan (panduan checklist serah-terima dan pengembalian).
- Bantuan daring (FAQ) terkait syarat penyewaan alat camping.

### 2.7 Asumsi dan Ketergantungan

Status pesanan yang dirujuk pada Bagian 4 didefinisikan pada subbab 2.8.

- Pelanggan memiliki perangkat dengan akses internet dan browser HTML5.
- Sistem bergantung pada layanan payment gateway pihak ketiga.
- Data awal inventaris alat diinput oleh admin pada tahap awal implementasi.
- Alat diserahkan dan dikembalikan langsung di lokasi rental/mitra campsite (tidak ada
  pengiriman ke alamat pelanggan).
- Sistem mengandalkan layanan email pihak ketiga untuk verifikasi akun dan notifikasi.
- Fitur 4.5 (Serah-Terima) bergantung pada Fitur 4.7 (Denda) karena pengembalian alat
  memicu perhitungan denda/ganti rugi; keduanya disarankan dirilis pada iterasi yang sama.

### 2.8 Daftar Status Pesanan

Seluruh modul pada Bagian 4 merujuk pada himpunan status pesanan yang sama. Status pesanan
bersifat baku dan tidak boleh diubah namanya tanpa pembaruan dokumen ini.

| Kode Status | Nama Tampilan | Makna | Aktor Pemicu Transisi |
| --- | --- | --- | --- |
| `MENUNGGU_PEMBAYARAN` | Menunggu Pembayaran | Pesanan dibuat dan stok dikunci, menunggu pembayaran dalam batas waktu. | Pelanggan (buat pesanan) |
| `DIBAYAR` | Dibayar | Pembayaran terverifikasi, pesanan siap disiapkan. | Payment gateway (webhook) |
| `GAGAL_KEDALUWARSA` | Gagal/Kedaluwarsa | Pembayaran gagal atau melewati batas waktu; stok dilepas. | Sistem (otomatis) |
| `DISIAPKAN` | Disiapkan | Alat sedang disiapkan petugas untuk diserahkan. | Petugas Lapangan |
| `SEDANG_DISEWA` | Sedang Disewa | Alat sudah diserahkan dan berada di tangan pelanggan. | Petugas Lapangan (serah terima) |
| `DIKEMBALIKAN` | Dikembalikan | Alat telah dikembalikan dan diperiksa kondisinya. | Petugas Lapangan (pengembalian) |
| `SELESAI` | Selesai | Seluruh kewajiban termasuk denda/ganti rugi telah dilunasi; pesanan ditutup. | Sistem / Admin |
| `DIBATALKAN` | Dibatalkan | Pesanan dibatalkan pelanggan atau sistem; stok dilepas. | Pelanggan / Sistem |

Transisi status yang diizinkan:

- `MENUNGGU_PEMBAYARAN` → `DIBAYAR` (webhook sukses) / `GAGAL_KEDALUWARSA` (batas waktu
  terlampaui atau pembayaran gagal) / `DIBATALKAN` (dibatalkan pelanggan).
- `DIBAYAR` → `DISIAPKAN` → `SEDANG_DISEWA` (melalui serah terima, Fitur 4.5).
- `SEDANG_DISEWA` → `DIKEMBALIKAN` (melalui pengembalian, Fitur 4.5).
- `DIKEMBALIKAN` → `SELESAI` (setelah pelunasan denda/ganti rugi, Fitur 4.7; atau langsung
  apabila tidak ada biaya tambahan).

Status yang tergolong **aktif** untuk perhitungan ketersediaan stok (lihat REQ-4.2.5) adalah
`MENUNGGU_PEMBAYARAN`, `DIBAYAR`, `DISIAPKAN`, dan `SEDANG_DISEWA`.

---

## 3. Kebutuhan Antarmuka Eksternal

### 3.1 Antarmuka Pengguna

Antarmuka pelanggan dirancang sederhana dan intuitif, terdiri atas halaman beranda, pencarian
alat/katalog, detail barang, keranjang sewa (cart), formulir pemesanan, halaman pembayaran,
dan riwayat transaksi. Antarmuka admin menyediakan dashboard ringkasan transaksi, halaman
pengelolaan inventaris alat (tabel dengan fungsi tambah/ubah/hapus), halaman pengelolaan
paket bundle, halaman verifikasi pembayaran, serta halaman laporan. Antarmuka petugas
lapangan menyediakan daftar pesanan yang harus diserahkan/dikembalikan dan formulir
checklist kondisi alat. Seluruh halaman menggunakan tata letak responsive agar nyaman diakses
melalui smartphone maupun desktop. Tombol dan label menggunakan Bahasa Indonesia yang
sederhana. Pesan kesalahan (misalnya kegagalan input atau pembayaran) ditampilkan dengan
bahasa yang jelas dan actionable (memberi tahu pengguna langkah perbaikan).

### 3.2 Antarmuka Perangkat Keras

Sistem tidak memerlukan perangkat keras khusus. Pelanggan dan admin dapat mengakses sistem
melalui perangkat umum seperti komputer, laptop, tablet, atau smartphone yang terhubung ke
internet dan memiliki peramban web. Petugas lapangan disarankan menggunakan smartphone
atau tablet untuk mengisi checklist serah-terima di lapangan.

### 3.3 Antarmuka Perangkat Lunak

- **MySQL 8.0+**, basis data utama untuk menyimpan data pengguna, inventaris alat camping,
  dan transaksi.
- **Node.js (LTS) dan Express.js**, menyediakan REST API bagi frontend.
- **React.js**, membangun antarmuka pengguna sisi klien.
- **Payment Gateway** (pihak ketiga, misalnya Midtrans/Xendit), memproses transaksi
  pembayaran daring dan mengirimkan notifikasi status pembayaran ke backend melalui
  webhook.
- **Layanan pengiriman notifikasi** (email/SMS API), mengirim konfirmasi pemesanan dan
  pembayaran kepada pelanggan.

### 3.4 Antarmuka Komunikasi

- Komunikasi antara frontend dan backend menggunakan protokol HTTPS dengan format data
  JSON melalui REST API.
- Autentikasi antarmuka menggunakan token (JSON Web Token/JWT) yang dikirim pada header
  setiap permintaan yang membutuhkan otorisasi.
- Notifikasi email dikirim menggunakan protokol SMTP atau layanan API pihak ketiga.
- Callback/webhook dari payment gateway diterima melalui endpoint HTTPS khusus pada backend
  untuk memperbarui status pembayaran secara otomatis; keaslian notifikasi diverifikasi
  menggunakan signature key dari payment gateway.

---

## 4. Fitur Sistem

### 4.1 Registrasi dan Login Pengguna

#### 4.1.1 Deskripsi dan Prioritas

Fitur ini memungkinkan pelanggan baru membuat akun, serta pelanggan, petugas, dan admin yang
sudah terdaftar untuk masuk ke dalam sistem menggunakan email dan kata sandi. Prioritas
fitur ini: **Tinggi**.

#### 4.1.2 Urutan Stimulus/Respons

- Pengguna baru mengisi formulir registrasi (nama, email, nomor telepon, kata sandi) →
  sistem memvalidasi data → sistem mengirim email verifikasi → akun aktif setelah verifikasi
  berhasil.
- Pengguna memasukkan email dan kata sandi pada halaman login → sistem memverifikasi
  kredensial → sistem mengarahkan pengguna ke dashboard sesuai perannya.
- Pengguna memilih "lupa kata sandi" → sistem mengirim tautan reset ke email → pengguna
  menetapkan kata sandi baru → sistem mengonfirmasi perubahan.

#### 4.1.3 Kebutuhan Fungsional

- **REQ-4.1.1:** Sistem harus menyediakan formulir registrasi dengan validasi format email
  dan kekuatan kata sandi minimal 8 karakter. *(Prioritas: Tinggi)*
- **REQ-4.1.2:** Sistem harus mengirimkan email verifikasi akun setelah pendaftaran berhasil
  dan menonaktifkan akses login sebelum akun terverifikasi. *(Tinggi)*
- **REQ-4.1.3:** Sistem harus menampilkan pesan kesalahan yang jelas apabila email sudah
  terdaftar sebelumnya. *(Tinggi)*
- **REQ-4.1.4:** Sistem harus menyediakan fitur "lupa kata sandi" untuk mengatur ulang kata
  sandi melalui email. *(Tinggi)*
- **REQ-4.1.5:** Sistem harus membatasi percobaan login yang gagal maksimal 5 kali dalam
  15 menit untuk mencegah serangan brute-force. *(Tinggi)*

#### 4.1.4 Kriteria Uji

| REQ | Skenario Uji | Hasil yang Diharapkan |
| --- | --- | --- |
| REQ-4.1.1 | Registrasi dengan email `budi@mail.com` dan kata sandi `123` | Sistem menolak dan menampilkan kesalahan "kata sandi minimal 8 karakter" |
| REQ-4.1.2 | Registrasi berhasil dengan email baru | Email verifikasi terkirim; login sebelum verifikasi ditolak dengan pesan "akun belum terverifikasi" |
| REQ-4.1.3 | Registrasi dengan email yang sudah terdaftar | Sistem menampilkan pesan kesalahan bahwa email sudah terdaftar; akun tidak digandakan |
| REQ-4.1.4 | Klik "lupa kata sandi", isi email terdaftar, tetapkan kata sandi baru | Tautan reset terkirim; login dengan kata sandi baru berhasil, kata sandi lama gagal |
| REQ-4.1.5 | Lakukan 6 kali login dengan kata sandi salah dalam 15 menit | Percobaan ke-6 ditolak dengan pesan pembatasan sementara, meskipun kata sandi benar |

### 4.2 Pencarian dan Pemesanan Alat Camping

#### 4.2.1 Deskripsi dan Prioritas

Fitur ini memungkinkan pelanggan mencari alat yang tersedia berdasarkan kategori (Tenda,
Carrier, dll.) atau mencari Paket Sewa (Bundle), lalu memasukkannya ke keranjang sewa untuk
pemesanan. Pelanggan dapat menyewa secara satuan maupun paket. Prioritas fitur ini:
**Tinggi**.

#### 4.2.2 Urutan Stimulus/Respons

- Pelanggan memasukkan rentang tanggal sewa pada halaman pencarian → sistem menampilkan
  daftar alat satuan dan paket bundle yang stoknya tersedia.
- Pelanggan memilih alat satuan atau paket bundle (memasukkan ke keranjang) → sistem
  menghitung estimasi biaya → pelanggan mengonfirmasi pesanan → sistem membuat data pesanan
  berstatus "Menunggu Pembayaran" dan mengunci stok sementara.

#### 4.2.3 Kebutuhan Fungsional

- **REQ-4.2.1:** Sistem harus menampilkan katalog barang yang terbagi antara penyewaan item
  satuan dan penyewaan paket (bundle). *(Tinggi)*
- **REQ-4.2.2:** Sistem harus menampilkan rincian item apa saja yang termasuk di dalam
  sebuah paket bundle beserta harga total paket tersebut. *(Tinggi)*
- **REQ-4.2.3:** Sistem harus memfasilitasi pemesanan gabungan, di mana pelanggan dapat
  memasukkan paket bundle dan item satuan tambahan ke dalam satu keranjang pesanan (cart).
  *(Tinggi)*
- **REQ-4.2.4:** Sistem harus memfilter dan menampilkan ketersediaan paket bundle secara
  dinamis, yang bergantung pada ketersediaan masing-masing item satuan penyusun paket
  tersebut pada tanggal yang dipilih. *(Tinggi)*
- **REQ-4.2.5:** Sistem harus menghitung ketersediaan alat per rentang tanggal dengan rumus
  `stok tersedia = stok fisik − jumlah unit yang terikat pada pesanan berstatus aktif
  (Menunggu Pembayaran, Dibayar, Disiapkan, Sedang Disewa) pada rentang tanggal yang
  beririsan`, sehingga satu unit tidak dapat dipesan dua kali pada periode yang sama.
  *(Tinggi)*
- **REQ-4.2.6:** Sistem harus mengunci (reservasi) stok alat satuan dan/atau komponen bundle
  pada saat pesanan dibuat, dan melepaskan kunci secara otomatis apabila pesanan dibatalkan
  atau kedaluwarsa. *(Tinggi)*
- **REQ-4.2.7:** Sistem harus menghitung estimasi biaya sewa berdasarkan tarif harian
  dikalikan jumlah hari sewa (dihitung inklusif dari tanggal mulai sampai tanggal selesai)
  dikalikan kuantitas, ditambah biaya tambahan bila ada, dan menampilkannya sebelum
  pelanggan mengonfirmasi pesanan. *(Tinggi)*
- **REQ-4.2.8:** Sistem harus mencegah pelanggan mengonfirmasi pesanan apabila jumlah yang
  diminta melebihi stok tersedia, dan menampilkan pesan kekurangan stok yang jelas.
  *(Tinggi)*
- **REQ-4.2.9:** Sistem harus menyimpan item keranjang dan/atau draf pesanan apabila
  pelanggan keluar sebelum menyelesaikan pemesanan. *(Rendah)*

#### 4.2.4 Kriteria Uji

| REQ | Skenario Uji | Hasil yang Diharapkan |
| --- | --- | --- |
| REQ-4.2.1 | Buka halaman katalog tanpa filter | Katalog tampil terpisah antara item satuan dan paket bundle |
| REQ-4.2.2 | Buka detail "Paket Camping 2 Orang" | Tampil daftar komponen (1 tenda, 2 matras, 2 kursi lipat) dan harga total paket |
| REQ-4.2.3 | Tambahkan 1 bundle dan 2 item satuan ke keranjang | Keranjang memuat ketiga item tersebut dalam satu pesanan |
| REQ-4.2.4 | Pilih rentang tanggal saat salah satu komponen bundle stoknya habis | Bundle ditampilkan tidak tersedia dengan alasan komponen yang kurang |
| REQ-4.2.5 | Pesan 1 tenda untuk tanggal 1–3, lalu pesan tenda yang sama untuk tanggal 2–4 pada stok fisik 1 | Pesanan kedua ditolak karena stok tersedia = 0 pada rentang beririsan |
| REQ-4.2.6 | Buat pesanan lalu batalkan sebelum batas waktu | Stok yang terkunci dilepas kembali dan tersedia untuk pesanan lain |
| REQ-4.2.7 | Sewa item tarif Rp25.000/hari, tanggal 1–3, kuantitas 2 | Estimasi biaya = Rp150.000 (3 hari inklusif × 2 × Rp25.000) sebelum konfirmasi |
| REQ-4.2.8 | Konfirmasi pesanan dengan kuantitas melebihi stok tersedia | Pesanan tidak dapat dikonfirmasi; muncul pesan kekurangan stok |

### 4.3 Pengelolaan Inventaris Alat Camping

#### 4.3.1 Deskripsi dan Prioritas

Fitur ini digunakan oleh admin untuk mengelola data unit perlengkapan camping (item satuan),
mengatur jumlah stok fisik, serta membuat dan mengelola komposisi Paket Sewa (Bundle).
Prioritas fitur ini: **Tinggi**.

#### 4.3.2 Urutan Stimulus/Respons

- Admin membuka halaman pengelolaan bundle → membuat paket baru dengan memberi nama paket,
  memasukkan item-item satuan ke dalamnya, dan menentukan harga diskon paket → sistem
  menyimpan komposisi bundle.
- Admin menambah/mengubah data alat (kategori, merk, nama, stok, tarif, foto/video) → sistem
  memvalidasi input → sistem menyimpan dan memperbarui katalog.
- Admin mengubah status kondisi fisik alat → sistem memperbarui ketersediaan alat tersebut
  pada katalog.

#### 4.3.3 Kebutuhan Fungsional

- **REQ-4.3.1:** Sistem harus menyediakan formulir untuk menambah, mengubah, dan menghapus
  data alat camping (kategori, merk, nama barang, stok, tarif sewa, beberapa foto dan video).
  *(Tinggi)*
- **REQ-4.3.2:** Sistem harus memungkinkan admin mengubah status kondisi fisik alat secara
  manual (Tersedia, Sedang Disewa, Rusak/Perlu Perbaikan, Hilang). *(Tinggi)*
- **REQ-4.3.3:** Sistem harus mencegah penghapusan data alat yang masih tercantum dalam
  transaksi sewa aktif. *(Tinggi)*
- **REQ-4.3.4:** Sistem harus menampilkan riwayat penyewaan untuk masing-masing kode
  barang/alat. *(Sedang)*
- **REQ-4.3.5:** Sistem harus menyediakan antarmuka bagi admin untuk merakit/membuat paket
  bundle baru dengan menggabungkan beberapa kode barang (item satuan) yang sudah ada di
  basis data. *(Tinggi)*
- **REQ-4.3.6:** Sistem harus memungkinkan admin menentukan harga khusus untuk paket bundle
  (yang biasanya lebih murah dibandingkan total harga item satuan). *(Tinggi)*
- **REQ-4.3.7:** Sistem harus secara otomatis mengurangi stok item satuan yang terkait
  ketika sebuah paket bundle berhasil dipesan oleh pelanggan (misal: pesanan 1 "Paket
  Tenda" otomatis mengunci stok 1 tenda dan 2 matras). *(Tinggi)*
- **REQ-4.3.8:** Sistem harus mencegah admin menghapus item satuan yang masih menjadi
  komponen suatu paket bundle aktif. *(Sedang)*
- **REQ-4.3.9:** Sistem harus mencatat (log) setiap penambahan, perubahan, dan penghapusan
  data inventaris beserta identitas admin dan waktu perubahan. *(Sedang)*
- **REQ-4.3.10:** Sistem harus menampilkan peringatan kepada admin ketika stok fisik suatu
  alat berada pada atau di bawah ambang batas minimum yang ditentukan. *(Rendah)*

#### 4.3.4 Kriteria Uji

| REQ | Skenario Uji | Hasil yang Diharapkan |
| --- | --- | --- |
| REQ-4.3.1 | Tambah alat baru, lalu ubah, lalu hapus (tanpa transaksi aktif) | Data tersimpan dan katalog diperbarui pada setiap aksi |
| REQ-4.3.2 | Ubah status kondisi alat menjadi "Rusak/Perlu Perbaikan" | Alat tidak tampil sebagai tersedia pada katalog |
| REQ-4.3.3 | Hapus alat yang masih terikat transaksi sewa aktif | Sistem menolak penghapusan dan menampilkan alasan |
| REQ-4.3.5 | Rakit bundle baru dari 3 kode barang yang sudah ada | Bundle tersimpan dengan komposisi 3 item tersebut |
| REQ-4.3.6 | Tetapkan harga bundle lebih murah dari total harga item satuan | Harga khusus bundle tersimpan dan tampil pada katalog |
| REQ-4.3.7 | Pesan 1 "Paket Tenda" (1 tenda + 2 matras) | Stok 1 tenda dan 2 matras otomatis berkurang/terkunci |

### 4.4 Pembayaran Sewa

#### 4.4.1 Deskripsi dan Prioritas

Fitur ini menangani proses pembayaran biaya sewa oleh pelanggan melalui metode pembayaran
daring yang terintegrasi dengan payment gateway. Prioritas fitur ini: **Tinggi**.

#### 4.4.2 Urutan Stimulus/Respons

- Pelanggan memilih metode pembayaran pada pesanan berstatus "Menunggu Pembayaran" → sistem
  membuat transaksi ke payment gateway → gateway menampilkan instruksi pembayaran → pelanggan
  menyelesaikan pembayaran.
- Payment gateway mengirim webhook status pembayaran ke sistem → sistem memverifikasi
  signature → sistem memperbarui status pesanan menjadi "Dibayar" atau "Gagal/Kedaluwarsa".
- Pesanan tidak dibayar hingga batas waktu → sistem membatalkan pesanan dan melepaskan kunci
  stok → sistem mengirim notifikasi pembatalan ke pelanggan.

#### 4.4.3 Kebutuhan Fungsional

- **REQ-4.4.1:** Sistem harus terintegrasi dengan payment gateway pihak ketiga yang
  mendukung transfer bank dan e-wallet. *(Tinggi)*
- **REQ-4.4.2:** Sistem harus memperbarui status pesanan secara otomatis berdasarkan
  notifikasi (webhook) dari payment gateway, dan memverifikasi keaslian webhook melalui
  signature sebelum memproses perubahan status. *(Tinggi)*
- **REQ-4.4.3:** Sistem harus menampilkan batas waktu pembayaran (misalnya 1x24 jam) dan
  membatalkan otomatis pesanan yang tidak dibayar hingga batas waktu tersebut. *(Tinggi)*
- **REQ-4.4.4:** Sistem harus menampilkan ringkasan rincian biaya (biaya sewa per item,
  biaya tambahan, dan total yang harus dibayar) pada halaman pembayaran. *(Tinggi)*
- **REQ-4.4.5:** Sistem harus menyimpan riwayat setiap percobaan pembayaran beserta status,
  waktu, metode, dan referensi transaksi dari payment gateway. *(Sedang)*
- **REQ-4.4.6:** Sistem harus mengirimkan notifikasi konfirmasi kepada pelanggan setelah
  pembayaran berhasil diverifikasi. *(Tinggi)*
- **REQ-4.4.7:** Sistem harus menangani webhook secara idempoten, sehingga notifikasi yang
  diterima berulang tidak menggandakan perubahan status atau pencatatan transaksi.
  *(Sedang)*

#### 4.4.4 Kriteria Uji

| REQ | Skenario Uji | Hasil yang Diharapkan |
| --- | --- | --- |
| REQ-4.4.1 | Pilih metode pembayaran transfer bank dan e-wallet | Kedua metode tersedia dan memproses transaksi ke payment gateway |
| REQ-4.4.2 | Kirim webhook pembayaran sukses dengan signature valid, lalu ulangi dengan signature tidak valid | Transaksi pertama mengubah status menjadi `DIBAYAR`; transaksi kedua ditolak |
| REQ-4.4.3 | Buat pesanan dan biarkan tanpa pembayaran melewati 1×24 jam | Pesanan otomatis berstatus `GAGAL_KEDALUWARSA` dan kunci stok dilepas |
| REQ-4.4.4 | Buka halaman pembayaran | Tampil rincian biaya per item, biaya tambahan, dan total yang harus dibayar |
| REQ-4.4.6 | Selesaikan pembayaran hingga terverifikasi | Notifikasi konfirmasi terkirim ke pelanggan |

### 4.5 Serah-Terima dan Pengembalian Alat Camping

#### 4.5.1 Deskripsi dan Prioritas

Fitur ini digunakan oleh petugas lapangan untuk mencatat kelengkapan dan kondisi alat
(misalnya menghitung jumlah pasak, mengecek sobekan tenda) pada saat diserahkan ke pelanggan
dan dikembalikan. Prioritas fitur ini: **Sedang**.

#### 4.5.2 Urutan Stimulus/Respons

- Petugas membuka daftar pesanan yang telah dibayar → memilih pesanan → mengisi checklist
  kondisi dan kelengkapan setiap komponen saat serah terima → pelanggan mengonfirmasi →
  sistem mengubah status pesanan menjadi "Sedang Disewa".
- Pelanggan mengembalikan alat → petugas mengisi checklist kondisi pengembalian dan mencatat
  keterlambatan/kerusakan/kehilangan bila ada → sistem menghitung denda dan biaya ganti rugi
  → sistem menutup pesanan dan mengembalikan stok alat yang layak sewa.

#### 4.5.3 Kebutuhan Fungsional

- **REQ-4.5.1:** Sistem harus menyediakan formulir/checklist pencatatan kondisi dan
  kelengkapan setiap komponen alat pada saat serah terima dan pengembalian. *(Sedang)*
- **REQ-4.5.2:** Sistem harus memicu perhitungan denda keterlambatan dan/atau biaya ganti
  rugi berdasarkan waktu pengembalian aktual dan kondisi alat yang diinput petugas, dengan
  rumus dan tarif mengikuti aturan pada Fitur 4.7. *(Sedang)*
- **REQ-4.5.3:** Sistem harus menambah kembali stok ketersediaan alat secara otomatis setelah
  proses pengembalian selesai dicatat, kecuali ditandai perlu perbaikan/rusak. *(Sedang)*
- **REQ-4.5.4:** Sistem harus menyimpan dokumentasi hasil serah terima dan pengembalian,
  mencakup waktu, identitas petugas, checklist kondisi, dan foto alat (bila tersedia).
  *(Sedang)*
- **REQ-4.5.5:** Sistem harus mengirimkan pengingat pengembalian kepada pelanggan sebelum
  tanggal pengembalian yang disepakati. *(Rendah)*

### 4.6 Laporan Transaksi dan Riwayat Penyewaan

#### 4.6.1 Deskripsi dan Prioritas

Fitur ini digunakan oleh admin untuk memantau kinerja usaha melalui ringkasan transaksi,
serta menyediakan riwayat penyewaan bagi pelanggan. Prioritas fitur ini: **Sedang**.

#### 4.6.2 Urutan Stimulus/Respons

- Admin membuka dashboard → sistem menampilkan ringkasan jumlah pesanan, pendapatan, dan
  status pesanan terbaru.
- Admin memilih rentang tanggal dan filter (status pesanan, kategori alat, metode pembayaran)
  → sistem menampilkan daftar transaksi sesuai filter → admin mengekspor hasilnya.
- Pelanggan membuka menu riwayat → sistem menampilkan daftar pesanan beserta detail dan
  status terkini.

#### 4.6.3 Kebutuhan Fungsional

- **REQ-4.6.1:** Sistem harus menyediakan laporan transaksi yang dapat difilter berdasarkan
  rentang tanggal, status pesanan, kategori alat, dan metode pembayaran. *(Sedang)*
- **REQ-4.6.2:** Sistem harus menampilkan ringkasan pendapatan, jumlah pesanan, jumlah alat
  yang disewa, serta total denda pada periode yang dipilih. *(Sedang)*
- **REQ-4.6.3:** Sistem harus menyediakan riwayat penyewaan bagi pelanggan, mencakup daftar
  pesanan, detail alat yang disewa, dan status terkini setiap pesanan. *(Sedang)*
- **REQ-4.6.4:** Sistem harus memungkinkan admin mengekspor laporan transaksi ke berkas CSV
  atau Excel. *(Rendah)*
- **REQ-4.6.5:** Sistem harus membatasi akses laporan dan dashboard hanya untuk pengguna
  dengan peran admin. *(Tinggi)*

#### 4.6.4 Kriteria Uji

| REQ | Skenario Uji | Hasil yang Diharapkan |
| --- | --- | --- |
| REQ-4.6.5 | Akses halaman laporan/dashboard menggunakan akun pelanggan atau petugas | Akses ditolak (HTTP 403) dan halaman tidak ditampilkan |

### 4.7 Denda Keterlambatan dan Biaya Ganti Rugi

#### 4.7.1 Deskripsi dan Prioritas

Fitur ini mengatur perhitungan dan penagihan denda akibat pengembalian yang terlambat serta
biaya ganti rugi akibat kerusakan atau kehilangan alat. Prioritas fitur ini: **Sedang**.

#### 4.7.2 Urutan Stimulus/Respons

- Petugas mencatat waktu pengembalian aktual dan kondisi alat → sistem membandingkan waktu
  aktual dengan waktu yang disepakati → sistem menghitung denda dan/atau biaya ganti rugi
  sesuai aturan yang berlaku → sistem menampilkan rincian biaya kepada petugas dan pelanggan.
- Pelanggan menerima rincian biaya tambahan → pelanggan membayar melalui mekanisme
  pembayaran daring yang tersedia → sistem mencatat pelunasan dan menutup pesanan.

#### 4.7.3 Kebutuhan Fungsional

- **REQ-4.7.1:** Sistem harus menghitung denda keterlambatan berdasarkan tarif denda yang
  dapat diatur admin, dengan tarif berbeda untuk keterlambatan dalam satuan jam dan dalam
  satuan hari. *(Sedang)*
- **REQ-4.7.2:** Sistem harus memungkinkan admin menentukan besaran biaya ganti rugi per
  alat untuk kondisi rusak berat atau hilang. *(Sedang)*
- **REQ-4.7.3:** Sistem harus menampilkan rincian komponen biaya tambahan (durasi
  keterlambatan, denda, kerusakan/kehilangan, biaya ganti rugi, dan total) kepada pelanggan
  sebelum pelunasan. *(Sedang)*
- **REQ-4.7.4:** Sistem harus menyediakan mekanisme pembayaran daring untuk denda dan biaya
  ganti rugi. *(Sedang)*
- **REQ-4.7.5:** Sistem harus memungkinkan admin menyesuaikan atau membebaskan denda pada
  kasus tertentu, dengan mencatat alasan penyesuaian sebagai jejak audit. *(Rendah)*

---

## 5. Kebutuhan Non-Fungsional Lainnya

### 5.1 Kebutuhan Performa

Waktu muat (loading) halaman utama tidak lebih dari 3 detik pada koneksi internet standar
(4G). Sistem harus mampu menangani minimal 200 pengguna aktif secara bersamaan tanpa
penurunan performa yang signifikan. Waktu respons REST API untuk operasi baca tidak lebih
dari 1 detik dan untuk operasi tulis tidak lebih dari 3 detik pada kondisi beban normal.

### 5.2 Kebutuhan Keselamatan

Sistem harus memvalidasi seluruh input pengguna untuk mencegah kesalahan data yang dapat
menyebabkan kerugian finansial, dan melakukan backup berkala. Backup basis data dilakukan
harian secara otomatis dengan retensi minimal 7 hari. Selain itu, sistem harus mencatat jejak
audit (audit trail) untuk aktivitas yang bersifat kritikal, seperti perubahan data inventaris,
perubahan status pembayaran, dan pembatalan pesanan.

### 5.3 Kebutuhan Keamanan

Kata sandi disimpan terenkripsi (hashing, misal bcrypt), komunikasi wajib HTTPS, menerapkan
role-based access control, dan pembayaran ditangani oleh payment gateway bersertifikasi
PCI-DSS. Token JWT memiliki masa berlaku terbatas dan dapat diperbarui (refresh). Endpoint
webhook payment gateway diverifikasi menggunakan signature key, dan endpoint tersebut hanya
menerima permintaan dari alamat/layanan payment gateway yang sah.

### 5.4 Atribut Kualitas

- **Usability:** intuitif tanpa pelatihan khusus; alur pemesanan dapat diselesaikan dalam
  langkah yang terbatas.
- **Reliability:** uptime minimal 99%.
- **Maintainability:** struktur MVC/REST API dengan pemisahan tanggung jawab yang jelas.
- **Portability:** responsive design, berjalan pada peramban modern di desktop dan mobile.
- **Scalability:** dapat ditingkatkan kapasitasnya untuk mendukung pertumbuhan jumlah alat dan
  transaksi.

### 5.5 Aturan Bisnis

- Hanya admin yang dapat menambah/mengubah/menghapus data alat dan mengelola paket bundle.
- Pesanan yang tidak dibayar dalam 1x24 jam batal otomatis dan kunci stoknya dilepaskan.
- Stok alat dikunci saat pesanan dibuat, bukan saat pelanggan membuka keranjang.
- Denda keterlambatan dan biaya ganti rugi dihitung berdasarkan aturan yang ditentukan admin.
- Alat yang ditandai rusak atau hilang tidak dapat disewakan kembali sebelum admin mengubah
  statusnya menjadi Tersedia.

---

## Lampiran A. Pemetaan Kebutuhan ke Fitur

| Kode Fitur | Nama Fitur | Jumlah REQ | Prioritas |
| --- | --- | --- | --- |
| 4.1 | Registrasi dan Login Pengguna | 5 | Tinggi |
| 4.2 | Pencarian dan Pemesanan Alat Camping | 9 | Tinggi |
| 4.3 | Pengelolaan Inventaris Alat Camping | 10 | Tinggi |
| 4.4 | Pembayaran Sewa | 7 | Tinggi |
| 4.5 | Serah-Terima dan Pengembalian Alat Camping | 5 | Sedang |
| 4.6 | Laporan Transaksi dan Riwayat Penyewaan | 5 | Sedang |
| 4.7 | Denda Keterlambatan dan Biaya Ganti Rugi | 5 | Sedang |
| **Total** |  | **46** |  |

## Lampiran B. Istilah dan Singkatan

| Istilah | Keterangan |
| --- | --- |
| SKPL/SRS | Spesifikasi Kebutuhan Perangkat Lunak |
| Item satuan | Satu unit alat camping yang dapat disewa secara terpisah |
| Bundle/Paket | Kumpulan item satuan yang disewakan sebagai satu paket dengan harga khusus |
| REQ | Kode unik untuk kebutuhan fungsional |
| REST API | Antarmuka komunikasi berbasis HTTP dengan format JSON |
| JWT | JSON Web Token, token autentikasi |
| Webhook | Notifikasi otomatis dari payment gateway ke backend |
| RBAC | Role-Based Access Control, pembatasan akses berdasarkan peran |
| PCI-DSS | Standar keamanan industri kartu pembayaran |
| Checklist | Formulir pemeriksaan kondisi dan kelengkapan alat |
