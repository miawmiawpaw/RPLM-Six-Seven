import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, PERAN } from '../context/AuthContext';
import { useKeranjang } from '../context/CartContext';

/**
 * Kerangka halaman: header, navigasi per peran, dan wadah konten.
 *
 * Menu disusun dari peran pengguna. Menyembunyikan menu yang tidak relevan
 * mengurangi kesalahan, tetapi bukan pengamanan — backend tetap menolak
 * permintaan yang tidak berhak.
 */

const MENU = {
  [PERAN.PELANGGAN]: [
    { ke: '/katalog', label: 'Katalog' },
    { ke: '/pesanan-saya', label: 'Pesanan Saya' },
    { ke: '/profil', label: 'Profil' },
  ],
  [PERAN.PETUGAS]: [
    { ke: '/petugas/tugas', label: 'Tugas' },
    { ke: '/profil', label: 'Profil' },
  ],
  [PERAN.ADMIN]: [
    { ke: '/admin/dasbor', label: 'Dasbor' },
    { ke: '/admin/inventaris', label: 'Inventaris' },
    { ke: '/admin/pesanan', label: 'Pesanan' },
    { ke: '/admin/denda', label: 'Denda' },
    { ke: '/admin/laporan', label: 'Laporan' },
    { ke: '/profil', label: 'Profil' },
  ],
};

const MENU_TAMU = [
  { ke: '/katalog', label: 'Katalog' },
  { ke: '/masuk', label: 'Masuk' },
];

export default function TataLetak() {
  const { pengguna, masukAkun, peran, keluar } = useAuth();
  const { totalItem } = useKeranjang();
  const navigate = useNavigate();

  const menu = masukAkun ? MENU[peran] || [] : MENU_TAMU;

  async function tanganiKeluar() {
    await keluar();
    navigate('/', { replace: true });
  }

  return (
    <div className="tata-letak">
      <header className="header">
        <Link to="/" className="merek">
          Rental Alat Camping
        </Link>

        <nav className="navigasi" aria-label="Navigasi utama">
          {menu.map((item) => (
            <NavLink
              key={item.ke}
              to={item.ke}
              className={({ isActive }) => (isActive ? 'tautan aktif' : 'tautan')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="aksi-header">
          {/* Keranjang hanya bermakna untuk pelanggan. */}
          {(!masukAkun || peran === PERAN.PELANGGAN) && (
            <Link to="/keranjang" className="tautan-keranjang">
              Keranjang
              {totalItem > 0 && <span className="lencana">{totalItem}</span>}
            </Link>
          )}

          {masukAkun ? (
            <>
              <span className="nama-pengguna">{pengguna?.nama}</span>
              <button type="button" onClick={tanganiKeluar} className="tombol-kecil">
                Keluar
              </button>
            </>
          ) : (
            <Link to="/daftar" className="tombol-kecil">
              Daftar
            </Link>
          )}
        </div>
      </header>

      <main className="konten">
        <Outlet />
      </main>

      <footer className="footer">
        <p>Sistem Informasi Rental Alat Camping — Proyek UAS RPLM</p>
      </footer>
    </div>
  );
}
