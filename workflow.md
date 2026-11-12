# AI WORKFLOW & APPROVAL POLICY
### Sistem Informasi Rental Alat Camping — projek-UAS

## Purpose

Dokumen ini mengatur batas tindakan AI saat bekerja di repositori ini.
AI bersifat proaktif untuk pekerjaan berisiko rendah dan meminta konfirmasi untuk tindakan yang dapat mengubah requirement, arsitektur, data, biaya, keamanan, atau menghasilkan perubahan yang sulit dibatalkan.

Tujuan:

- Mempercepat pekerjaan rutin yang scope-nya sudah jelas.
- Mencegah AI mengambil keputusan produk/arsitektur penting tanpa persetujuan.
- Menjaga agar setiap perubahan dapat ditelusuri ke artefak yang terdampak.
- Memastikan user tetap menjadi pengambil keputusan akhir.

**Konteks proyek:** repositori ini berisi proyek kelompok (6 anggota) untuk UAS RPLM, saat ini pada tahap implementasi awal. Keputusan arsitektur sudah dibekukan dalam ADR — lihat §13.

---

# 1. PRINCIPLE UTAMA

AI boleh menjalankan pekerjaan secara mandiri ketika:

1. Scope sudah jelas.
2. Tindakan bersifat reversible atau berdampak rendah.
3. Tindakan tidak mengubah keputusan produk yang sudah disepakati.
4. Tidak menghapus atau merusak data penting.
5. Tidak menimbulkan biaya eksternal tanpa persetujuan.
6. Tidak membuka atau membocorkan data sensitif.
7. Hasil dapat diperiksa sebelum digunakan secara permanen.

AI HARUS meminta konfirmasi sebelum:

- mengubah requirement inti,
- memilih keputusan arsitektur yang belum disepakati,
- menghapus data/file penting,
- melakukan perubahan massal,
- melakukan deploy/publish,
- melakukan tindakan eksternal yang sulit dibatalkan,
- menambahkan biaya berbayar,
- mengubah security/authentication/permission secara signifikan,
- mengubah database production,
- atau ketika terdapat lebih dari satu pilihan yang sama-sama valid tetapi berdampak pada produk.

---

# 2. LEVEL TINDAKAN

## LEVEL A — AUTO

AI boleh langsung menjalankan tanpa konfirmasi.

Contoh di repositori ini:

- Membaca `srs-app.md`, `docs/prd-rental-alat-camping.md`, `docs/architecture.md`.
- Mencari inkonsistensi antar dokumen.
- Memperbarui draft PRD, user story, user flow, sitemap, page list.
- Menambah/memperbaiki acceptance criteria.
- Merapikan format Markdown (tabel, heading, daftar).
- Memperbaiki typo.
- Menjalankan perintah read-only: `git status`, `git log`, `git diff`, `grep`, `find`.
- Membuat file dokumentasi/draft baru.
- Menjalankan `npm run lint` di `frontend/` dan membaca hasilnya.

AI tidak perlu berhenti hanya karena menemukan hal yang belum ideal. AI boleh membuat **ASSUMPTION** selama ditulis dengan jelas.

---

## LEVEL B — AUTO + REPORT

AI menjalankan secara mandiri, tetapi wajib melaporkan apa yang dilakukan.

Contoh di repositori ini:

- Refactor kode tanpa mengubah behavior yang disengaja.
- Menambahkan validation yang sudah tersirat oleh requirement — **kecuali** rule yang menentukan status pesanan, ketersediaan stok, atau perhitungan denda; itu Level C.
- Menambahkan error handling standar.
- Membuat unit test (`npm test` — `node --test tests/`).
- Menambahkan loading/empty/error state yang memang diperlukan oleh flow.
- Memperbaiki bug yang penyebab dan perbaikannya sudah jelas.
- Menyesuaikan file terdampak karena perubahan requirement yang **sudah disetujui sebelumnya**.
- Menambah/memperbaiki index atau query tanpa mengubah hasil — **kecuali** menyentuh strategi penguncian stok (§13).

Format laporan singkat:

```
DONE
- Apa yang diubah
- File yang terdampak
- Dampak terhadap behavior
- Test/verification yang dilakukan
```

---

## LEVEL C — ASK FIRST

AI wajib meminta konfirmasi SEBELUM menjalankan.

### Product / Requirement

- Menambahkan fitur di luar scope `srs-app.md`.
- Menghapus fitur yang sudah didefinisikan.
- Mengubah business rule.
- Mengubah actor atau permission utama (customer / petugas / admin).
- Mengubah user flow utama.
- Mengubah MVP scope.
- Mengubah acceptance criteria secara substantif.
- Mengubah status pesanan atau aturan transisi status (§2.8 `srs-app.md`).

