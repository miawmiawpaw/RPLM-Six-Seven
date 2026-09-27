# Arsitektur Sistem
# Sistem Informasi Rental Alat Camping

| Atribut | Nilai |
| --- | --- |
| Versi | 1.0 |
| Status | Keputusan stack utama terkunci (ADR-09/10/11) — belum ada baris kode yang ditulis |
| Sumber | `srs-app.md` v1.4 · `docs/prd-rental-alat-camping.md` v1.0 |

### Legenda

| Label | Arti |
| --- | --- |
| `[SRS]` | Dinyatakan eksplisit di SRS v1.4 — **mengikat** |
| `[PRD]` | Dinyatakan di PRD v1.0 |
| `[USULAN]` | Keputusan arsitektur penyusun — **belum disetujui** |
| `[KEPUTUSAN]` | Sudah diputuskan pemilik produk; lihat ADR terkait |

> **Peringatan cakupan.** Dokumen ini merancang **struktur**, bukan mengimplementasikan.
> Belum ada `package.json`, belum ada kode, belum ada database. Setiap pilihan teknis di
> sini adalah usulan yang harus Anda setujui atau tolak sebelum setup proyek dimulai.
> Nomor `REQ-*` merujuk SRS agar keputusan arsitektur tetap dapat dilacak ke requirement.

---

## 1. Ringkasan Arsitektur

### 1.1 Gaya Arsitektur

**Monolit tiga lapisan (*three-tier monolith*)** dengan pemisahan klien–server. `[SRS §2.1]`

```
┌───────────────────────────────────────────────────────────────┐
│  LAPISAN 1 — KLIEN (Browser)                                  │
│  React.js SPA · responsive desktop & mobile                   │
│  Tidak ada instalasi native                                   │
└───────────────────────────┬───────────────────────────────────┘
                            │  HTTPS + JSON (REST API)
                            │  Authorization: Bearer <JWT>
┌───────────────────────────▼───────────────────────────────────┐
│  LAPISAN 2 — SERVER APLIKASI                                  │
│  Node.js LTS + Express.js                                     │
│  Logika bisnis · REST API · otorisasi RBAC · webhook handler  │
└───────────────────────────┬───────────────────────────────────┘
                            │  Koneksi MySQL (pool)
┌───────────────────────────▼───────────────────────────────────┐
│  LAPISAN 3 — BASIS DATA                                       │
│  MySQL 8.0+                                                   │
└───────────────────────────────────────────────────────────────┘

LAYANAN EKSTERNAL (dipanggil dari Lapisan 2):
  · Payment Gateway  → webhook masuk ke endpoint HTTPS khusus
  · Layanan Email    → SMTP atau API pihak ketiga
```

### 1.2 Alasan Memilih Monolit

| Alasan | Dasar |
| --- | --- |
| Skala proyek akademik dengan satu tim kecil | Konteks proyek |
| Kompleksitas transaksional tinggi & butuh konsistensi kuat | Kunci stok + pembayaran + denda saling bergantung `[REQ-4.2.6, REQ-4.5.2]` |
| Deployment tunggal menyederhanakan VPS Linux | `[SRS §2.4]` |
| SRS tidak menuntut pemisahan layanan | `[SRS §2.5]` only mandates the stack |

**`[USULAN]` Modular monolith:** pisahkan kode menjadi modul internal per domain
(*auth, catalog, inventory, order, payment, handover, penalty, report*) dengan batas tegas
dan komunikasi lewat *service layer*, bukan panggilan silang antar-controller. Ini menjaga
kemungkinan mengekstrak layanan kelak tanpa membayar biaya *microservices* sekarang.

### 1.3 Yang Secara Sadar **Tidak** Dipakai

| Tidak dipakai | Alasan |
| --- | --- |
| Microservices | Tidak ada kebutuhan skala terpisah; menambah biaya operasional & risiko konsistensi |
| Server-side rendering (SSR) | SEO bukan requirement — `[TERBUKA, §10.2 butir 5]` |
| Aplikasi mobile native | Di luar lingkup eksplisit `[SRS §1.4]` |
| GraphQL | REST ditetapkan mengikat `[SRS §2.5]` |
| Message queue / event bus | Volume rendah; transaksi sinkron lebih mudah diverifikasi |

---

## 2. Pemetaan Requirement → Komponen

