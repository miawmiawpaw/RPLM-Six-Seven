const cron = require('node-cron');
const db = require('../config/database');
const { STATUS_PESANAN, STATUS_PESANAN_AKTIF } = require('../constants');
const { catatAudit, AKSI_AUDIT } = require('../middleware/auditLogger');

/**
 * Scheduler — ADR-15: node-cron di dalam proses aplikasi.
 *
 * UTANG TEKNIS: bila aplikasi diperbanyak menjadi lebih dari satu instans, setiap
 * instans akan menjalankan job yang sama sehingga terjadi pekerjaan ganda. Sebelum
 * memperbanyak instans, pindahkan scheduler ke proses terpisah atau tambahkan kunci
 * berbasis basis data (mis. tabel `JobLock`).
 */

/**
 * REQ-4.4.3 — pesanan yang tidak dibayar dalam 1x24 jam batal otomatis
 * dan kunci stoknya dilepaskan.
 *
 * Reservasi TIDAK dihapus, melainkan diubah statusnya. Menghapusnya akan menghilangkan
 * jejak; membiarkannya dengan status GAGAL_KEDALUWARSA membuat Availability Engine
 * otomatis mengabaikannya karena statusnya tidak termasuk STATUS_PESANAN_AKTIF.
 */
async function batalkanPesananKedaluwarsa() {
  const sekarang = new Date();

  const pesananKedaluwarsa = await db('Order')
    .where('status', STATUS_PESANAN.MENUNGGU_PEMBAYARAN)
    .where('batas_pembayaran', '<', sekarang)
    .select('id', 'kode_pesanan', 'user_id');

  if (pesananKedaluwarsa.length === 0) return 0;

  for (const pesanan of pesananKedaluwarsa) {
    await db.transaction(async (trx) => {
      await trx('Order')
        .where({ id: pesanan.id, status: STATUS_PESANAN.MENUNGGU_PEMBAYARAN })
        .update({ status: STATUS_PESANAN.GAGAL_KEDALUWARSA, diubah_pada: trx.fn.now() });

      await trx('StockReservation')
        .where({ order_id: pesanan.id })
        .whereIn('status', STATUS_PESANAN_AKTIF)
        .update({ status: STATUS_PESANAN.GAGAL_KEDALUWARSA, diubah_pada: trx.fn.now() });

      await catatAudit({
        trx,
        aksi: AKSI_AUDIT.PESANAN_KEDALUWARSA,
        entity: 'Order',
        entityId: pesanan.id,
        keterangan: `Pesanan ${pesanan.kode_pesanan} batal otomatis karena melewati batas pembayaran.`,
      });
    });
  }

  console.log(`[SCHEDULER] ${pesananKedaluwarsa.length} pesanan ditandai kedaluwarsa.`);
  return pesananKedaluwarsa.length;
}

/**
 * REQ-4.5.5 — pengingat pengembalian H-1 sebelum tanggal selesai.
 * Kerangka: pengiriman email belum diimplementasikan (menunggu modul notifikasi).
 */
async function kirimPengingatPengembalian() {
  const besok = new Date(Date.now() + 86400000);

  const akanKembali = await db('Order')
    .join('User', 'User.id', 'Order.user_id')
    .where('Order.status', STATUS_PESANAN.SEDANG_DISEWA)
    .whereDate('Order.tanggal_selesai', besok.toISOString().slice(0, 10))
    .select('Order.id', 'Order.kode_pesanan', 'User.email', 'User.nama');

  // TODO: sambungkan ke modul notifikasi email setelah ADR penyedia SMTP final.
  console.log(`[SCHEDULER] ${akanKembali.length} pengingat pengembalian perlu dikirim.`);
  return akanKembali.length;
}

/** Daftarkan seluruh job. Dipanggil sekali dari server.js. */
function mulaiScheduler() {
  // Setiap 10 menit — cukup rapat agar stok cepat tersedia kembali, tanpa membebani DB.
  cron.schedule('*/10 * * * *', () => {
    batalkanPesananKedaluwarsa().catch((err) =>
      console.error('[SCHEDULER] Gagal membatalkan pesanan kedaluwarsa:', err.message)
    );
  });

  // Setiap hari pukul 08:00 WIB.
  cron.schedule(
    '0 8 * * *',
    () => {
      kirimPengingatPengembalian().catch((err) =>
        console.error('[SCHEDULER] Gagal mengirim pengingat:', err.message)
      );
    },
    { timezone: 'Asia/Jakarta' }
  );

  console.log('[SCHEDULER] Job terjadwal aktif (auto-cancel tiap 10 menit, pengingat harian 08:00 WIB).');
}

module.exports = {
  mulaiScheduler,
  batalkanPesananKedaluwarsa,
  kirimPengingatPengembalian,
};
