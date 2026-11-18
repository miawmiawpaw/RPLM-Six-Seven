import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, PERAN } from '../context/AuthContext';
import { useKeranjang } from '../context/CartContext';
import logo from '../../assets/Rental Camping/Footer Logo.svg';
import cartIcon from '../../assets/Rental Camping/Cart Icon.svg';
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
      <header className="header meadow-header">
        <Link to="/" className="merek"><img src={logo} alt="" /><span><strong>RENTAL CAMPING</strong><small>OUTDOOR RENTAL</small></span></Link>
        <nav className="navigasi" aria-label="Navigasi utama">
          <NavLink to="/katalog" className="tautan">Katalog Alat</NavLink>
          <a className="tautan" href="/#paket">Paket Sewa</a>
          <a className="tautan" href="/#cara-sewa">Cara Sewa</a>
          <a className="tautan" href="/#bantuan">Bantuan</a>
        </nav>
        <div className="aksi-header">
          {(!masukAkun || peran === PERAN.PELANGGAN) && <Link to="/keranjang" className="tautan-keranjang"><img src={cartIcon} alt="" />Keranjang{totalItem > 0 && <span className="lencana">{totalItem}</span>}</Link>}
          {masukAkun ? <><span className="nama-pengguna">{pengguna?.nama}</span><button type="button" onClick={tanganiKeluar} className="tombol-kecil">Keluar</button></> : <Link to="/masuk" className="tombol-kecil">Masuk</Link>}
        </div>
      </header>
      <main className="konten"><Outlet /></main>
      <footer className="footer meadow-footer"><p>RENTAL CAMPING — Penyedia perlengkapan outdoor untuk perjalanan yang lebih nyaman dan berkesan.</p><p>© 2026 Rental Camping Indonesia. Hak Cipta Dilindungi.</p></footer>
    </div>
  );
}
