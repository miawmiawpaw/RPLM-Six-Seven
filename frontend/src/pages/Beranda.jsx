import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { rupiah } from '../utils/format';
import calendarIcon from '../../assets/Rental Camping/Calendar Glyph.svg';
import chevronIcon from '../../assets/Rental Camping/ChevronDown Glyph.svg';
import tentIcon from '../../assets/Rental Camping/Category/Tent Glyph.svg';
import carrierIcon from '../../assets/Rental Camping/Category/Carrier Glyph.svg';
import cookwareIcon from '../../assets/Rental Camping/Category/Cookware Glyph.svg';
import sleepIcon from '../../assets/Rental Camping/Category/Icon/Sleep Glyph.svg';
import careIcon from '../../assets/Rental Camping/Icon/Care Glyph.svg';
import transparentIcon from '../../assets/Rental Camping/Transparent Glyph.svg';
import flexibleIcon from '../../assets/Rental Camping/Flexible Glyph.svg';
import supportIcon from '../../assets/Rental Camping/Support Glyph.svg';
import availableDot from '../../assets/Rental Camping/Available Dot.svg';
import heroSun from '../../assets/Rental Camping/Landing/Hero/Matahari.svg';
import heroTreeLeft from '../../assets/Rental Camping/Landing/Hero/Pohon Kiri.svg';
import heroTreeRight from '../../assets/Rental Camping/Landing/Hero/Pohon Kanan.svg';
import heroTentMain from '../../assets/Rental Camping/Landing/Hero/Tenda - Bidang Utama.svg';
import heroTentSide from '../../assets/Rental Camping/Landing/Hero/Tenda - Sisi Kanan.svg';
import heroTentRoof from '../../assets/Rental Camping/Landing/Hero/Tenda - Garis Atap.svg';
import heroTentDoor from '../../assets/Rental Camping/Landing/Hero/Tenda - Pintu.svg';
import heroTentDoorLine from '../../assets/Rental Camping/Landing/Hero/Tenda - Garis Pintu.svg';
import pkgSun from '../../assets/Rental Camping/Landing/Package Duo/Matahari.svg';
import pkgTentBody from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Siluet Utama.svg';
import pkgTentLeft from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Panel Kiri.svg';
import pkgTentRight from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Panel Kanan.svg';
import pkgTentFold from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Lipatan Kanan.svg';
import pkgTentDoor from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Pintu.svg';
import pkgTentRoof from '../../assets/Rental Camping/Landing/Package Duo/Tenda - Garis Atap.svg';
import mapPin from '../../assets/Rental Camping/Landing/Lokasi/Peta - Pin Lokasi.svg';
import mapPinCircle from '../../assets/Rental Camping/Landing/Lokasi/Peta - Lingkaran Pin.svg';
import mapPinCheck from '../../assets/Rental Camping/Landing/Lokasi/Peta - Tanda Centang Pin.svg';
import heroPhoto from '../../assets/Rental Camping/Landing/Hero/vasiliy-rychkov-ZQIx60ZGxjo-unsplash.jpg';

const KEUNGGULAN = [
  ['Perlengkapan Terawat', 'Setiap unit diperiksa dan dibersihkan sebelum disewakan.', careIcon],
  ['Harga Transparan', 'Tarif dan deposit ditampilkan dengan jelas sejak awal.', transparentIcon],
  ['Booking Fleksibel', 'Pilih periode dan perlengkapan sesuai rencana perjalanan.', flexibleIcon],
  ['Bantuan Responsif', 'Tim kami siap membantu saat kamu membutuhkan informasi.', supportIcon],
];
const KATEGORI = [
  ['Tenda & Shelter', 'Tenda', tentIcon], ['Tas & Carrier', 'Tas / Carrier', carrierIcon],
  ['Peralatan Masak', 'Alat Masak', cookwareIcon], ['Matras & Sleeping Bag', 'Nesting', sleepIcon],
];
const LANGKAH = [
  ['Pilih Tanggal & Alat', 'Tentukan periode sewa dan perlengkapan yang dibutuhkan.'],
  ['Booking & Pembayaran', 'Konfirmasi pesanan dan selesaikan pembayaran dengan mudah.'],
  ['Ambil di Basecamp', 'Tunjukkan tiket dan cek kelengkapan bersama petugas.'],
  ['Kembalikan Peralatan', 'Petugas memeriksa kondisi alat setelah masa sewa.'],
];