### Architecture — terikat ADR

- Mengganti stack (§9 `docs/architecture.md`).
- Mengganti basis data dari MySQL 8.0+.
- Mengubah pola `routes → controller → service → repository`.
- Mengganti payment gateway dari Midtrans (ADR-11).
- Mengubah mekanisme penguncian stok dari transaksi + `SELECT ... FOR UPDATE` (ADR-10).
- Mengubah bahasa backend dari JavaScript (ADR-09).
- Menambahkan service pihak ketiga yang menjadi dependency utama.
- Menambahkan queue, cache layer, atau infrastruktur baru yang berdampak besar.
- **Menghidupkan kembali keputusan yang sudah dibekukan di ADR** — termasuk §10.2 `docs/architecture.md`.

### Data

- Menghapus tabel/entity (13 entitas).
- Mengubah `backend/migrations/` yang sudah dijalankan.
- Migration yang berisiko kehilangan data.
- Mengubah identifier atau relationship utama.
- Menjalankan `npm run db:reset` (destruktif — menghapus seluruh isi database lokal).

### Security

- Mengubah model permission (JWT + bcrypt).
- Menonaktifkan security control (`helmet`, `express-rate-limit`, `cors`).
- Menyimpan credential/secret baru.
- Membuka endpoint atau data yang sebelumnya private.
- Mengubah konfigurasi CORS.

### User, Password, Credential & Secret

AI **WAJIB meminta konfirmasi terlebih dahulu** sebelum membuat, mengubah, mereset, mengganti, mengaktifkan, atau menghapus akun/credential apa pun, baik development maupun production, termasuk:

- User account aplikasi.
- Admin account.
- Database user/account.
- Database username/password.
- Password aplikasi atau service account (`backend/.env`).
- API key.
- Access token / refresh token.
- SSH key atau credential server.
- Cloud credential.
- Environment secret.
- OAuth client secret.
- Credential Midtrans (server key / client key).
- JWT secret.
- Default username/password.
- Seed user atau akun dummy yang memiliki akses nyata (`backend/seeds/`).

AI **tidak boleh menebak atau membuat credential sebagai keputusan final** tanpa persetujuan user.

AI boleh membuat **placeholder** yang jelas tidak valid:

```text
DB_USERNAME=<ASK_USER>
DB_PASSWORD=<ASK_USER>
MIDTRANS_SERVER_KEY=<ASK_USER>
JWT_SECRET=<ASK_USER>
```

AI tidak boleh menuliskan credential sensitif nyata ke dokumentasi, source code, commit, chat, atau file project kecuali user secara eksplisit menginstruksikan tempat penyimpanan yang aman.

Saat membutuhkan credential, gunakan format:

## NEED CONFIRMATION — CREDENTIAL

**Credential yang dibutuhkan:**
Jenis akun/credential.

**Digunakan untuk:**
Service, database, aplikasi, atau environment yang membutuhkan.

**Environment:**
Development / Staging / Production

**Yang perlu diputuskan:**
Username, password, metode secret management, atau akses yang diperlukan.

**Recommended approach:**
Gunakan environment variable (`.env`, sudah dikecualikan `.gitignore`), bukan hard-code.

**Confirmation:**
Minta user mengonfirmasi pembuatan/konfigurasi credential sebelum melakukan tindakan.

AI juga harus meminta konfirmasi sebelum membuat **akun dengan role tertentu**, karena pembuatan akun dan pemberian role adalah dua keputusan yang terpisah.

Contoh:

> Saya perlu membuat database user `app_user` untuk environment development. Apakah saya boleh membuat akun tersebut dan role apa yang harus diberikan: read-only, read/write, atau role khusus?

Jika user belum menentukan password, AI **tidak boleh menganggap password tertentu sebagai password final**. Gunakan placeholder atau minta user menentukan metode pembuatan password.

### External / Cost

- Membuat resource cloud berbayar.
- Mengaktifkan API berbayar.
- Melakukan deployment production.
- Publish ke store/marketplace.
- Mengirim notifikasi nyata ke user (email/SMS/WhatsApp).
- **Menjalankan transaksi Midtrans ke mode production/sandbox dengan data nyata.**
- Membuat perubahan permanen di layanan eksternal.

### Destructive Actions

- `rm` atau penghapusan massal.
- `DROP TABLE` / `DROP DATABASE`.
- `npm run db:reset`.
- `knex migrate:rollback`.
- Reset environment.
- Overwrite file penting tanpa backup/versioning.
- `git push --force`.
- Menghapus branch/tag/release.
- Menghapus file di `docs/` atau `srs-app.md`.

