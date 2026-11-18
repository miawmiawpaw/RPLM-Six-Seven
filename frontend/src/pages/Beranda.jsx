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
  ['Ambil di Basecamp', 'Tunjukkan tiket dan kelengkapan berkas saat proses.'],
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
    <section className="landing-hero"><div className="landing-hero-copy"><p className="landing-eyebrow">OUTDOOR RENTAL <span>•</span> YOGYAKARTA</p><h1>Sewa perlengkapan camping untuk <em>petualanganmu.</em></h1><p className="landing-lead">Temukan perlengkapan camping dan pendakian berkualitas. Pilih alat, tentukan tanggal, lalu nikmati perjalanan tanpa repot menyimpan semuanya sendiri.</p><div className="landing-actions"><Link to="/katalog" className="landing-button">Jelajahi Perlengkapan</Link><a href="#cara-sewa" className="landing-button landing-button-light">Cara Sewa</a></div><div className="landing-trust"><span>● Perlengkapan terawat</span><span>● Proses sewa mudah</span></div></div><div className="landing-art" aria-label="Ilustrasi camping"><div className="landing-sun" /><div className="landing-mountain landing-mountain-back" /><div className="landing-mountain landing-mountain-mid" /><div className="landing-mountain landing-mountain-front" /><div className="landing-tent" /><div className="landing-note"><b>✓</b><span>Siap berpetualang<small>Peralatan dicek sebelum disewa</small></span></div></div></section>
    <form className="landing-search" onSubmit={(event) => event.preventDefault()}><label>Mulai Sewa<span><img src={calendarIcon} alt="" /><input type="date" aria-label="Pilih tanggal mulai" /></span></label><label>Selesai Sewa<span><img src={calendarIcon} alt="" /><input type="date" aria-label="Pilih tanggal selesai" /></span></label><label>Kategori Perlengkapan<span><img src={chevronIcon} alt="" /><select aria-label="Kategori perlengkapan"><option value="">Semua kategori</option>{kategori.map((item) => <option key={item.category_id} value={item.category_id}>{item.nama}</option>)}</select></span></label><button className="landing-button" type="submit">Cari Ketersediaan</button></form>
    <section className="landing-section landing-benefits"><SectionHeading label="KENAPA KAMI" title="Camping lebih tenang, persiapan lebih ringan." text="Semua kebutuhan petualanganmu, kami siapkan dengan standar yang jelas." /><div className="landing-grid landing-grid-four">{KEUNGGULAN.map(([title, text, icon]) => <article className="landing-card" key={title}><span className="landing-icon"><img src={icon} alt="" /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="landing-section landing-categories"><SectionHeading label="PILIH SESUAI KEBUTUHAN" title="Jelajahi kategori perlengkapan" link="Lihat semua kategori →" /><div className="landing-grid landing-grid-four">{KATEGORI.map(([title, filter, icon]) => <Link className="landing-category" to={`/katalog?kategori=${encodeURIComponent(filter)}`} key={title}><span className="landing-category-icon"><img src={icon} alt="" /></span><span><b>{title}</b><small>{kategori.find((item) => item.nama === filter)?.jumlah_tersedia || '—'} unit tersedia</small><strong>Lihat kategori →</strong></span></Link>)}</div></section>
    <section className="landing-section landing-packages"><SectionHeading label="PAKET PILIHAN" title="Paket camping untuk setiap cerita." text="Pilih paket praktis atau susun kebutuhanmu sendiri." link="Lihat semua paket →" />{galat && <p className="pesan-galat">Gagal memuat paket: {galat}</p>}{memuat && <p role="status">Memuat paket…</p>}<div className="landing-grid landing-grid-three">{paket.slice(0, 3).map((item) => <article className="landing-product" key={item.bundle_id}><div className="landing-product-art"><div className="landing-product-tent" /></div><small>PAKET CAMPING</small><h3>{item.nama}</h3><p>{item.deskripsi}</p><strong>{rupiah(item.harga_bundle)} <small>/ hari</small></strong><span className="landing-stock"><img src={availableDot} alt="" /> Tersedia</span><Link to={`/katalog?bundle=${item.bundle_id}`} className="landing-button">Sewa paket</Link></article>)}</div></section>
    <section className="landing-section landing-steps" id="cara-sewa"><SectionHeading label="CARA SEWA" title="Empat langkah menuju petualangan." text="Dari memilih alat hingga mengembalikannya, semua dibuat sederhana." /><div className="landing-grid landing-grid-four">{LANGKAH.map(([title, text], index) => <article className="landing-step" key={title}><b>{String(index + 1).padStart(2, '0')}</b><small>LANGKAH {String(index + 1).padStart(2, '0')}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="landing-section landing-location"><SectionHeading label="KUNJUNGI BASECAMP" title="Mulai perjalanan dari tempat yang tepat." /><div className="landing-location-grid"><div className="landing-map"><span>⌖</span></div><article className="landing-location-card"><small>LOKASI PENGAMBILAN &amp; PENGEMBALIAN</small><h3>Basecamp Rental Outdoor Pusat</h3><p>Jl. Rimba No. 42, Sleman, DI Yogyakarta</p><small>Setiap hari • 08:00 - 21:00 WIB</small><a className="landing-button landing-button-light" href="https://maps.google.com/?q=Sleman" target="_blank" rel="noreferrer">Petunjuk Arah</a></article></div></section>
  </div>;
}

function SectionHeading({ label, title, text, link }) { return <div className="landing-heading"><div><p className="landing-eyebrow">{label}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{link && <Link to="/katalog">{link}</Link>}</div>; }
