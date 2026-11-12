# TODO — Menuju Siap Digunakan dan Deploy

## P0 — Wajib sebelum staging

- [ ] Rapikan file sementara/desain yang tidak menjadi bagian aplikasi.
- [ ] Pastikan `backend/.env` terisi aman dan tidak di-commit.
- [ ] Pastikan MySQL 8.0+ aktif.
- [ ] Jalankan migration pada database development.
- [ ] Jalankan seed development.
- [ ] Verifikasi tabel, akun, kategori, alat, bundle, dan tarif denda.
- [ ] Pastikan frontend memakai backend asli melalui `VITE_USE_MOCK=false`.
- [ ] Pastikan backend dapat start tanpa error.
- [ ] Pastikan frontend dapat start tanpa error.

## P1 — Auth dan akses

- [ ] Test register pelanggan.
- [ ] Test email duplikat.
- [ ] Test validasi password.
- [ ] Test login pelanggan.
- [ ] Test login admin.
- [ ] Test login petugas.
- [ ] Test password salah.
- [ ] Test akun belum terverifikasi.
- [ ] Test refresh token.
- [ ] Test logout.
- [ ] Test route tanpa token.
- [ ] Test route dengan role tidak sesuai.
- [ ] Selesaikan pengiriman email verifikasi.
- [ ] Selesaikan reset password melalui email.

## P1 — Katalog, keranjang, dan pemesanan

- [ ] Test katalog dan detail alat.
- [ ] Test pencarian dan filter kategori.
- [ ] Test pilihan tanggal sewa.
- [ ] Test tambah, ubah, dan hapus keranjang.
- [ ] Test checkout alat satuan.
- [ ] Test checkout bundle.
- [ ] Validasi tanggal mulai dan selesai.
- [ ] Validasi jumlah item.
- [ ] Validasi stok tidak cukup.
- [ ] Validasi akses pesanan hanya oleh pemilik atau role berwenang.
- [ ] Test pembatalan sesuai status pesanan.

## P0 — Stok dan konkurensi

- [ ] Verifikasi transaksi reservasi stok.
- [ ] Verifikasi `SELECT ... FOR UPDATE`.
- [ ] Buat test dua checkout bersamaan.
- [ ] Pastikan hanya satu checkout berhasil saat stok tersisa satu.
- [ ] Pastikan transaksi gagal melakukan rollback.
- [ ] Pastikan tidak ada reservasi yatim.
- [ ] Pastikan stok kembali setelah reservasi dibatalkan atau kedaluwarsa.

## P1 — Pembayaran

- [ ] Konfigurasi Midtrans sandbox melalui environment variable.
- [ ] Test pembuatan transaksi pembayaran.
- [ ] Validasi signature webhook.
- [ ] Test webhook sukses.
- [ ] Test webhook gagal.
- [ ] Test webhook duplikat/idempotensi.
- [ ] Test pembayaran kedaluwarsa.
- [ ] Pastikan reservasi dilepas setelah pembayaran kedaluwarsa.
- [ ] Pastikan status pembayaran tidak dapat diubah dari frontend.

## P1 — Serah-terima dan pengembalian

- [ ] Test daftar pesanan petugas.
- [ ] Test status `DIBAYAR` ke `DISIAPKAN`.
- [ ] Test status `DISIAPKAN` ke `SEDANG_DISEWA`.
- [ ] Test checklist serah-terima.
- [ ] Test pencatatan waktu pengembalian aktual.
- [ ] Test pencatatan kondisi dan kelengkapan alat.
- [ ] Test status `SEDANG_DISEWA` ke `DIKEMBALIKAN`.
- [ ] Pastikan stok pulih setelah pengembalian.
- [ ] Pastikan audit log mencatat aksi petugas.

## P1 — Denda dan ganti rugi