---

# 3. LEVEL D — NEVER WITHOUT EXPLICIT APPROVAL

AI tidak boleh melakukan tindakan berikut hanya berdasarkan asumsi.

- Deploy production.
- Mengubah production database secara langsung.
- Menghapus data customer/order/payment.
- Mengubah credential atau secret yang sudah digunakan production.
- Mengirim komunikasi eksternal atas nama tim/organisasi.
- Membeli layanan/resource.
- Menyetujui kontrak, transaksi, atau komitmen finansial.
- Mengubah legal/compliance policy.
- Mengambil keputusan final yang secara eksplisit diberikan kepada stakeholder (mis. nilai UAS, pembagian tugas anggota).
- Menandai `srs-app.md` sebagai disetujui/difinalisasi atas nama dosen atau pemilik proyek.

Untuk level ini, AI harus memperoleh persetujuan eksplisit tepat sebelum tindakan dilakukan.

---

# 4. ATURAN KHUSUS UNTUK PERANCANGAN SISTEM WEB

AI boleh secara mandiri:

- menyusun sitemap,
- membuat daftar actor,
- mengidentifikasi module,
- membuat user flow,
- mengidentifikasi edge case,
- menyusun functional requirement,
- menyusun non-functional requirement,
- membuat entity/data requirement,
- menyusun business rule draft,
- membuat acceptance criteria,
- menemukan requirement yang hilang,
- menemukan konflik antar requirement,
- membuat rekomendasi desain.

Namun AI wajib meminta konfirmasi sebelum mengunci keputusan yang mengubah arah produk. Untuk proyek ini, keputusan tersebut meliputi:

- siapa yang wajib login,
- apakah checkout guest diperbolehkan,
- siapa yang dapat mengubah order,
- bagaimana cancellation bekerja,
- bagaimana payment dianggap berhasil,
- bagaimana inventory dialokasikan,
- apakah satu user dapat memiliki beberapa active rental,
- apakah data tertentu wajib disimpan,
- apakah fitur masuk MVP atau Phase 2.

AI boleh memberikan recommendation, tetapi tidak boleh menyamarkan recommendation sebagai requirement yang sudah disetujui.

---

# 5. ASSUMPTION POLICY

Jika informasi belum tersedia:

1. AI boleh membuat assumption untuk pekerjaan draft.
2. Setiap assumption harus diberi label **ASSUMPTION**.
3. Asumsi berdampak kecil dapat langsung dipakai.
4. Asumsi berdampak besar harus masuk **OPEN QUESTION** dan meminta konfirmasi sebelum requirement dianggap final.

Contoh:

**ASSUMPTION**
Customer yang sudah login menggunakan data profile saat checkout.

**OPEN QUESTION**
Apakah guest checkout benar-benar dilarang atau user boleh checkout tanpa membuat akun?

---

# 6. CHANGE IMPACT RULE

Setiap perubahan requirement yang telah disetujui harus ditelusuri ke seluruh artefak yang terdampak.

Minimal periksa:

| Artefak | Lokasi di repositori ini |
| --- | --- |
| SRS | `srs-app.md` |
| PRD | `docs/prd-rental-alat-camping.md` |
| Arsitektur / ADR | `docs/architecture.md` |
| Data model | `backend/migrations/` |
| Seed / data awal | `backend/seeds/` |
| Business rule & validasi | `backend/src/`, skema Zod |
| API contract | `backend/src/` (routes/controller/service) |
| UI / wireframe specification | `frontend/src/`, desain Figma |
| Acceptance criteria & test case | `backend/tests/`, `srs-app.md` |

AI tidak boleh hanya memperbaiki satu dokumen lalu mengabaikan artefak lain yang menjadi tidak konsisten.

**Aturan konflik:** bila `srs-app.md`, PRD, dan `architecture.md` berselisih, **`srs-app.md` yang berlaku** (lihat README).

---

# 7. DECISION LOG

Setiap keputusan penting harus dapat dilacak.

Gunakan format:

```
### DECISION-XXX
**Decision:**

**Context:**

**Options considered:**

**Selected by:** User / Existing Requirement / AI Recommendation

**Impact:**

**Date:**
```

Jangan menulis **AI Selected** untuk keputusan produk yang memerlukan persetujuan user.

**Catatan:** keputusan arsitektur yang sudah ada tercatat sebagai ADR-01…ADR-11 di `docs/architecture.md` §9 dan tidak perlu diduplikasi di sini. Log ini untuk keputusan baru setelah ADR dibekukan.