| Komponen | Tanggung Jawab | Requirement |
| --- | --- | --- |
| **Auth Module** | Registrasi, verifikasi email, login, JWT, reset kata sandi, pembatasan *brute-force* | `REQ-4.1.1`–`REQ-4.1.5` |
| **Catalog Module** | Katalog satuan & bundle, pencarian, filter kategori, media (foto/video) | `REQ-4.2.1`, `REQ-4.2.2`, `REQ-4.3.1` |
| **Availability Engine** | Hitung ketersediaan per rentang tanggal, filter bundle dinamis | `REQ-4.2.4`, `REQ-4.2.5` |
| **Cart & Order Module** | Keranjang, checkout, estimasi biaya, kunci stok, pembatalan | `REQ-4.2.3`, `REQ-4.2.6`–`REQ-4.2.9` |
| **Inventory Module** | CRUD alat, status kondisi, bundle, log audit inventaris | `REQ-4.3.1`–`REQ-4.3.10` |
| **Payment Module** | Transaksi ke gateway, verifikasi signature, idempotensi webhook, kedaluwarsa | `REQ-4.4.1`–`REQ-4.4.7` |
| **Handover Module** | Checklist serah-terima & pengembalian, pemulihan stok | `REQ-4.5.1`, `REQ-4.5.3`–`REQ-4.5.5` |
| **Penalty Engine** | Tarif denda, perhitungan denda & ganti rugi, penyesuaian | `REQ-4.5.2`, `REQ-4.7.1`–`REQ-4.7.5` |
| **Report Module** | Filter laporan, ringkasan, ekspor, riwayat pelanggan | `REQ-4.6.1`–`REQ-4.6.5` |
| **Notification Service** | Email verifikasi, konfirmasi pembayaran, pengingat pengembalian | `REQ-4.1.2`, `REQ-4.4.6`, `REQ-4.5.5` |
| **Scheduler** | Auto-cancel pesanan kedaluwarsa, pengingat terjadwal | `REQ-4.4.3`, `REQ-4.5.5` |
| **Audit Logger** | Catat aktivitas kritikal (lintas modul) | `REQ-5.2`, `REQ-4.3.9` |

> **`[USULAN]` Audit Logger sebagai *cross-cutting concern*.** Jangan panggil `auditLog()`
> dari dalam controller. Gunakan *middleware* atau *decorator* agar tidak ada jalur
> perubahan inventaris yang lolos tanpa catatan — `REQ-4.3.9` mewajibkan ini, dan
> mengandalkan disiplin manual adalah cara paling umum requirement audit gagal.

---

## 3. Struktur Direktori `[KEPUTUSAN: ADR-09 — JavaScript]`

```
projek-uas/
├── docs/                          # artefak dokumen (SUDAH ADA)
│   ├── prd-rental-alat-camping.md
│   └── architecture.md            # dokumen ini
│
├── backend/
│   ├── src/
│   │   ├── config/                # env, koneksi DB, konfigurasi gateway
│   │   ├── middleware/            # auth JWT, RBAC, validasi, error handler, audit
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── catalog/
│   │   │   ├── inventory/
│   │   │   ├── order/
│   │   │   ├── payment/
│   │   │   ├── handover/
│   │   │   ├── penalty/
│   │   │   └── report/
│   │   │       ├── *.controller.js
│   │   │       ├── *.service.js   # logika bisnis — TIDAK ada di controller
│   │   │       ├── *.repository.js# akses data
│   │   │       └── *.routes.js
│   │   ├── jobs/                  # scheduler: auto-cancel, pengingat
│   │   ├── utils/
│   │   └── app.js
│   ├── constants/                 # ⚠ WAJIB: status pesanan, kondisi alat, peran
│   ├── migrations/                # skema DB berversi
│   ├── seeds/                     # data awal: admin, kategori, tarif default
│   ├── tests/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # klien HTTP terpusat (interceptor JWT)
│   │   ├── components/            # komponen reusable
│   │   ├── pages/                 # P-01..P-21 sesuai PRD §10
│   │   ├── hooks/
│   │   ├── context/               # state autentikasi & keranjang
│   │   ├── routes/                # routing + route guard per peran
│   │   └── main.jsx
│   └── package.json
│
├── .env.example                   # template variabel — JANGAN commit .env
├── .gitignore
└── README.md
```

