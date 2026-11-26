import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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

const PUBLIK = [
  { ke: '/katalog', label: 'Katalog Alat' },
  { ke: '/#paket', label: 'Paket Sewa' },
  { ke: '/#cara-sewa', label: 'Cara Sewa' },
  { ke: '/#bantuan', label: 'Bantuan' },
];

const MENU = {
  // Pelanggan yang sudah masuk tidak butuh anchor pemasaran: paket ada di tab Katalog, bantuan di footer.
  [PERAN.PELANGGAN]: [PUBLIK[0], { ke: '/pesanan-saya', label: 'Pesanan Saya' }],
  [PERAN.PETUGAS]: [{ ke: '/petugas/tugas', label: 'Tugas' }],
  [PERAN.ADMIN]: [
    { ke: '/admin/dasbor', label: 'Dasbor' },
    { ke: '/admin/inventaris', label: 'Inventaris' },
    { ke: '/admin/pesanan', label: 'Pesanan' },
    { ke: '/admin/denda', label: 'Denda' },
    { ke: '/admin/laporan', label: 'Laporan' },
  ],
};

const LABEL_PERAN = { [PERAN.PELANGGAN]: 'Pelanggan', [PERAN.PETUGAS]: 'Petugas', [PERAN.ADMIN]: 'Admin' };

/** Menu akun: avatar membuka Profil dan Keluar. Esc atau klik di luar menutupnya. */
function MenuAkun({ pengguna, peran, onKeluar }) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef(null);
  const tombol = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setBuka(false), [pathname]);

  useEffect(() => {
    if (!buka) return undefined;
    const klikLuar = (e) => {
      if (!wadah.current?.contains(e.target)) setBuka(false);
    };
    const tekan = (e) => {
      if (e.key !== 'Escape') return;
      setBuka(false);
      tombol.current?.focus();
    };
    document.addEventListener('pointerdown', klikLuar);
    document.addEventListener('keydown', tekan);
    return () => {
      document.removeEventListener('pointerdown', klikLuar);
      document.removeEventListener('keydown', tekan);
    };
  }, [buka]);

  const inisial = (pengguna?.nama || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="akun-menu" ref={wadah}>
      <button ref={tombol} type="button" className="akun-tombol" aria-expanded={buka} aria-controls="menu-akun" onClick={() => setBuka((v) => !v)}>
        <span className="avatar" aria-hidden="true">{inisial}</span>
        <span className="sr-only">Menu akun {pengguna?.nama}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {buka && (
        <div id="menu-akun" className="akun-panel">
          <div className="akun-info">
            <strong>{pengguna?.nama}</strong>
            <small>{LABEL_PERAN[peran]}</small>
          </div>
          <Link to="/profil">Profil</Link>
          <button type="button" onClick={onKeluar}>Keluar</button>
        </div>
      )}
    </div>
  );
}

