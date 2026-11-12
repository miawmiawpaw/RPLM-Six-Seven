# AGENTS.md

Panduan untuk agent AI yang bekerja di repositori ini.

## Baca lebih dulu

Sebelum melakukan tindakan apa pun, baca **`workflow.md`** — dokumen kebijakan
persetujuan dan alur kerja AI untuk proyek ini.

Aturan intinya:

| Level | Tindakan |
| --- | --- |
| **A — AUTO** | Baca file, draft dokumen, analisis read-only, lint. Jalankan langsung. |
| **B — AUTO + REPORT** | Refactor, test, error handling. Jalankan, lalu laporkan. |
| **C — ASK FIRST** | Requirement, arsitektur, ADR, data, credential, security, destructive. **Tanya dulu.** |
| **D — NEVER** | Deploy production, hapus data nyata, komitmen finansial. Butuh approval eksplisit. |

Saat ragu, gunakan §9 `workflow.md` (Default Behavior).

## Konteks proyek

Sistem Informasi Rental Alat Camping — proyek kelompok UAS RPLM, 6 anggota.

## Urutan membaca dokumen

1. `workflow.md` — batas tindakan AI (baca pertama)
2. `srs-app.md` — sumber otoritatif requirement
3. `docs/prd-rental-alat-camping.md` — apa yang dibangun
4. `docs/architecture.md` — bagaimana dibangun (ADR-09…ADR-18)

**Bila dokumen berselisih, `srs-app.md` yang berlaku.**

## Larangan singkat

- Jangan hard-code credential. Gunakan placeholder `<ASK_USER>` dan ajukan
  **NEED CONFIRMATION** (§2 `workflow.md`).
- Jangan mengubah keputusan ADR tanpa approval — termasuk ADR-09 (JavaScript),
  ADR-10 (pessimistic locking), ADR-11 (Midtrans).
- Jangan menjalankan `npm run db:reset` atau `knex migrate:rollback` tanpa bertanya.
- Jangan commit `.env`.

## Struktur

```
.
├── workflow.md                   # Kebijakan approval AI (baca pertama)
├── srs-app.md                    # Sumber otoritatif requirement
├── docs/
│   ├── prd-rental-alat-camping.md
│   └── architecture.md
├── backend/                      # Node.js + Express, JavaScript
│   ├── src/
│   ├── migrations/
│   ├── seeds/
│   └── tests/
└── frontend/                     # Vite + React SPA
    └── src/
```
