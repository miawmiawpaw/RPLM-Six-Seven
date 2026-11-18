import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, PERAN } from '../context/AuthContext';
import { useKeranjang } from '../context/CartContext';
import logo from '../../assets/Rental Camping/Footer Logo.svg';
import cartIcon from '../../assets/Rental Camping/Cart Icon.svg';
import footerArtwork from '../../assets/Meadow Hills Footer Artwork.svg';
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
      <footer className="meadow-footer"><img className="meadow-footer-art" src={footerArtwork} alt="" /><div className="meadow-footer-content"><div className="meadow-footer-cta"><h2>Saatnya melangkah lebih jauh.</h2><p className="meadow-footer-accent">Cerita baik menunggu di luar sana.</p><p>Siapkan perlengkapanmu. Sisanya, biarkan alam yang bercerita.</p><Link to="/katalog" className="tombol-utama">Mulai Sewa</Link></div><div className="meadow-footer-divider" /><div className="meadow-footer-main"><div className="meadow-footer-brand"><div><img src={logo} alt="" /><strong>RENTAL CAMPING</strong></div><p>Penyedia perlengkapan outdoor untuk perjalanan yang lebih nyaman dan berkesan.</p></div><FooterLinks title="JELAJAHI" links={[["Katalog Alat", "/katalog"], ["Paket Sewa", "/#paket"], ["Cara Sewa", "/#cara-sewa"]]} /><FooterLinks title="INFORMASI" links={[["Syarat & Ketentuan", "#"], ["Kebijakan Privasi", "#"], ["Bantuan & FAQ", "/#bantuan"]]} /><FooterLinks title="HUBUNGI KAMI" links={[["Bantuan & FAQ", "/#bantuan"], ["+62 812-3456-7890", "tel:+6281234567890"], ["Yogyakarta, Indonesia", "#"]]} /></div><div className="meadow-footer-divider" /><p className="meadow-footer-copyright">© 2026 Rental Camping Indonesia. Hak Cipta Dilindungi.</p></div></footer>
    </div>
  );
}

function FooterLinks({ title, links }) { return <div className="meadow-footer-links"><strong>{title}</strong>{links.map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}</div>; }