export default function TataLetak() {
  const { pengguna, masukAkun, peran, keluar } = useAuth();
  const { totalItem } = useKeranjang();
  const navigate = useNavigate();
  const lokasi = useLocation();
  const [terbuka, setTerbuka] = useState(false);

  const menu = masukAkun ? MENU[peran] || [] : PUBLIK;

  // Pindah halaman: tutup menu mobile, lalu gulir ke bagian (#hash) atau ke atas.
  useEffect(() => {
    setTerbuka(false);
    if (!lokasi.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return undefined;
    }
    // Tinggi halaman bertambah setelah data termuat, sehingga posisi bagian bergeser:
    // ulangi beberapa kali agar tetap tepat sasaran. shortcut: jeda tetap, ganti ResizeObserver bila ada bagian yang termuat lebih lambat.
    const id = decodeURIComponent(lokasi.hash.slice(1));
    const gulir = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
    gulir();
    const timer = [300, 900].map((ms) => setTimeout(gulir, ms));
    return () => timer.forEach(clearTimeout);
  }, [lokasi.pathname, lokasi.hash]);

  useEffect(() => {
    if (!terbuka) return undefined;
    const tutupDenganEsc = (e) => e.key === 'Escape' && setTerbuka(false);
    document.addEventListener('keydown', tutupDenganEsc);
    return () => document.removeEventListener('keydown', tutupDenganEsc);
  }, [terbuka]);

  async function tanganiKeluar() {
    await keluar();
    navigate('/', { replace: true });
  }

  const akun = masukAkun ? (
    <>
      <Link to="/profil" className="nama-pengguna" title="Profil saya">
        <span className="avatar" aria-hidden="true">{(pengguna?.nama || '?').trim().charAt(0).toUpperCase()}</span>
        <span>{pengguna?.nama}</span>
      </Link>
      <button type="button" onClick={tanganiKeluar} className="tombol-kecil">Keluar</button>
    </>
  ) : (
    <Link to="/masuk" className="tombol-kecil">Masuk</Link>
  );

  return (
    <div className="tata-letak">
      <a href="#konten" className="lompat">Lewati ke konten</a>
      <header className="header meadow-header">
        <Link to="/" className="merek"><img src={logo} alt="" width="40" height="40" /><span translate="no"><strong>RENTAL CAMPING</strong><small>OUTDOOR RENTAL</small></span></Link>
        <nav id="navigasi-utama" className={terbuka ? 'navigasi terbuka' : 'navigasi'} aria-label="Navigasi utama">
          {menu.map((m) => m.ke.includes('#')
            ? <Link key={m.ke} to={m.ke} className="tautan">{m.label}</Link>
            : <NavLink key={m.ke} to={m.ke} className="tautan">{m.label}</NavLink>)}
          <div className="nav-akun">{akun}</div>
        </nav>
        <div className="aksi-header">
          <span className="sr-only" role="status" aria-live="polite">{totalItem > 0 ? `Keranjang berisi ${totalItem} item.` : ''}</span>
          {(!masukAkun || peran === PERAN.PELANGGAN) && (
            <Link to="/keranjang" className="tautan-keranjang" aria-label={totalItem > 0 ? `Keranjang, ${totalItem} item` : 'Keranjang'}>
              <img src={cartIcon} alt="" width="16" height="16" />{totalItem > 0 && <span className="lencana">{totalItem}</span>}
            </Link>
          )}
          <div className="aksi-akun">
            {masukAkun ? <MenuAkun pengguna={pengguna} peran={peran} onKeluar={tanganiKeluar} /> : <Link to="/masuk" className="tombol-kecil">Masuk</Link>}
          </div>
          <button type="button" className="tombol-menu" aria-expanded={terbuka} aria-controls="navigasi-utama" aria-label={terbuka ? 'Tutup menu' : 'Buka menu'} onClick={() => setTerbuka((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {terbuka ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </header>
      <main id="konten" tabIndex={-1} className="konten"><Outlet /></main>
      <footer className="meadow-footer" aria-label="Tentang Rental Camping"><img className="meadow-footer-art" src={footerArtwork} alt="" /><div className="meadow-footer-content"><div className="meadow-footer-cta"><h2>Saatnya melangkah lebih jauh.</h2><p className="meadow-footer-accent">Cerita baik menunggu di luar sana.</p><p>Siapkan perlengkapanmu. Sisanya, biarkan alam yang bercerita.</p><Link to="/katalog" className="tombol-utama">Mulai Sewa</Link></div><div className="meadow-footer-divider" /><div className="meadow-footer-main"><div className="meadow-footer-brand"><div><img src={logo} alt="" /><strong>RENTAL CAMPING</strong></div><p>Penyedia perlengkapan outdoor untuk perjalanan yang lebih nyaman dan berkesan.</p></div><FooterLinks title="JELAJAHI" links={[["Katalog Alat", "/katalog"], ["Paket Sewa", "/#paket"], ["Cara Sewa", "/#cara-sewa"]]} /><FooterLinks title="INFORMASI" links={[["Syarat & Ketentuan", "#"], ["Kebijakan Privasi", "#"], ["Bantuan & FAQ", "/#bantuan"]]} /><FooterLinks title="HUBUNGI KAMI" links={[["Bantuan & FAQ", "/#bantuan"], ["+62 812-3456-7890", "tel:+6281234567890"], ["Yogyakarta, Indonesia", "#"]]} /></div><div className="meadow-footer-divider" /><p className="meadow-footer-copyright">© 2026 Rental Camping Indonesia. Hak Cipta Dilindungi.</p></div></footer>
    </div>
  );
}

function FooterLinks({ title, links }) { return <div className="meadow-footer-links"><strong>{title}</strong>{links.map(([label, to]) => to === '#' ? <span key={label}>{label}</span> : <Link key={label} to={to}>{label}</Link>)}</div>; }