---

# 8. CONFIRMATION FORMAT

Ketika membutuhkan persetujuan, jangan bertanya secara samar seperti:

> "Mau dilanjutkan?"

Gunakan format:

## NEED CONFIRMATION

**Decision:**
Apa yang perlu diputuskan.

**Why:**
Kenapa keputusan ini berdampak.

**Option A:**
Deskripsi + dampak.

**Option B:**
Deskripsi + dampak.

**AI Recommendation:**
Rekomendasi berdasarkan requirement yang tersedia. Recommendation bukan keputusan final.

**Confirmation:**
Minta user memilih atau menyetujui pilihan.

---

# 9. DEFAULT BEHAVIOR

Ketika tidak yakin apakah suatu tindakan memerlukan konfirmasi:

- Jika tindakan hanya menghasilkan draft/read-only → AUTO.
- Jika tindakan mengubah file tetapi mudah dibatalkan dan scope sudah jelas → AUTO + REPORT.
- Jika tindakan mengubah requirement, architecture, data, permission, security, biaya, atau external state → ASK FIRST.
- Jika tindakan destruktif atau production-impacting → NEVER WITHOUT EXPLICIT APPROVAL.

Jangan meminta konfirmasi untuk setiap langkah kecil. Konfirmasi hanya diperlukan ketika keputusan tersebut memang memindahkan ownership keputusan dari AI ke user.

---

# 10. DEFINITION OF DONE

Sebelum menyatakan pekerjaan selesai, AI harus memastikan:

- Requirement yang dikerjakan jelas.
- Artefak terdampak telah diperbarui (lihat §6).
- Tidak ada konflik requirement yang diketahui.
- Assumption telah diberi label.
- Open question telah dicatat.
- Verification/test telah dijalankan jika relevan.
- Perubahan berisiko tinggi belum dilakukan tanpa approval.
- Ringkasan perubahan tersedia.

---

# 11. PRIORITY OF AUTHORITY

Urutan sumber kebenaran:

1. Explicit user decision
2. `srs-app.md` (approved requirement — otoritatif)
3. `docs/prd-rental-alat-camping.md`
4. `docs/architecture.md` (ADR)
5. Existing business rules
6. Existing system behavior
7. AI recommendation
8. AI assumption

Jika sumber dengan prioritas lebih tinggi bertentangan dengan sumber di bawahnya, sumber dengan prioritas lebih tinggi berlaku.

AI tidak boleh mengubah keputusan user yang sudah eksplisit hanya karena AI memiliki preferensi desain yang berbeda.

---

# 12. PERINTAH PROYEK

Perintah yang boleh dijalankan AI dan levelnya:

| Perintah | Lokasi | Level |
| --- | --- | --- |
| `npm run lint` | `frontend/` | A |
| `npm test` | `backend/` | A |
| `npm run dev` | `backend/`, `frontend/` | B |
| `npm run migrate` | `backend/` | C |
| `npm run seed` | `backend/` | C |
| `npm run migrate:rollback` | `backend/` | C |
| `npm run db:reset` | `backend/` | C (destruktif) |
| `npm run build` | `frontend/` | B |
| `git push --force` | — | C |
| deploy ke mana pun | — | D |

---

# 13. CATATAN TEKNIS YANG MENGIKAT

Hal-hal berikut sudah diputuskan dan **tidak boleh diubah tanpa konfirmasi eksplisit**:

- **ADR-09** — Backend memakai **JavaScript**, bukan TypeScript.
- **ADR-10** — Penguncian stok memakai **transaksi + `SELECT ... FOR UPDATE`** (pesimistik).
- **ADR-11** — Payment gateway: **Midtrans**.
- **ADR-16** — Frontend: **Vite + React SPA**.
- **§10.2 `docs/architecture.md`** — keputusan yang masih tertunda; jangan diasumsikan selesai.
- Node.js **>= 20** (dari `backend/package.json`).

Bila AI menemukan alasan kuat untuk mengubah salah satu poin di atas, ajukan sebagai **NEED CONFIRMATION** (§8) — jangan langsung diterapkan.

---

# 14. GOLDEN RULE

**AI boleh berpikir, menganalisis, membuat draft, menemukan masalah, dan melakukan pekerjaan rutin secara mandiri.**

**AI harus meminta persetujuan sebelum membuat keputusan penting yang mengubah produk, arsitektur, data, keamanan, biaya, atau sistem production.**

**AI adalah executor dan advisor; user tetap menjadi final decision maker untuk keputusan yang berdampak besar.**
