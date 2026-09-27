# Sistem Informasi Rental Alat Camping

Aplikasi web penyewaan alat camping: pelanggan menyewa alat secara satuan (*a la carte*)
maupun dalam bentuk paket, membayar daring melalui payment gateway, dan petugas lapangan
mencatat serah-terima serta pengembalian alat.

Proyek ini sedang dalam **tahap perancangan**. Belum ada baris kode yang ditulis.

## Status

| Artifak | Versi | Keterangan |
| --- | --- | --- |
| `srs-app.md` | 1.4 | Spesifikasi kebutuhan perangkat lunak |
| `docs/prd-rental-alat-camping.md` | 1.0 | Product Requirements Document |
| `docs/architecture.md` | 1.1 | Arsitektur sistem (11 ADR) |

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

- Node.js LTS (versi spesifik belum ditetapkan — lihat `docs/architecture.md` §10.2)
- MySQL 8.0+
- Git

## Menjalankan Proyek

> Belum dapat dijalankan. Kerangka `backend/` dan `frontend/` belum dibuat karena masih
> menunggu keputusan pada `docs/architecture.md` §10.2.

## Variabel Lingkungan

Salin `.env.example` menjadi `.env`, lalu isi nilainya.

**Jangan pernah commit berkas `.env`.** Berkas itu sudah dikecualikan oleh `.gitignore`.

## Struktur Repositori

```
.
├── srs-app.md                    # Spesifikasi kebutuhan (sumber otoritatif)
├── docs/
│   ├── prd-rental-alat-camping.md
│   └── architecture.md
├── .env.example
├── .gitignore
└── README.md
```

Struktur `backend/` dan `frontend/` akan ditambahkan setelah keputusan §10.2 selesai;
rancangannya ada di `docs/architecture.md` §3.

## Urutan Membaca Dokumen

1. `srs-app.md` — apa yang diminta (mengikat)
2. `docs/prd-rental-alat-camping.md` — apa yang akan dibangun
3. `docs/architecture.md` — bagaimana dibangun

Bila ketiganya berselisih, **`srs-app.md` yang berlaku**.