export default function Beranda() {
  const [kategori, setKategori] = useState([]);
  const [paket, setPaket] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    Promise.all([api.katalog.kategori(), api.katalog.bundle()])
      .then(([kategoriHasil, paketHasil]) => { setKategori(kategoriHasil.data || []); setPaket(paketHasil.data || []); })
      .catch((err) => setGalat(err.message)).finally(() => setMemuat(false));
  }, []);
  return <div className="landing">
    <section className="landing-hero"><div className="landing-hero-copy"><p className="landing-eyebrow landing-eyebrow-pill">OUTDOOR RENTAL <span>•</span> YOGYAKARTA</p><h1>Sewa perlengkapan camping untuk <em>petualanganmu.</em></h1><p className="landing-lead">Temukan perlengkapan camping dan pendakian berkualitas. Pilih alat, tentukan tanggal, lalu nikmati perjalanan tanpa repot menyiapkan semuanya sendiri.</p><div className="landing-actions"><Link to="/katalog" className="landing-button">Jelajahi Perlengkapan</Link><a href="#cara-sewa" className="landing-button landing-button-light">Cara Sewa</a></div><div className="landing-trust"><span>● Perlengkapan terawat</span><span>● Proses sewa mudah</span></div></div><div className="landing-art landing-art-photo"><img className="landing-hero-photo" src={heroPhoto} alt="Perlengkapan camping di alam terbuka" /><div className="landing-note"><b>✓</b><span>Siap berpetualang<small>Peralatan dicek sebelum disewa</small></span></div></div></section>
    <form className="landing-search" onSubmit={(event) => event.preventDefault()}><label>Mulai Sewa<span><img src={calendarIcon} alt="" /><input type="date" aria-label="Pilih tanggal mulai" /></span></label><label>Selesai Sewa<span><img src={calendarIcon} alt="" /><input type="date" aria-label="Pilih tanggal selesai" /></span></label><label>Kategori Perlengkapan<span><img src={chevronIcon} alt="" /><select aria-label="Kategori perlengkapan"><option value="">Semua kategori</option>{kategori.map((item) => <option key={item.category_id} value={item.category_id}>{item.nama}</option>)}</select></span></label><button className="landing-button" type="submit">Cari Ketersediaan</button></form>
    <section className="landing-section landing-benefits"><SectionHeading label="KENAPA KAMI" title="Camping lebih tenang, persiapan lebih ringan." text="Semua kebutuhan petualanganmu, kami siapkan dengan standar yang jelas." /><div className="landing-grid landing-grid-four">{KEUNGGULAN.map(([title, text, icon]) => <article className="landing-card" key={title}><span className="landing-icon"><img src={icon} alt="" /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="landing-section landing-categories"><SectionHeading label="PILIH SESUAI KEBUTUHAN" title="Jelajahi kategori perlengkapan" link="Lihat semua kategori →" /><div className="landing-grid landing-grid-four">{KATEGORI.map(([title, filter, icon]) => <Link className="landing-category" to={`/katalog?kategori=${encodeURIComponent(filter)}`} key={title}><span className="landing-category-icon"><img src={icon} alt="" /></span><span><b>{title}</b><small>{kategori.find((item) => item.nama === filter)?.jumlah_tersedia || '—'} unit tersedia</small><strong>Lihat kategori →</strong></span></Link>)}</div></section>
    <section className="landing-section landing-packages" id="paket"><SectionHeading label="PAKET PILIHAN" title="Paket camping untuk setiap cerita." text="Pilih paket praktis atau susun kebutuhanmu sendiri." link="Lihat semua paket →" />{galat && <p className="pesan-galat" role="alert">Gagal memuat paket: {galat}</p>}{memuat && <p role="status">Memuat paket…</p>}<div className="landing-grid landing-grid-three">{paket.slice(0, 3).map((item) => <article className="landing-product" key={item.bundle_id}><div className="landing-product-art"><PackageArt /></div><small>PAKET CAMPING</small><h3>{item.nama}</h3><p>{item.deskripsi}</p><strong>{rupiah(item.harga_bundle)} <small>/ hari</small></strong><span className="landing-stock"><img src={availableDot} alt="" /> Tersedia</span><Link to={`/katalog?bundle=${item.bundle_id}`} className="landing-button">Sewa paket</Link></article>)}</div></section>
    <section className="landing-section landing-steps" id="cara-sewa"><SectionHeading label="CARA SEWA" title="Empat langkah menuju petualangan." text="Dari memilih alat hingga mengembalikannya, semua dibuat sederhana." /><div className="landing-grid landing-grid-four">{LANGKAH.map(([title, text], index) => <article className="landing-step" key={title}><b>{String(index + 1).padStart(2, '0')}</b><small>LANGKAH {String(index + 1).padStart(2, '0')}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="landing-section landing-location" id="bantuan"><SectionHeading label="KUNJUNGI BASECAMP" title="Mulai perjalanan dari tempat yang tepat." /><div className="landing-location-grid"><div className="landing-map"><iframe title="Lokasi Basecamp Rental Outdoor Pusat" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126495.01682914136!2d110.19669089726561!3d-7.7930777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a581f5e1f21d5%3A0x3880fc836baa518a!2sUrban%20Adventure%20-%20Sewa%20%2F%20Rental%20Tenda%20Outdoor%20%26%20Alat%20Camping%20Jogja!5e0!3m2!1sid!2sid!4v1795021165872!5m2!1sid!2sid" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div><article className="landing-location-card"><small>LOKASI PENGAMBILAN &amp; PENGEMBALIAN</small><h3>Basecamp Rental Outdoor Pusat</h3><p>Jl. Rimba No. 42, Sleman, DI Yogyakarta</p><small>Setiap hari • 08:00 - 21:00 WIB</small><a className="landing-button landing-button-light" href="https://maps.google.com/?q=Sleman" target="_blank" rel="noreferrer">Petunjuk Arah</a></article></div></section>
  </div>;
}

/** Ilustrasi kartu paket (Figma "Camping Tent Illustration", 276×164) — posisi dalam persen. */
function PackageArt() {
  return <div className="landing-pkg-art" aria-hidden="true">
    <svg className="landing-pkg-hills" viewBox="0 0 276 164" preserveAspectRatio="none"><path d="M0 112C60 88 120 100 170 92C220 84 250 88 276 82V164H0Z" fill="#b7c2ab" /><path d="M0 134C50 124 92 150 140 150C200 150 240 120 276 112V164H0Z" fill="#869b54" /></svg>
    <img className="pkg-sun" src={pkgSun} alt="" />
    <img className="pkg-tent pkg-tent-body" src={pkgTentBody} alt="" />
    <img className="pkg-tent pkg-tent-left" src={pkgTentLeft} alt="" />
    <img className="pkg-tent pkg-tent-right" src={pkgTentRight} alt="" />
    <img className="pkg-tent pkg-tent-fold" src={pkgTentFold} alt="" />
    <img className="pkg-tent pkg-tent-door" src={pkgTentDoor} alt="" />
    <img className="pkg-tent pkg-tent-roof" src={pkgTentRoof} alt="" />
  </div>;
}

function SectionHeading({ label, title, text, link }) { return <div className="landing-heading"><div><p className="landing-eyebrow">{label}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{link && <Link to="/katalog">{link}</Link>}</div>; }
