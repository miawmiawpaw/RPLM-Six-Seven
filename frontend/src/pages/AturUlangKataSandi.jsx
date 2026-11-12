import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

/**
 * Atur ulang kata sandi — REQ-4.1.4.
 *
 * Token dapat datang dari kueri URL (tautan email: ?token=...) atau diketik manual
 * bila tautan tidak dapat dibuka.
 */
export default function AturUlangKataSandi() {
  const [parameter] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(parameter.get('token') || '');
  const [password, setPassword] = useState('');
  const [ulangiPassword, setUlangiPassword] = useState('');
  const [galat, setGalat] = useState(null);
  const [berhasil, setBerhasil] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  // Token dari URL dapat berubah bila pengguna membuka tautan lain di tab yang sama.
  useEffect(() => {
    const dariUrl = parameter.get('token');
    if (dariUrl) setToken(dariUrl);
  }, [parameter]);

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);

    if (password !== ulangiPassword) {
      setGalat('Kata sandi dan ulangannya tidak sama.');
      return;
    }
    if (token.trim().length < 10) {
      setGalat('Token tidak valid. Periksa kembali tautan dari email Anda.');
      return;
    }

    setMengirim(true);
    try {
      await api.auth.aturUlangKataSandi({ token: token.trim(), password });
      setBerhasil(true);
      setTimeout(() => navigate('/masuk', { replace: true }), 2500);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (berhasil) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Kata sandi diperbarui</h1>
        <p className="pesan-sukses">
          Kata sandi Anda berhasil diubah. Mengalihkan ke halaman masuk…
        </p>
        <Link to="/masuk" className="tombol-utama">
          Masuk sekarang
        </Link>
      </section>
    );
  }

  return (
    <section className="halaman halaman-sempit">
      <h1>Atur ulang kata sandi</h1>

      <form onSubmit={kirim} className="formulir">
        <label>
          Token dari email
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Tempel token di sini"
            required
          />
        </label>

        <label>
          Kata sandi baru
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small>Minimal 8 karakter.</small>
        </label>

        <label>
          Ulangi kata sandi baru
          <input
            type="password"
            value={ulangiPassword}
            onChange={(e) => setUlangiPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="submit" className="tombol-utama" disabled={mengirim}>
          {mengirim ? 'Menyimpan…' : 'Simpan kata sandi baru'}
        </button>
      </form>

      <p className="tautan-bantu">
        <Link to="/masuk">Kembali ke halaman masuk</Link>
      </p>
    </section>
  );
}
