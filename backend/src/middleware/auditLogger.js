const db = require('../config/database');

/**
 * Audit trail — REQ-5.2.
 *
 * ADR-07: audit adalah cross-cutting concern, bukan panggilan manual dari controller.
 * Fungsi ini dipanggil dari service (bukan middleware HTTP) karena hanya service yang
 * tahu entity apa yang benar-benar berubah beserta nilai sebelum/sesudahnya.
 *
 * PENTING: fungsi ini menerima `trx` (transaksi Knex) agar catatan audit ikut
 * ter-rollback bila transaksi gagal. Audit yang mencatat perubahan yang tidak pernah
 * tersimpan lebih buruk daripada tidak ada audit sama sekali.
 *
 * @param {object} params
 * @param {import('knex').Knex|import('knex').Knex.Transaction} params.trx
 * @param {string} params.aksi mis. 'INVENTARIS_UBAH'
 * @param {string} params.entity mis. 'Item'
 * @param {number|string} params.entityId
 * @param {number|string|null} params.aktorId
 * @param {object} [params.sebelum]
 * @param {object} [params.sesudah]
 * @param {string} [params.keterangan]
 * @param {string} [params.ip]
 */
async function catatAudit({
  trx = db,
  aksi,
  entity,
  entityId,
  aktorId = null,
  sebelum = null,
  sesudah = null,
  keterangan = null,
  ip = null,
}) {
  await trx('AuditLog').insert({
    aksi,
    entity,
    entity_id: String(entityId),
    aktor_id: aktorId,
    // Nama kolom mengikuti migrasi 20260928000001: nilai_lama / nilai_baru.
    nilai_lama: sebelum ? JSON.stringify(sebelum) : null,
    nilai_baru: sesudah ? JSON.stringify(sesudah) : null,
    keterangan,
    ip_address: ip,
    waktu: db.fn.now(),
  });
}

/** Nama aksi yang dipakai sistem — dibekukan agar penamaan konsisten. */
const AKSI_AUDIT = Object.freeze({
  INVENTARIS_TAMBAH: 'INVENTARIS_TAMBAH',
  INVENTARIS_UBAH: 'INVENTARIS_UBAH',
  INVENTARIS_HAPUS: 'INVENTARIS_HAPUS',
  INVENTARIS_KONDISI: 'INVENTARIS_KONDISI',
  PAKET_TAMBAH: 'PAKET_TAMBAH',
  PAKET_UBAH: 'PAKET_UBAH',
  PESANAN_DIBUAT: 'PESANAN_DIBUAT',
  PESANAN_BATAL: 'PESANAN_BATAL',
  PESANAN_KEDALUWARSA: 'PESANAN_KEDALUWARSA',
  PESANAN_STATUS: 'PESANAN_STATUS',
  PEMBAYARAN_STATUS: 'PEMBAYARAN_STATUS',
  PEMBAYARAN_WEBHOOK: 'PEMBAYARAN_WEBHOOK',
  SERAH_TERIMA: 'SERAH_TERIMA',
  PENGEMBALIAN: 'PENGEMBALIAN',
  DENDA_TERAPKAN: 'DENDA_TERAPKAN',
  DENDA_DISESUAIKAN: 'DENDA_DISESUAIKAN',
  PENGGUNA_DAFTAR: 'PENGGUNA_DAFTAR',
  PENGGUNA_LOGIN: 'PENGGUNA_LOGIN',
  PENGGUNA_UBAH: 'PENGGUNA_UBAH',
  PENGGUNA_STATUS: 'PENGGUNA_STATUS',
  MEDIA_TAMBAH: 'MEDIA_TAMBAH',
  MEDIA_UBAH: 'MEDIA_UBAH',
  MEDIA_HAPUS: 'MEDIA_HAPUS',
  MEDIA_URUTAN: 'MEDIA_URUTAN',
  TARIF_DENDA_UBAH: 'TARIF_DENDA_UBAH',
  DENDA_LUNAS: 'DENDA_LUNAS',
});

module.exports = { catatAudit, AKSI_AUDIT };
