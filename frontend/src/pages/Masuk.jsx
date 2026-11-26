import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, BERANDA_PERAN } from '../context/AuthContext';
import KerangkaAuth, { Bidang, BidangSandi } from '../components/KerangkaAuth';

/** Halaman masuk — REQ-4.1.3. */
export default function Masuk() {
  const { masuk } = useAuth();
  const navigate = useNavigate();
  const lokasi = useLocation();

  const [formulir, setFormulir] = useState({ email: '', password: '' });
  const [galat, setGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);
    setMengirim(true);

    try {
      const pengguna = await masuk(formulir);
      // Kembali ke halaman yang tadinya dituju, atau ke beranda sesuai peran.
      const tujuan = lokasi.state?.dari || BERANDA_PERAN[pengguna.role] || '/';
      navigate(tujuan, { replace: true });
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <KerangkaAuth
      judul={<>Temukan alam,<br />rasakan jeda.</>}
      aksen="Perjalanan baru dimulai di sini."
      deskripsi="Masuk untuk mengelola penyewaan dan menyiapkan perlengkapan perjalananmu."
    >
      <h1>Selamat datang kembali</h1>
      <p className="auth-sub">Masuk untuk melanjutkan petualanganmu.</p>

      <form onSubmit={kirim} className="auth-form">
        <Bidang label="Email">
          <input
            className="auth-input"
            type="email"
            name="email"
            spellCheck={false}
            value={formulir.email}
            onChange={(e) => setFormulir({ ...formulir, email: e.target.value })}
            autoComplete="email"
            placeholder="nama@email.com"
            required
          />
        </Bidang>

        <BidangSandi
          label="Kata sandi"
          value={formulir.password}
          onChange={(e) => setFormulir({ ...formulir, password: e.target.value })}
          autoComplete="current-password"
        />

        <div className="auth-lupa">
          <Link to="/lupa-kata-sandi">Lupa kata sandi?</Link>
        </div>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="submit" className="auth-tombol" disabled={mengirim}>
          {mengirim ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="auth-ganti">
        Belum punya akun? <Link to="/daftar">Daftar</Link>
      </p>
    </KerangkaAuth>
  );
}