**Alasan pemisahan `modules/` alih-alih `controllers/`+`models/` global:**
`REQ-5.4` menuntut "pemisahan tanggung jawab yang jelas". Struktur berbasis domain membuat
perubahan pada satu fitur terkumpul di satu direktori, sehingga *change management*
(PRD §14) dapat dijalankan tanpa menyentuh banyak folder.

**Aturan lapisan `[USULAN]`:**

```
routes → controller → service → repository → database
         (HTTP)       (bisnis)  (query)
```

- Controller **hanya** menangani HTTP: baca input, panggil service, kirim respons.
- Service **tidak** menyentuh `req`/`res` Express.
- Repository **satu-satunya** tempat SQL ditulis.
- Modul **tidak** memanggil repository modul lain; lewat service-nya.

**Konsekuensi ADR-09 (JavaScript, bukan TypeScript) — ini bukan sekadar pilihan gaya:**

| Risiko tanpa tipe statis | Mitigasi wajib |
| --- | --- |
| Salah ketik status (mis. `"DIBAYAR"` vs `"DlBAYAR"`) lolos ke produksi | `backend/src/constants/` berisi objek status yang dibekukan (`Object.freeze`) — **tidak ada string status literal** di kode mana pun |
| Bentuk data dari DB berubah tanpa terdeteksi | JSDoc `@typedef` untuk setiap entitas PRD §11 di `backend/src/models/` |
| Galat hanya muncul saat runtime | Validasi skema (mis. `zod`/`joi`) di **batas API** — setiap payload masuk diperiksa sebelum menyentuh service |
| Kesalahan tipe di frontend | Validasi yang sama dipakai ulang di `frontend/src/api/` |

> Ini menaikkan biaya kedisiplinan. Bila di tengah proyek terasa terlalu mahal,
> bermigrasi ke TypeScript di kemudian hari berarti menyentuh hampir seluruh basis kode —
> jadi putuskan ini **sekali**, sekarang.

---

## 4. Komponen Kritis (Perlu Desain Cermat)

### 4.1 Availability Engine — `REQ-4.2.5`

Ini komponen paling berisiko. Rumusnya mengikat:

```
stok tersedia(item, mulai, selesai)
  = stok_fisik
  − Σ unit terikat pesanan berstatus AKTIF yang rentangnya beririsan
```

Status aktif: `MENUNGGU_PEMBAYARAN`, `DIBAYAR`, `DISIAPKAN`, `SEDANG_DISEWA` `[SRS §2.8]`.

**Konsekuensi arsitektur:**

| Keputusan | Alasan |
| --- | --- |
| Ketersediaan **dihitung saat kueri**, bukan disimpan sebagai kolom | `[USULAN]` Kolom statis akan *drift* dan sulit direkonsiliasi |
| Reservasi dipecah **per item satuan**, bukan per bundle | `REQ-4.3.7`: 1 paket = 1 tenda + 2 matras → kunci di level komponen |
| Cek + kunci stok harus **atomik** | Dua pesanan bersamaan tidak boleh lolos bersamaan |
| Butuh **uji konkurensi** | `OBJ-02` menuntut nol kasus *double-booking* |

**`[KEPUTUSAN: ADR-10]` Penguncian pesimistik.** Kueri ketersediaan berada di dalam
transaksi yang sama dengan pembuatan reservasi, memakai `SELECT ... FOR UPDATE` pada baris
yang relevan. Transaksi wajib pendek — tahan kunci sesingkat mungkin.

Ini keputusan arsitektur paling konsekuensial di seluruh sistem.

### 4.2 Payment Webhook — `REQ-4.4.2`, `REQ-4.4.7`

| Persyaratan | Konsekuensi |
| --- | --- |
| Verifikasi signature | Handler webhook **tidak boleh** lewat middleware autentikasi pengguna; verifikasi sendiri di awal handler |
| Idempoten | Butuh `referensi_gateway` unik + pencatatan percobaan pembayaran |
| Kunci stok tetap terkunci setelah `DIBAYAR` | Webhook **tidak** melepas reservasi |
| Auto-cancel 1×24 jam | Butuh **scheduler**, bukan permintaan HTTP |
| Webhook bisa hilang | Butuh endpoint rekonsiliasi `[REKOMENDASI PRD FR-035]` |

