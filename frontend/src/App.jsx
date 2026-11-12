import { Route, Routes } from 'react-router-dom';

import TataLetak from './routes/TataLetak';
import { RuteTerlindungi, RuteTamu } from './routes/PenjagaRute';
import { PERAN } from './context/AuthContext';

// ─── Halaman publik ──────────────────────────────────────────────────────────
import Beranda from './pages/Beranda';
import Katalog from './pages/Katalog';
import DetailAlat from './pages/DetailAlat';

// ─── Halaman autentikasi ─────────────────────────────────────────────────────
import Masuk from './pages/Masuk';
import Daftar from './pages/Daftar';
import LupaKataSandi from './pages/LupaKataSandi';
import AturUlangKataSandi from './pages/AturUlangKataSandi';

// ─── Halaman pelanggan ───────────────────────────────────────────────────────
import Keranjang from './pages/Keranjang';
import Checkout from './pages/Checkout';
import PesananSaya from './pages/PesananSaya';
import DetailPesanan from './pages/DetailPesanan';
import Profil from './pages/Profil';

// ─── Halaman petugas ─────────────────────────────────────────────────────────
import TugasPetugas from './pages/petugas/TugasPetugas';
import FormulirChecklist from './pages/petugas/FormulirChecklist';

// ─── Halaman admin ───────────────────────────────────────────────────────────
import DasborAdmin from './pages/admin/DasborAdmin';
import InventarisAdmin from './pages/admin/InventarisAdmin';
import PesananAdmin from './pages/admin/PesananAdmin';
import DendaAdmin from './pages/admin/DendaAdmin';
import LaporanAdmin from './pages/admin/LaporanAdmin';

/**
 * Pemetaan rute — memetakan P-01..P-21 pada PRD §10.
 *
 * Catatan: penjagaan peran di sini bersifat antarmuka saja. Penegakan sebenarnya
 * ada di backend (ADR-08, BR-021).
 */
export default function App() {
  return (
    <Routes>
      <Route element={<TataLetak />}>
        {/* ── Publik ─────────────────────────────────────────────────────── */}
        <Route index element={<Beranda />} />
        <Route path="katalog" element={<Katalog />} />
        <Route path="katalog/:itemId" element={<DetailAlat />} />

        {/* ── Autentikasi: hanya tamu ────────────────────────────────────── */}
        <Route
          path="masuk"
          element={
            <RuteTamu>
              <Masuk />
            </RuteTamu>
          }
        />
        <Route
          path="daftar"
          element={
            <RuteTamu>
              <Daftar />
            </RuteTamu>
          }
        />
        {/* Lupa & atur ulang sandi tetap dapat diakses pengguna yang sudah masuk,
            karena tautan dari email bisa dibuka di peramban yang masih bersesi. */}
        <Route path="lupa-kata-sandi" element={<LupaKataSandi />} />
        <Route path="atur-ulang-kata-sandi" element={<AturUlangKataSandi />} />

        {/* ── Pelanggan ──────────────────────────────────────────────────── */}
        <Route
          path="keranjang"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.PELANGGAN]}>
              <Keranjang />
            </RuteTerlindungi>
          }
        />
        <Route
          path="checkout"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.PELANGGAN]}>
              <Checkout />
            </RuteTerlindungi>
          }
        />
        <Route
          path="pesanan-saya"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.PELANGGAN]}>
              <PesananSaya />
            </RuteTerlindungi>
          }
        />
        {/* Detail pesanan dibuka untuk pelanggan, petugas, dan admin —
            backend yang menentukan siapa boleh melihat apa (BR-024). */}
        <Route
          path="pesanan/:orderId"
          element={
            <RuteTerlindungi>
              <DetailPesanan />
            </RuteTerlindungi>
          }
        />

        {/* ── Profil: semua peran yang sudah masuk ───────────────────────── */}
        <Route
          path="profil"
          element={
            <RuteTerlindungi>
              <Profil />
            </RuteTerlindungi>
          }
        />

        {/* ── Petugas ────────────────────────────────────────────────────── */}
        <Route
          path="petugas/tugas"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.PETUGAS, PERAN.ADMIN]}>
              <TugasPetugas />
            </RuteTerlindungi>
          }
        />
        <Route
          path="petugas/checklist/:orderId/:tipe"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.PETUGAS, PERAN.ADMIN]}>
              <FormulirChecklist />
            </RuteTerlindungi>
          }
        />

        {/* ── Admin ──────────────────────────────────────────────────────── */}
        <Route
          path="admin/dasbor"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.ADMIN]}>
              <DasborAdmin />
            </RuteTerlindungi>
          }
        />
        <Route
          path="admin/inventaris"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.ADMIN]}>
              <InventarisAdmin />
            </RuteTerlindungi>
          }
        />
        <Route
          path="admin/pesanan"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.ADMIN]}>
              <PesananAdmin />
            </RuteTerlindungi>
          }
        />
        <Route
          path="admin/denda"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.ADMIN]}>
              <DendaAdmin />
            </RuteTerlindungi>
          }
        />
        <Route
          path="admin/laporan"
          element={
            <RuteTerlindungi peranDiizinkan={[PERAN.ADMIN]}>
              <LaporanAdmin />
            </RuteTerlindungi>
          }
        />

        {/* ── 404 ────────────────────────────────────────────────────────── */}
        <Route path="*" element={<TidakDitemukan />} />
      </Route>
    </Routes>
  );
}

function TidakDitemukan() {
  return (
    <section className="halaman">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang Anda tuju tidak tersedia atau sudah dipindahkan.</p>
    </section>
  );
}
