import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/Rental Camping/Footer Logo.svg';

/**
 * Kerangka halaman masuk & daftar — Figma "Login / Register — Desktop".
 * Panel brand di kiri (disembunyikan pada layar sempit), kartu formulir di kanan.
 */
export default function KerangkaAuth({ judul, aksen, deskripsi, children }) {
  return (
    <div className="auth">
      <aside className="auth-panel">
        <Link to="/" className="auth-merek">
          <img src={logo} alt="" width="40" height="40" />
          <span translate="no">
            <strong>RENTAL CAMPING</strong>
            <small>OUTDOOR EQUIPMENT RENTAL</small>
          </span>
        </Link>
        <div className="auth-panel-teks">
          <p className="auth-eyebrow">A LITTLE CLOSER TO THE OUTDOORS</p>
          <p className="auth-judul">{judul}</p>
          <p className="auth-aksen">{aksen}</p>
          <p className="auth-deskripsi">{deskripsi}</p>
        </div>
        <IlustrasiMeadow />
        <p className="auth-catatan">PERLENGKAPAN OUTDOOR UNTUK SETIAP PETUALANGAN</p>
      </aside>

      <main className="auth-konten">
        <div className="auth-kolom">
          <Link to="/" className="auth-kembali">
            <span aria-hidden="true">←</span> Kembali ke beranda
          </Link>
          <section className="auth-kartu">{children}</section>
          <p className="auth-hak">© 2026 Rental Camping Indonesia</p>
        </div>
      </main>
    </div>
  );
}

/** Bidang formulir berlabel (Figma "Field / …"). */
export function Bidang({ label, children }) {
  return (
    <label className="auth-bidang">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Bidang kata sandi dengan tombol tampil/sembunyikan. */
export function BidangSandi({ label, name = 'password', value, onChange, autoComplete, minLength, placeholder = 'Masukkan kata sandi' }) {
  const [tampil, setTampil] = useState(false);
  const id = useId();
  return (
    <div className="auth-bidang">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input auth-input-sandi">
        <input
          id={id}
          name={name}
          type={tampil ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          className="auth-mata"
          onClick={() => setTampil((v) => !v)}
          aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={tampil}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1.67 8s2.13-3.67 6.33-3.67S14.33 8 14.33 8s-2.13 3.67-6.33 3.67S1.67 8 1.67 8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="1.67" stroke="currentColor" strokeWidth="1.2" />
            {tampil && <path d="M2.5 13.5 13.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Ilustrasi padang rumput panel kiri (Figma "Meadow Artwork", 520×500). */
function IlustrasiMeadow() {
  return (
    <svg className="auth-ilustrasi" viewBox="0 0 520 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="520" height="500" fill="#faf8f2" />
      <circle cx="410" cy="95" r="34" fill="#eadcc2" />
      <circle cx="398" cy="83" r="8" fill="#faf8f2" opacity=".55" />
      <path d="M0 215C60 170 120 150 200 165C280 180 330 160 400 135C450 118 490 130 520 146V500H0Z" fill="#b7c2ab" />
      <path d="M0 270C70 230 150 235 230 260C310 285 380 245 440 235C480 228 505 232 520 238V500H0Z" fill="#96a962" />
      <path d="M0 360C60 325 130 320 200 345C270 370 340 365 400 335C450 312 490 318 520 330V500H0Z" fill="#556b33" />
      <path d="M0 455C80 425 170 425 250 445C330 465 420 435 520 430V500H0Z" fill="#253019" />
      <path d="M95 345 164 252 233 345Z" fill="#253019" />
      <path d="M164 252 233 345H162Z" fill="#415325" />
      <path d="M156 345V291L190 345Z" fill="#e9ece3" />
      <path d="M95 345 164 252 233 345" stroke="#e9ece3" strokeWidth="3" strokeLinejoin="round" fill="none" />
      <g stroke="#415325" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M320 300V249M292 288 320 249 347 288M303 273H337" />
      </g>
      <g stroke="#415325" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M442 356V336M430 346 442 336 454 346" />
      </g>
      <g stroke="#e9ece3" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".8">
        <path d="M45 407V389M34 397 45 389 56 397" />
      </g>
    </svg>
  );
}
