import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, BERANDA_PERAN } from '../context/AuthContext';

/**
 * Penjaga rute berbasis peran.
 *
 * PENTING — ini hanya kenyamanan antarmuka, BUKAN kontrol keamanan.
 * Penegakan izin yang sesungguhnya ada di backend (`middleware/auth.js`). Siapa pun
 * dapat memanggil API langsung tanpa melewati router ini. Jangan pernah menganggap
 * komponen ini sebagai lapisan pertahanan.
 */

/** Tampilan saat sesi sedang diperiksa, agar tidak berkedip ke halaman masuk. */
function MemuatSesi() {
  return (
    <div className="halaman-memuat" role="status" aria-live="polite">
      <p>Memeriksa sesi…</p>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string[]} [props.peranDiizinkan] bila kosong, cukup perlu masuk
 */
export function RuteTerlindungi({ peranDiizinkan, children }) {
  const { memuat, masukAkun, peran } = useAuth();
  const lokasi = useLocation();

  if (memuat) return <MemuatSesi />;

  if (!masukAkun) {
    // Simpan tujuan awal agar pengguna kembali ke sana setelah masuk.
    return <Navigate to="/masuk" state={{ dari: lokasi.pathname }} replace />;
  }

  if (peranDiizinkan && !peranDiizinkan.includes(peran)) {
    // Sudah masuk tetapi perannya tidak berhak — arahkan ke beranda perannya,
    // bukan ke halaman masuk (ia sudah masuk; mengirimnya ke /masuk membingungkan).
    return <Navigate to={BERANDA_PERAN[peran] || '/'} replace />;
  }

  return children;
}

/** Rute yang hanya boleh diakses tamu — pengguna yang sudah masuk dialihkan. */
export function RuteTamu({ children }) {
  const { memuat, masukAkun, peran } = useAuth();

  if (memuat) return <MemuatSesi />;
  if (masukAkun) return <Navigate to={BERANDA_PERAN[peran] || '/'} replace />;

  return children;
}
