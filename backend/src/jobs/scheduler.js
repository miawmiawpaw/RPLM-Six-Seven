const cron = require('node-cron');
const db = require('../config/database');
const { STATUS_PESANAN } = require('../constants');
const orderService = require('../modules/order/order.service');

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
 * Memakai orderService.ubahStatus (sumber tunggal transisi status): ia memvalidasi
 * transisi, melepas reservasi (AKTIF -> DILEPAS), dan mencatat audit. Reservasi tidak
 * dihapus agar jejaknya tetap ada.
 */
async function batalkanPesananKedaluwarsa() {
  const pesananKedaluwarsa = await db('Order')
    .where('status', STATUS_PESANAN.MENUNGGU_PEMBAYARAN)
    .where('batas_pembayaran', '<', new Date())
    .select('order_id', 'kode_pesanan');

  let dibatalkan = 0;
  for (const pesanan of pesananKedaluwarsa) {
    try {
      await db.transaction((trx) =>
        orderService.ubahStatus({
          orderId: pesanan.order_id,
          statusBaru: STATUS_PESANAN.GAGAL_KEDALUWARSA,
          aktorId: null,
          keterangan: `Pesanan ${pesanan.kode_pesanan} batal otomatis karena melewati batas pembayaran.`,
          trx,
        })
      );
      dibatalkan += 1;
    } catch (err) {
      // Satu pesanan gagal (mis. baru saja dibayar) tidak boleh menghentikan sisanya.
      console.error(`[SCHEDULER] Lewati pesanan ${pesanan.kode_pesanan}:`, err.message);
    }
  }

  if (dibatalkan > 0) console.log(`[SCHEDULER] ${dibatalkan} pesanan ditandai kedaluwarsa.`);
  return dibatalkan;
}

/**
 * REQ-4.5.5 — pengingat pengembalian H-1 sebelum tanggal selesai.
 * Kerangka: pengiriman email belum diimplementasikan (menunggu modul notifikasi).
 */
async function kirimPengingatPengembalian() {
  const besok = new Date(Date.now() + 86400000);

  const akanKembali = await db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .where('Order.status', STATUS_PESANAN.SEDANG_DISEWA)
    .where('Order.tanggal_selesai', besok.toISOString().slice(0, 10))
    .select('Order.order_id', 'Order.kode_pesanan', 'User.email', 'User.nama');

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
