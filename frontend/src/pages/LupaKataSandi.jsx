import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

/**
 * Lupa kata sandi — REQ-4.1.4.
 *
 * Backend selalu membalas sukses, baik email terdaftar maupun tidak, agar tidak
 * membocorkan email mana yang ada di sistem. Antarmuka mengikuti sikap yang sama.
 */
export default function LupaKataSandi() {
  const [email, setEmail] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const [token, setToken] = useState(null);
  const [galat, setGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);
    setMengirim(true);

    try {
      const hasil = await api.auth.lupaKataSandi(email);
      setTerkirim(true);
      // Token hanya ada pada respons pengembangan; pada produksi ia dikirim via email.
      if (hasil.data?.tokenReset) setToken(hasil.data.tokenReset);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (terkirim) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Periksa email Anda</h1>
        <p>
          Bila <strong>{email}</strong> terdaftar, kami telah mengirim tautan untuk mengatur ulang
          kata sandi. Tautan berlaku 30 menit.
        </p>

        {token && (
          <div className="kotak-peringatan">
            <p>
              <strong>Catatan pengembangan:</strong> pengiriman email belum dikonfigurasi, sehingga
              token ditampilkan di sini.
            </p>
            <code className="token-panjang">{token}</code>
          </div>
        )}

        <Link to="/atur-ulang-kata-sandi" className="tombol-utama">
          Atur ulang kata sandi
        </Link>
        <p className="tautan-bantu">
          <Link to="/masuk">Kembali ke halaman masuk</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="halaman halaman-sempit">
      <h1>Lupa kata sandi</h1>
      <p>Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang kata sandi.</p>

      <form onSubmit={kirim} className="formulir">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="submit" className="tombol-utama" disabled={mengirim}>
          {mengirim ? 'Mengirim…' : 'Kirim tautan'}
        </button>
      </form>

      <p className="tautan-bantu">
        <Link to="/masuk">Kembali ke halaman masuk</Link>
      </p>
    </section>
  );
}
