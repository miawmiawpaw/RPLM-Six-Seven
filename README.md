# Sistem Informasi Rental Alat Camping

Aplikasi web penyewaan alat camping: pelanggan menyewa alat secara satuan (*a la carte*)
maupun dalam bentuk paket, membayar daring melalui payment gateway, dan petugas lapangan
mencatat serah-terima serta pengembalian alat.

Proyek ini sudah memiliki kerangka yang dapat dijalankan: `backend/` (Express + Knex)
dan `frontend/` (Vite + React). Lihat [Menjalankan Proyek](#menjalankan-proyek).

## Status

| Artifak | Versi | Keterangan |
| --- | --- | --- |
| `srs-app.md` | 1.4 | Spesifikasi kebutuhan perangkat lunak |
| `docs/prd-rental-alat-camping.md` | 1.0 | Product Requirements Document |
| `docs/architecture.md` | 1.2 | Arsitektur sistem (ADR-09…ADR-18) |

## Stack

Diputuskan dan terdokumentasi di `docs/architecture.md` §9:

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React.js (SPA, responsive) |
| Backend | Node.js LTS + Express.js — **JavaScript** (ADR-09) |
| Basis data | MySQL 8.0+ |
| Payment gateway | **Midtrans** (ADR-11) |
| Penguncian stok | Pesimistik — transaksi + `SELECT ... FOR UPDATE` (ADR-10) |

Arsitektur: **monolit modular tiga lapisan**, dengan pemisahan
`routes → controller → service → repository`.

## Prasyarat

- Node.js **>= 20** (lihat `engines` di `backend/package.json`)
- MySQL 8.0+
- Git

## Menjalankan Proyek

### Backend

```bash
cd backend
cp .env.example .env
```

Isi `.env`, terutama `JWT_SECRET`. Buat nilai acak dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Lalu:

```bash
npm install
npm run migrate   # membuat skema di MySQL
npm run seed      # mengisi data awal
npm run dev       # server di http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # buka http://localhost:5173
```

Vite mem-proxy `/api` ke `http://localhost:3000` (dapat diubah lewat
`VITE_API_PROXY_TARGET`). Jalankan backend lebih dulu.

> **Catatan:** migrasi dan seed di atas ditulis untuk MySQL 8.0+ tetapi
> **belum pernah diuji terhadap server MySQL yang berjalan**. Skema di
> `backend/migrations/` dan data di `backend/seeds/` perlu diverifikasi ulang
> pada environment dengan MySQL aktif sebelum dinyatakan siap.

## Variabel Lingkungan

Salin `.env.example` menjadi `.env`, lalu isi nilainya. Kunci penting:
`DB_*` (koneksi MySQL), `JWT_SECRET`, `MIDTRANS_*`, dan `MAIL_*`.

**Jangan pernah commit berkas `.env`.** Berkas itu sudah dikecualikan oleh `.gitignore`.

## Struktur Repositori

```
.
├── srs-app.md                    # Spesifikasi kebutuhan (sumber otoritatif)
├── AGENTS.md                     # Panduan agent AI
├── workflow.md                   # Kebijakan approval AI
├── docs/
│   ├── prd-rental-alat-camping.md
│   └── architecture.md
├── backend/                      # Node.js + Express, JavaScript (ADR-09)
│   ├── src/                      # routes → controller → service → repository
│   ├── migrations/               # skema Knex
│   ├── seeds/                    # data awal
│   ├── tests/
│   └── knexfile.js
├── frontend/                     # Vite + React SPA (ADR-16)
│   └── src/
├── .env.example
├── .gitignore
└── README.md
```

## Urutan Membaca Dokumen

1. `srs-app.md` — apa yang diminta (mengikat)
2. `docs/prd-rental-alat-camping.md` — apa yang akan dibangun
3. `docs/architecture.md` — bagaimana dibangun

Bila ketiganya berselisih, **`srs-app.md` yang berlaku**.
