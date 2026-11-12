import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Konfigurasi Vite — ADR-16: SPA tanpa SSR.
 *
 * Proksi `/api` diteruskan ke backend Express. Ini menghindari CORS saat
 * pengembangan dan menjaga kode klien bebas dari URL absolut: pemanggilan cukup
 * memakai `/api/...` baik di pengembangan maupun produksi (di produksi, reverse
 * proxy yang meneruskan ke backend).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