**`[USULAN]` Endpoint webhook dikecualikan dari parser body JSON global.** Payment gateway
sering mengirim *raw body* yang signature-nya dihitung dari byte mentah. Bila parser JSON
global sudah mengubahnya, verifikasi signature akan selalu gagal.

**`[KEPUTUSAN: ADR-11]` Midtrans.** Konsekuensi konkret:

- Signature diverifikasi memakai `order_id` + `status_code` + `gross_amount` + Server Key,
  di-hash SHA-512 — **bukan** header `X-Signature`. Ini berbeda dari banyak gateway lain,
  jadi jangan menyalin pola verifikasi dari tutorial umum.
- Endpoint notifikasi Midtrans perlu didaftarkan pada dashboard Midtrans dan **hanya boleh
  menerima dari IP notifikasi Midtrans**.
- Nilai `order_id` yang dikirim ke Midtrans harus dapat dipetakan kembali ke pesanan kita
  (`kode_pesanan`) — jangan mengandalkan `transaction_id` Midtrans sebagai kunci primer.
- Kredensial terpisah untuk sandbox dan produksi: **Client Key** + **Server Key** (`SB-Mid-…`
  vs `Mid-…`). Server Key **tidak pernah** dikirim ke frontend.

### 4.3 Scheduler (Job Terjadwal) — `REQ-4.4.3`, `REQ-4.5.5`

Tidak disebut SRS, tetapi **wajib ada** karena SRS mewajibkan perilaku yang bergantung waktu.

| Job | Pemicu | Aksi |
| --- | --- | --- |
| Auto-cancel pesanan kedaluwarsa | Tiap 5–10 menit `[USULAN]` | `MENUNGGU_PEMBAYARAN` → `GAGAL_KEDALUWARSA`, lepas reservasi |
| Pengingat pengembalian | Harian `[USULAN]` | Kirim email H-1 sebelum tanggal selesai |

**`[TERBUKA]` Bagaimana job ini berjalan?** — lihat §10.2 butir 4. Opsi: `node-cron` di dalam
proses (sederhana, tapi ganda bila ada >1 instans), atau proses terpisah.

### 4.4 State Machine Pesanan — `SRS §2.8`

```
                  ┌──────────────────────────┐
                  │ MENUNGGU_PEMBAYARAN       │
                  └───┬───────────┬───────────┘
        webhook sukses│           │lewat 1×24 jam / dibatalkan
                      ▼           ▼
                  ┌────────┐  ┌────────────────────┐   ┌────────────┐
                  │ DIBAYAR│  │ GAGAL_KEDALUWARSA  │   │ DIBATALKAN │
                  └───┬────┘  └────────────────────┘   └────────────┘
   petugas siapkan    │           (stok dilepas)
                      ▼
                 ┌───────────┐
                 │ DISIAPKAN │
                 └─────┬─────┘
   checklist lengkap   │
                      ▼
              ┌──────────────────┐
              │ SEDANG_DISEWA    │
              └────────┬─────────┘
   petugas catat       │
                      ▼
             ┌──────────────────┐
             │ DIKEMBALIKAN     │
             └────────┬─────────┘
   lunas ──────────────┴──────────────► ┌──────────┐
                                        │ SELESAI  │
                                        └──────────┘
```

**`[USULAN]` Transisi ditegakkan di service layer, bukan di UI.** UI menyembunyikan tombol
yang tidak relevan untuk kenyamanan — tetapi hanya service yang boleh **menolak** transisi
ilegal. Kalau penegakan diserahkan ke UI, satu panggilan API langsung dapat merusak state
`[EC-23]`.

---

## 5. Kebutuhan Data

### 5.1 Karakteristik

| Aspek | Nilai |
| --- | --- |
| RDBMS | MySQL 8.0+ `[SRS §2.4]` |
| Kolom waktu | UTC+7 (WIB) `[SRS §2.5]` |
| Entity | 13+ (lihat PRD §11) |
| Integritas | *Foreign key* wajib aktif; transaksi ACID untuk kunci stok & pembayaran |
| Riwayat harga | Snapshot harga pada `OrderItem` `[PRD §11.3]` |
| Penghapusan alat | *Soft delete* (`is_aktif`) `[PRD AS-08]` |