- [ ] Test denda keterlambatan satu hari.
- [ ] Test denda keterlambatan beberapa hari.
- [ ] Test biaya kerusakan.
- [ ] Test biaya kehilangan.
- [ ] Test penyesuaian denda oleh admin.
- [ ] Test pembebasan denda oleh admin.
- [ ] Test pembayaran denda pelanggan.
- [ ] Pastikan pelanggan tidak dapat mengubah nominal denda.

## P1 — Admin dan laporan

- [ ] Test CRUD alat.
- [ ] Test CRUD bundle.
- [ ] Test perubahan stok dan kondisi alat.
- [ ] Test pengaturan tarif denda.
- [ ] Test daftar pesanan admin.
- [ ] Test filter laporan berdasarkan tanggal.
- [ ] Test filter laporan berdasarkan status.
- [ ] Test ringkasan pendapatan.
- [ ] Test ekspor CSV.
- [ ] Test audit log aktivitas kritikal.

## P1 — Automated test dan quality gate

- [ ] Buat `backend/tests/`.
- [ ] Tambahkan test auth.
- [ ] Tambahkan test RBAC.
- [ ] Tambahkan test availability.
- [ ] Tambahkan test double-booking.
- [ ] Tambahkan test state transition pesanan.
- [ ] Tambahkan test penalty.
- [ ] Tambahkan test webhook idempotensi.
- [ ] Jalankan `npm test` di `backend/`.
- [ ] Jalankan `npm run lint` di `frontend/`.
- [ ] Jalankan `npm run build` di `frontend/`.
- [ ] Perbaiki seluruh error dan warning blocker.

## P0 — Security sebelum deploy

- [ ] Ganti password default admin dan petugas.
- [ ] Gunakan `JWT_SECRET` acak di staging/production.
- [ ] Jangan tampilkan token verifikasi di UI production.
- [ ] Batasi CORS ke domain frontend.
- [ ] Aktifkan HTTPS.
- [ ] Validasi tipe dan ukuran upload media.
- [ ] Pastikan rate limit login aktif.
- [ ] Pastikan stack trace tidak bocor ke client.
- [ ] Pastikan credential tidak muncul di log.
- [ ] Hapus data demo yang tidak diperlukan.
- [ ] Buat backup database.
- [ ] Uji restore database dari backup.

## P1 — Staging dan UAT

- [ ] Deploy backend ke staging.
- [ ] Deploy frontend build ke staging.
- [ ] Hubungkan staging ke database staging.
- [ ] Jalankan migration staging.
- [ ] Jangan menjalankan seed default di production.
- [ ] Test alur Guest.
- [ ] Test alur Pelanggan.
- [ ] Test alur Admin.
- [ ] Test alur Petugas.
- [ ] Test desktop.
- [ ] Test mobile.
- [ ] Test Chrome.
- [ ] Test Firefox/Edge.
- [ ] Test koneksi lambat.
- [ ] Test sesi kedaluwarsa.
- [ ] Test pembayaran sandbox.
- [ ] Catat dan tutup bug blocker/critical.
- [ ] Minta persetujuan UAT.

## P0 — Go-live gate

- [ ] Migration berhasil pada database kosong.
- [ ] Semua automated test lulus.
- [ ] Frontend lint lulus.
- [ ] Frontend build lulus.
- [ ] Auth lulus.
- [ ] Double-booking lulus.
- [ ] Payment webhook lulus.
- [ ] Handover dan pengembalian lulus.
- [ ] Denda lulus.
- [ ] RBAC lulus.
- [ ] Backup dan restore lulus.
- [ ] Credential production dikonfigurasi aman.
- [ ] Tidak ada bug blocker/critical terbuka.
- [ ] Deployment production mendapat persetujuan eksplisit.

## Perintah verifikasi

```bash
cd backend
npm test

cd ../frontend
npm run lint
npm run build
```

> Jangan menjalankan `npm run db:reset` atau `knex migrate:rollback` pada database penting tanpa konfirmasi. Jangan commit `.env`.
