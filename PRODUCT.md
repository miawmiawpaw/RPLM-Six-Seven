# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Pelanggan (penyewa):** keluarga, komunitas, pekerja kantoran yang berkemah santai, dan pendaki. Literasi digital bervariasi, mayoritas membuka lewat browser HP. Tugasnya: mencari alat atau paket, melihat ketersediaan pada tanggalnya, memesan, membayar, lalu mengambil dan mengembalikan alat.
- **Petugas lapangan:** staf rental yang menangani serah-terima dan pengembalian di lokasi, memakai perangkat mobile, mengisi checklist kondisi alat.
- **Admin (pengelola rental):** mengelola inventaris dan stok, memantau pesanan, denda, dan laporan.

## Product Purpose

Sistem informasi rental alat camping berbasis web: mengganti pencatatan manual (kertas atau spreadsheet) dengan proses digital yang lebih cepat, akurat, dan minim salah hitung, sambil memperluas jangkauan calon pelanggan lewat akses daring. Keberhasilan: seluruh alur sewa (katalog, pesan, bayar, serah-terima, pengembalian, denda) berjalan tanpa pencatatan manual paralel, dan satu unit alat tidak pernah dipesan dobel pada periode yang beririsan.

Ini proyek kelompok UAS mata kuliah RPLM (kelompok Six Seven, D4 Teknik Multimedia Digital PNJ, Project Manager Fadlan), dengan SRS sebagai sumber kebutuhan otoritatif (`srs-app.md`).

## Positioning

Belum diputuskan. Pemilik produk belum meneliti situs rental camping sejenis, jadi pembeda utama terhadap pesaing belum dikonfirmasi. Jangan menulis klaim "lebih baik dari" atau "satu-satunya" di antarmuka atau salinan. Kemampuan yang faktual ada di kode (ketersediaan per tanggal, paket bundle, checklist serah-terima, denda), tetapi belum dipilih sebagai klaim pembeda.

## Operating Context

- Siklus pesanan: pelanggan memilih tanggal sewa, memesan alat atau paket, membayar lewat Midtrans (sandbox), petugas melakukan serah-terima dengan checklist, pengembalian dicek, denda dihitung bila ada.
- Pesanan yang tidak dibayar dalam 1x24 jam batal otomatis dan stoknya dilepas (REQ-4.4.3).
- Ketersediaan hanya bermakna pada rentang tanggal tertentu, jadi dihitung saat kueri (ADR-02). Harga final dihitung backend, bukan frontend (ADR-04).
- Email verifikasi akun dan atur ulang kata sandi dikirim lewat Mailtrap Email API.

## Capabilities and Constraints

- Frontend React + Vite (SPA), backend Node.js + Express, basis data MySQL. Bahasa antarmuka: Bahasa Indonesia.
- Tiga peran dengan menu dan rute berbeda: pelanggan, petugas, admin. Penjagaan peran di frontend hanya kenyamanan; penegakan sebenarnya di backend.
- Katalog: alat satuan dan paket sewa (bundle), pencarian, filter kategori dan tanggal, keranjang di localStorage.
- Terminologi tetap: "Alat", "Paket Sewa", "Keranjang", "Pesanan", "Serah-terima", "Denda".
- Foto alat sementara disajikan dari `frontend/public/photos` lewat tabel `ItemMedia`; penyedia object storage (ADR-13) belum dipilih.
- Fitur wireframe yang belum ada: filter tarif sewa, filter kapasitas tenda, halaman detail paket, login dan daftar dengan Google, halaman syarat dan kebijakan privasi.

## Brand Commitments

- Nama "Rental Camping" ("Rental Alat Camping"), lokasi (Yogyakarta), nomor telepon, dan alamat di halaman adalah **fiktif untuk tugas kuliah**, bukan fakta bisnis nyata. Jangan dianggap data final dan jangan dikembangkan menjadi klaim tentang bisnis nyata.
- Sistem desain yang dipakai: "Meadow Rise" dari file Figma "Sistem Rental Alat Camping" (hijau zaitun, krem, Plus Jakarta Sans, Inter, Instrument Serif). Foto hero landing page dipertahankan oleh keputusan pemilik produk.

## Evidence on Hand

- Dokumen: `srs-app.md` (SRS v1.4), `docs/prd-rental-alat-camping.md`, `docs/architecture.md`, SRS Google Docs "SRS_Kelompok 7".
- Desain: file Figma (wireframe, Meadow Rise Design System, Customer Website, Image Staging) dan `Meadow Rise Design System — v1.1.png`.
- Foto alat: 11 foto Pexels dari halaman Figma "Image Staging", di `frontend/public/photos`.
- Tidak ada: testimoni, pelanggan nyata, angka penggunaan, atau riset pesaing. Jangan dikarang.

## Product Principles

- **Ketersediaan yang jujur:** angka stok dan tanggal selalu mencerminkan perhitungan backend; antarmuka tidak menjanjikan unit yang tidak ada.
- **Biaya jelas sebelum komitmen:** harga sewa, total, dan denda terlihat sebelum pelanggan membayar.
- **Satu antarmuka, tiga peran:** tiap peran hanya melihat jalur kerjanya; menu tidak memamerkan yang tidak bisa dipakai.
- **Mobile-first untuk tugas lapangan dan pemesanan:** alur utama harus selesai nyaman di layar HP.
- **Tanpa klaim karangan:** salinan dan data hanya memuat hal yang benar atau ditandai contoh.

## Accessibility & Inclusion

Target WCAG AA: kontras teks minimal 4,5:1, target sentuh minimal 44px, dapat dipakai dengan keyboard dan pembaca layar, mendukung `prefers-reduced-motion`. Desain mobile-first karena pelanggan dominan memakai HP.