### 5.2 `[USULAN]` Kebutuhan Indeks

Diturunkan dari pola kueri yang sudah diketahui:

| Tabel | Kolom | Alasan |
| --- | --- | --- |
| `StockReservation` | (`item_id`, `tanggal_mulai`, `tanggal_selesai`, `status`) | Kueri ketersediaan — **indeks paling kritis** |
| `Order` | (`user_id`, `status`) | Riwayat pelanggan + dashboard |
| `Order` | (`status`, `batas_pembayaran`) | Scheduler auto-cancel |
| `Payment` | `referensi_gateway` (unik) | Idempotensi webhook |
| `Item` | `kode_barang` (unik) | `REQ-4.3.4` |
| `User` | `email` (unik) | `REQ-4.1.3` |
| `AuditLog` | (`entity`, `entity_id`, `waktu`) | Penelusuran audit |

### 5.3 `[USULAN]` Migrasi & Seeding

- Skema **berversi** (migrasi bernomor), bukan `CREATE TABLE` manual — agar perubahan
  terlacak dan dapat di-*rollback*.
- Seed wajib menyertakan: akun admin awal, kategori dasar (tenda, carrier, nesting,
  alat masak, lampu), dan **tarif denda default**.

> Tarif default bukan kemudahan, melainkan penutup `KONTRADIKSI-04`: bila tarif belum
> diatur sementara pengembalian terjadi, sistem tidak boleh gagal total.

---

## 6. Keamanan

### 6.1 Yang Sudah Diwajibkan SRS

| Kontrol | Requirement |
| --- | --- |
| Kata sandi di-hash (bcrypt) | `REQ-5.3` |
| HTTPS wajib | `REQ-5.3` |
| RBAC | `REQ-5.3` |
| Payment gateway bersertifikasi PCI-DSS | `REQ-5.3` |
| JWT masa berlaku terbatas + refresh | `REQ-5.3` |
| Verifikasi signature webhook + batasi alamat pengirim | `REQ-5.3` |
| Validasi seluruh input | `REQ-5.2` |
| Audit trail aktivitas kritikal | `REQ-5.2` |

### 6.2 `[USULAN]` Kontrol Tambahan

| Kontrol | Alasan |
| --- | --- |
| **Parameterized query** di seluruh repository | Mencegah SQL injection |
| **Rate limiting di level IP**, bukan hanya per akun | `REQ-4.1.5` hanya menutup per akun; penyerang dapat menyebar lintas akun |
| **Pencabutan refresh token** saat logout & reset kata sandi | Tanpa ini, sesi lama tetap hidup setelah penggantian kata sandi |
| **Audit log append-only** | Admin pun tidak boleh mengubah/menghapusnya |
| **Validasi kepemilikan (ownership)** untuk seluruh data pelanggan | `BR-024` |
| **Idempotency key** pada checkout | Mencegah pesanan ganda dari klik berulang `[EC-19]` |
| **`.env` tidak di-commit**; rahasia hanya di variabel lingkungan | Praktik dasar |

**`[TERBUKA]` Berapa masa berlaku JWT & token reset?** Belum ada angka di SRS, padahal
`REQ-5.3` menuntut "terbatas" — tidak testable tanpa angka. Lihat §10.2 butir 3.

---

## 7. Deployment & Lingkungan

### 7.1 Target Deployment `[SRS §2.4]`

Satu VPS/Cloud Linux. `[USULAN]` Topologi minimum:

```
Internet
   │
   ▼
┌──────────────────────────────────────┐
│  Reverse Proxy (Nginx)               │
│  · TLS termination (HTTPS)           │
│  · Serve berkas statis React (build) │
│  · Teruskan /api/* ke backend        │
└──────────┬───────────────────────────┘
           ▼
┌──────────────────────┐   ┌────────────────────┐
│ Node.js (process)    │──►│ MySQL 8.0+         │
│ Express + scheduler  │   │ (localhost only)   │
└──────────────────────┘   └────────────────────┘
```

### 7.2 Lingkungan

| Lingkungan | Fungsi | Basis Data |
| --- | --- | --- |
| **development** | Kerja lokal | MySQL lokal; Midtrans **sandbox** |
| **staging** | Uji sebelum rilis `[USULAN]` | Salinan skema; Midtrans **sandbox** |
| **production** | Melayani pengguna | MySQL produksi; Midtrans **produksi** |

