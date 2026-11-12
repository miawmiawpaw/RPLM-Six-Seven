import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, BERANDA_PERAN } from '../context/AuthContext';

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
    <section className="halaman halaman-sempit">
      <h1>Masuk</h1>

      <form onSubmit={kirim} className="formulir">
        <label>
          Email
          <input
            type="email"
            value={formulir.email}
            onChange={(e) => setFormulir({ ...formulir, email: e.target.value })}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Kata sandi
          <input
            type="password"
            value={formulir.password}
            onChange={(e) => setFormulir({ ...formulir, password: e.target.value })}
            autoComplete="current-password"
            required
          />
        </label>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="submit" className="tombol-utama" disabled={mengirim}>
          {mengirim ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="tautan-bantu">
        <Link to="/lupa-kata-sandi">Lupa kata sandi?</Link>
      </p>
      <p className="tautan-bantu">
        Belum punya akun? <Link to="/daftar">Daftar di sini</Link>
      </p>
    </section>
  );
}
