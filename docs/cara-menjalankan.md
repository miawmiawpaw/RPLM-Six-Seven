# Cara Menjalankan Proyek

Panduan ini sudah **diuji dan berhasil** pada 28 September 2026 di environment
Windows + XAMPP. Ketiga layanan harus berjalan bersamaan, dalam urutan ini:

```
MySQL (3306)  →  Backend API (3000)  →  Frontend (5173)
```

---

## Ringkasan cepat

| Langkah | Perintah | Lokasi |
| --- | --- | --- |
| 1. Nyalakan MySQL | `mysqld.exe --defaults-file=...\my.ini` | XAMPP |
| 2. Buat database | `CREATE DATABASE rental_camping` | MySQL |
| 3. Migrasi | `npm run migrate` | `backend/` |
| 4. Seed | `npm run seed` | `backend/` |
| 5. Jalankan API | `npm run dev` | `backend/` |
| 6. Jalankan web | `npm run dev` | `frontend/` |
| 7. Buka | http://localhost:5173 | Browser |

---

## 1. Nyalakan MySQL

XAMPP dipasang di `C:\xampp`. Buka **XAMPP Control Panel** lalu klik **Start**
pada baris **MySQL**. Cara termudah; jangan pakai terminal kecuali perlu.

Bila ingin lewat terminal (mis. XAMPP Control Panel tidak ada):

```bash
"C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
```

> **Catatan:** di XAMPP ini yang terpasang adalah **MariaDB 10.4.32**, bukan
> MySQL 8.0. Sejauh pengujian, skema proyek berjalan baik di MariaDB. Bila nanti
> memakai MySQL 8.0 asli, jalankan ulang migrasi di database bersih.

**Cek berhasil:** port **3306** listening.

```bash
"C:\xampp\mysql\bin\mysql.exe" -u root -e "SELECT VERSION();"
```

---

## 2. Buat database

Sekali saja. Nama database harus **sama persis** dengan `DB_NAME` di `backend/.env`
(nilai saat ini: `rental_camping`).

```bash
"C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS rental_camping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 3. Siapkan `backend/.env`

Jika `backend/.env` belum ada, salin dari contoh:

```bash
cd backend
cp .env.example .env
```

Isi yang wajib benar:

| Kunci | Nilai untuk XAMPP lokal |
| --- | --- |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | *(kosongkan — XAMPP default tanpa password)* |
| `DB_NAME` | `rental_camping` |
| `JWT_SECRET` | string acak, **wajib diisi** |

Buat `JWT_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Jangan pernah commit `.env`.

---

## 4. Migrasi dan seed

```bash
cd backend
npm install
npm run migrate   # membuat 12 tabel
npm run seed      # mengisi data contoh
```

Keluaran yang benar:

```
Batch 1 run: 1 migrations

[SEED] Selesai.
[SEED] Admin   : admin@rentalcamping.test / Admin#12345
[SEED] Petugas : petugas@rentalcamping.test / Petugas#12345
```

**Akun hasil seed:**

| Peran | Email | Kata sandi |
| --- | --- | --- |
| ADMIN | `admin@rentalcamping.test` | `Admin#12345` |
| PETUGAS | `petugas@rentalcamping.test` | `Petugas#12345` |

Data awal lain: **11 alat**, **5 kategori**, **2 paket**, **2 tarif denda**.

> **Catatan keamanan:** ganti kata sandi akun seed sebelum dipakai dengan data
> nyata. Akun ini punya akses ADMIN penuh dan kata sandinya tertulis di
> repositori, jadi jangan dipakai di luar pengembangan lokal.

---

## 5. Jalankan backend

```bash
cd backend
npm run dev
```

Keluaran yang benar:

```
[DB] Koneksi ke MySQL berhasil.
[SCHEDULER] Job terjadwal aktif (auto-cancel tiap 10 menit, pengingat harian 08:00 WIB).
[API] Berjalan di http://localhost:3000
[API] Lingkungan: development
[API] Midtrans: sandbox
```

Bila muncul `ECONNREFUSED 127.0.0.1:3306` → MySQL belum jalan, ulangi langkah 1.

**Cek cepat:**

```bash
curl http://localhost:3000/api/health
# {"status":"ok","layanan":"rental-alat-camping-api",...}
```

> Perhatikan: endpoint health ada di **`/api/health`**, bukan `/health`.
> Membuka `/health` akan menjawab `404 RUTE_TIDAK_DITEMUKAN`.

---

## 6. Jalankan frontend

Terminal **baru** (biarkan backend tetap jalan):

```bash
cd frontend
npm install
npm run dev
```

Buka **http://localhost:5173**.

Vite otomatis mem-proxy `/api` ke `http://localhost:3000`, jadi frontend dan
backend terlihat satu asal. Untuk mengarahkan ke backend lain:

```bash
VITE_API_PROXY_TARGET=http://192.168.1.10:4000 npm run dev
```

---

## 7. Urutan uji yang disarankan

1. **Katalog** (`/katalog`) — 11 alat dari database tampil.
2. **Masuk** sebagai admin (`admin@rentalcamping.test`) — dialihkan ke `/admin/dasbor`.
3. **Inventaris** (`/admin/inventaris`) — 11 alat, stok, status kondisi.
4. **Buat akun pelanggan** lewat `/daftar`. Token verifikasi email **ditampilkan di
   layar** karena SMTP belum dikonfigurasi — ini disengaja untuk tahap pengembangan.
5. **Pesan alat** sebagai pelanggan → lihat `/pesanan-saya`.
6. **Tugas petugas** (`/petugas/tugas`) setelah login sebagai petugas.

---

## Masalah yang sering muncul

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL belum jalan | Langkah 1 |
| `ER_ACCESS_DENIED_ERROR` | `DB_USER`/`DB_PASSWORD` salah | Periksa `backend/.env` |
| `ER_BAD_DB_ERROR: Unknown database` | Database belum dibuat | Langkah 2 |
| `JWT_SECRET belum diisi` | `.env` kosong/belum ada | Langkah 3 |
| Port 3000/5173 "in use" | Proses lama masih hidup | Matikan prosesnya, atau pakai port lain |
| Halaman kosong, menu hanya "Katalog/Masuk" | Belum login, atau token kedaluwarsa | Masuk lagi |
| Katalog kosong | Seed belum jalan | Langkah 4 |

**Mematikan proses yang menyangkut di Windows:**

```bash
netstat -ano | findstr LISTENING | findstr :3000
taskkill /F /PID <pid>
```

---

## Ringkasan port

| Layanan | Port | Alamat |
| --- | --- | --- |
| MySQL / MariaDB | 3306 | `127.0.0.1` |
| Backend API | 3000 | http://localhost:3000 |
| Frontend (Vite) | 5173 | http://localhost:5173 |

---

## Belum diuji

Yang berikut **belum pernah diverifikasi terhadap layanan nyata**; jangan
diasumsikan berfungsi saat demo:

- **Pembayaran Midtrans** — masih memakai kunci sandbox contoh.
- **Pengiriman email** — SMTP belum dikonfigurasi; token verifikasi/reset
  ditampilkan di layar.
- **Unggah media alat** — endpoint masih mengembalikan `501`.
- **Object storage (ADR-13)** — penyedia belum ditetapkan.
- **Skema di MySQL 8.0 asli** — pengujian hanya di MariaDB 10.4.