**`[KEPUTUSAN: ADR-11]` Midtrans — pemisahan kredensial antar-lingkungan:**

| Variabel | Development | Production |
| --- | --- | --- |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-…` | `Mid-server-…` |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-…` | `Mid-client-…` |
| `MIDTRANS_IS_PRODUCTION` | `false` | `true` |

Awalan `SB-` adalah penanda sandbox. Kesalahan paling umum: kunci sandbox ikut ter-deploy
ke produksi sehingga pembayaran nyata tidak pernah terkonfirmasi — dan gejalanya menyesatkan,
karena pesanan tetap tampak berhasil di halaman pelanggan.

### 7.3 Backup — `REQ-5.2`

| Aspek | Ketetapan |
| --- | --- |
| Frekuensi | Harian otomatis `[SRS §5.2]` |
| Retensi | Minimal 7 hari `[SRS §5.2]` |
| Lokasi | **`[USULAN]` di luar server aplikasi** — backup yang berada di mesin yang sama akan hilang bersama mesinnya |
| Uji pulih | **`[USULAN]` wajib diuji minimal sekali** — backup yang tidak pernah diuji bukan backup |

---

## 8. Testing Strategy

| Tingkat | Cakupan | Menjawab |
| --- | --- | --- |
| **Unit** | Availability engine, kalkulasi denda, perhitungan biaya | `AC-015`, `AC-033` |
| **Integrasi** | Kunci stok ⇄ pesanan, webhook ⇄ status, checklist ⇄ stok & denda | `AC-011`–`AC-014`, `AC-027`–`AC-030` |
| **Konkurensi** | Dua pesanan bersamaan memperebutkan unit terakhir | `OBJ-02`, `AC-011` |
| **End-to-end** | Alur penuh: katalog → checkout → bayar → serah terima → kembali → selesai | Seluruh Must Have |
| **Keamanan** | Akses lintas peran, IDOR, eskalasi hak akses | `AC-039`, `BR-023`, `BR-024` |

**Basis:** 42 Acceptance Criteria di PRD §16 sudah berformat Given→When→Then, sehingga
**dapat langsung dipakai sebagai naskah uji** tanpa penulisan ulang.

**`[USULAN]` Uji konkurensi wajib otomatis, bukan manual.** *Double-booking* adalah
kegagalan yang hanya muncul pada waktu yang tepat, dan tidak akan ditemukan dengan
pengujian manual sesekali.

---

## 9. Keputusan Arsitektur (ADR Ringkas)

| # | Keputusan | Alasan | Konsekuensi |
| --- | --- | --- | --- |
| ADR-01 | Monolit modular, bukan microservices | Tim kecil, konsistensi transaksional kuat | Perlu disiplin batas modul manual |
| ADR-02 | Ketersediaan dihitung saat kueri | Mencegah data *drift* | Kueri lebih berat; butuh indeks tepat |
| ADR-03 | Reservasi per item satuan, bukan per bundle | `REQ-4.3.7` | Perlu ekspansi komponen saat kunci |
| ADR-04 | Snapshot harga di `OrderItem` | `KONTRADIKSI-03` | Riwayat harga tidak berubah saat tarif diubah |
| ADR-05 | Soft delete untuk alat | `REQ-4.3.3`, `REQ-4.3.4` butuh riwayat utuh | Semua kueri katalog wajib filter `is_aktif` |
| ADR-06 | Scheduler dalam proses aplikasi | Volume rendah, deployment tunggal | Ganda bila instans >1 `[§10.2 butir 4]` |
| ADR-07 | Audit lewat middleware lintas modul | Mencegah jalur perubahan lolos | Perlu konvensi penamaan aksi |
| ADR-08 | Transisi state ditegakkan di service layer | UI tidak dapat dipercaya | Service jadi tempat aturan berkumpul |
| **ADR-09** | **JavaScript** (bukan TypeScript) | **Diputuskan pemilik produk, 28 Sep 2026** | Tanpa pemeriksaan tipe statis: wajib JSDoc pada service, konstanta status bekukan (frozen object) untuk mencegah salah ketik, dan validasi runtime di batas API |
| **ADR-10** | **Penguncian stok pesimistik** — transaksi + `SELECT ... FOR UPDATE` | **Diputuskan pemilik produk, 28 Sep 2026**; `OBJ-02` menuntut nol *double-booking* | Ada penantian singkat saat rebutan; kueri ketersediaan harus berada di dalam transaksi yang sama dengan pembuatan reservasi; transaksi wajib pendek |
| **ADR-11** | **Midtrans** sebagai payment gateway | **Diputuskan pemilik produk, 28 Sep 2026** | Bergantung pada SDK & format webhook Midtrans; signature diverifikasi menurut spesifikasi Midtrans; kredensial sandbox dan produksi wajib dipisah |

