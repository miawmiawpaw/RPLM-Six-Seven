import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

/**
 * Halaman daftar — REQ-4.1.1, REQ-4.1.2.
 *
 * Setelah mendaftar, akun BELUM AKTIF sampai email diverifikasi. Alur verifikasi
 * idealnya lewat tautan di email, tetapi pengiriman email belum dikonfigurasi;
 * karena itu token verifikasi ditampilkan langsung agar alur dapat diuji. Ini
 * catatan pengembangan, bukan perilaku produksi.
 */
export default function Daftar() {
  const { daftar } = useAuth();
  const navigate = useNavigate();

  const [formulir, setFormulir] = useState({
    nama: '',
    email: '',
    nomor_telepon: '',
    password: '',
    ulangiPassword: '',
  });
  const [galat, setGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);
  const [tokenVerifikasi, setTokenVerifikasi] = useState(null);
  const [verifikasiSelesai, setVerifikasiSelesai] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);

    if (formulir.password !== formulir.ulangiPassword) {
      setGalat('Kata sandi dan ulangannya tidak sama.');
      return;
    }

    setMengirim(true);
    try {
      const hasil = await daftar({
        nama: formulir.nama,
        email: formulir.email,
        nomor_telepon: formulir.nomor_telepon,
        password: formulir.password,
      });
      setTokenVerifikasi(hasil.tokenVerifikasi);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  async function verifikasiSekarang() {
    setGalat(null);
    try {
      await api.auth.verifikasiEmail(tokenVerifikasi);
      setVerifikasiSelesai(true);
    } catch (err) {
      setGalat(err.message);
    }
  }

  // ─── Tahap 3: selesai ─────────────────────────────────────────────────────
  if (verifikasiSelesai) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Akun aktif</h1>
        <p className="pesan-sukses">Email berhasil diverifikasi. Akun Anda sudah dapat dipakai.</p>
        <button type="button" className="tombol-utama" onClick={() => navigate('/masuk')}>
          Masuk sekarang
        </button>
      </section>
    );
  }

  // ─── Tahap 2: verifikasi email ────────────────────────────────────────────
  if (tokenVerifikasi) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Verifikasi email</h1>
        <p>
          Akun dibuat, tetapi belum aktif. Klik tombol di bawah untuk memverifikasi email Anda.
        </p>

        <div className="kotak-peringatan">
          <p>
            <strong>Catatan pengembangan:</strong> pengiriman email belum dikonfigurasi, sehingga
            token verifikasi ditampilkan di sini. Pada lingkungan produksi, token ini dikirim ke
            email Anda dan tidak boleh ditampilkan di layar.
          </p>
          <code className="token-panjang">{tokenVerifikasi}</code>
        </div>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="button" className="tombol-utama" onClick={verifikasiSekarang}>
          Verifikasi sekarang
        </button>
      </section>
    );
  }

  // ─── Tahap 1: formulir ────────────────────────────────────────────────────
  return (
    <section className="halaman halaman-sempit">
      <h1>Daftar</h1>

      <form onSubmit={kirim} className="formulir">
        <label>
          Nama lengkap
          <input
            type="text"
            value={formulir.nama}
            onChange={(e) => setFormulir({ ...formulir, nama: e.target.value })}
            autoComplete="name"
            minLength={2}
            required
          />
        </label>

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
          Nomor telepon
          <input
            type="tel"
            value={formulir.nomor_telepon}
            onChange={(e) => setFormulir({ ...formulir, nomor_telepon: e.target.value })}
            placeholder="08123456789"
            pattern="(\+62|62|0)8[0-9]{7,13}"
            title="Format: 08xx atau +628xx"
            autoComplete="tel"
            required
          />
        </label>

        <label>
          Kata sandi
          <input
            type="password"
            value={formulir.password}
            onChange={(e) => setFormulir({ ...formulir, password: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small>Minimal 8 karakter.</small>
        </label>

        <label>
          Ulangi kata sandi
          <input
            type="password"
            value={formulir.ulangiPassword}
            onChange={(e) => setFormulir({ ...formulir, ulangiPassword: e.target.value })}
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
          {mengirim ? 'Memproses…' : 'Daftar'}
        </button>
      </form>

      <p className="tautan-bantu">
        Sudah punya akun? <Link to="/masuk">Masuk</Link>
      </p>
    </section>
  );
}
