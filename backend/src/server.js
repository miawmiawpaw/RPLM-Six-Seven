const app = require('./app');
const config = require('./config');
const db = require('./config/database');
const { mulaiScheduler } = require('./jobs/scheduler');

/**
 * Titik masuk proses backend.
 *
 * Urutan penting: uji koneksi basis data DAHULU, baru dengarkan port. Melayani
 * permintaan tanpa basis data hanya menghasilkan galat 500 yang membingungkan.
 */
async function mulai() {
  try {
    await db.raw('SELECT 1');
    console.log('[DB] Koneksi ke MySQL berhasil.');
  } catch (err) {
    console.error('[DB] Gagal terhubung ke MySQL.', err.message);
    console.error('     Periksa isi berkas .env — salin dari .env.example bila belum ada.');
    process.exit(1);
  }

  // ADR-15: scheduler berjalan di dalam proses yang sama.
  mulaiScheduler();

  const server = app.listen(config.port, () => {
    console.log(`[API] Berjalan di http://localhost:${config.port}`);
    console.log(`[API] Lingkungan: ${config.env}`);
    console.log(`[API] Midtrans: ${config.midtrans.isProduction ? 'PRODUKSI' : 'sandbox'}`);
  });

  /** Penutupan rapi agar koneksi basis data tidak menggantung. */
  const tutup = async (sinyal) => {
    console.log(`\n[API] Menerima ${sinyal}, menutup dengan rapi...`);
    server.close(async () => {
      await db.destroy();
      console.log('[API] Selesai.');
      process.exit(0);
    });
    // Jaring pengaman bila koneksi menggantung lebih dari 10 detik.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => tutup('SIGINT'));
  process.on('SIGTERM', () => tutup('SIGTERM'));
}

mulai();