---

## 10. Pertanyaan Terbuka Arsitektur

### 10.1 Tiga Keputusan Sudah Dikunci

Diputuskan pemilik produk pada 28 September 2026, dan sudah dipindahkan ke §9 sebagai ADR:

| Pertanyaan | Jawaban | ADR |
| --- | --- | --- |
| Bahasa: JavaScript atau TypeScript? | **JavaScript** | ADR-09 |
| Strategi penguncian stok? | **Pesimistik** — transaksi + `SELECT ... FOR UPDATE` | ADR-10 |
| Payment gateway mana? | **Midtrans** | ADR-11 |

### 10.2 Masih Terbuka

**Jangan mulai menulis kode sebelum butir 1–4 terjawab.**

| # | Pertanyaan | Mengapa Penting | Usulan |
| --- | --- | --- | --- |
| 1 | Pustaka migrasi & query: Knex, Sequelize, Prisma, atau SQL langsung? | Memengaruhi aturan "SQL hanya di repository" (§3) — dan **dengan ADR-10, wajib mendukung transaksi eksplisit + `FOR UPDATE`**. Ini mengeliminasi sebagian pilihan | `[USULAN]` Knex — dukungan transaksi matang, SQL tetap eksplisit |
| 2 | Penyimpanan media (foto/video alat) di mana? | `REQ-4.3.1` menuntut **video** — berkas besar, mahal di disk VPS | `[USULAN]` Object storage (mis. S3-compatible), bukan disk VPS |
| 3 | Masa berlaku JWT akses, refresh, dan token reset kata sandi? | `REQ-5.3` menuntut "terbatas" — tidak testable tanpa angka | `[USULAN]` Akses 15 mnt · refresh 7 hari · reset 30 mnt |
| 4 | Scheduler: `node-cron` dalam proses, atau proses terpisah? | Menentukan deployment & risiko job ganda | `[USULAN]` Dalam proses untuk rilis pertama |
| 5 | Perlu SSR (*server-side rendering*)? | Menentukan Vite SPA vs Next.js, dan struktur `frontend/` | `[USULAN]` Tidak — SEO bukan requirement |
| 6 | *State management* frontend: Context, Redux, atau Zustand? | Menentukan struktur `frontend/src/` | `[USULAN]` Context untuk auth + keranjang; tambah hanya bila perlu |
| 7 | CI/CD atau deploy manual? | Menentukan apakah tes berjalan otomatis | `[USULAN]` Minimal jalankan tes otomatis sebelum deploy |

> Butir **1** sekarang paling mendesak: ADR-10 menetapkan penguncian pesimistik, dan tidak
> semua pustaka mempermudah transaksi eksplisit. Memilih pustaka yang salah berarti
> Availability Engine harus ditulis ulang di tengah jalan.

---

## 11. Batas Dokumen

| Hal | Di mana |
| --- | --- |
| Requirement, aktor, flow, halaman, data, aturan bisnis, AC | `docs/prd-rental-alat-camping.md` |
| Kebutuhan kontraktual | `srs-app.md` v1.4 |
| Struktur teknis, komponen, deployment | dokumen ini |

> **Aturan penyelarasan:** bila SRS naik versi atau PRD berubah, periksa §2 (pemetaan
> requirement → komponen) dan §9 (ADR) di dokumen ini. Perubahan requirement yang
> menyentuh ketersediaan stok, pembayaran, atau state machine hampir selalu berdampak
> arsitektur.

---

*Dokumen ini diturunkan dari `srs-app.md` v1.4 dan `docs/prd-rental-alat-camping.md` v1.0.
Seluruh butir `[USULAN]` dan `[TERBUKA]` memerlukan persetujuan pemilik produk sebelum
setup proyek dimulai.*
