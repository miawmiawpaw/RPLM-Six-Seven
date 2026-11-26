import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KerangkaAuth, { Bidang, BidangSandi } from '../components/KerangkaAuth';

/**
 * Halaman daftar — REQ-4.1.1, REQ-4.1.2.
 *
 * Setelah mendaftar, akun BELUM AKTIF sampai pengguna membuka tautan verifikasi di
 * emailnya (halaman /verifikasi-email). Token tidak pernah tampil di layar.
 */

const PANEL = {
  judul: (
    <>
      Satu akun,
      <br />
      banyak cerita.
    </>
  ),
  aksen: 'Petualangan menantimu.',
  deskripsi: 'Buat akun untuk menyimpan pesanan, mengatur jadwal sewa, dan merencanakan petualangan berikutnya.',
};

/** "0812 3456 7890" / "+62812…" / "62812…" → "+628123456789" (format yang diterima backend). */
function normalisasiTelepon(masukan) {
  const digit = masukan.replace(/\D/g, '').replace(/^(62|0)/, '');
  return `+62${digit}`;
}

export default function Daftar() {
  const { daftar } = useAuth();

  const [formulir, setFormulir] = useState({
    nama: '',
    email: '',
    telepon: '',
    password: '',
    ulangiPassword: '',
  });
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);
  const [emailTujuan, setEmailTujuan] = useState(null);

  const ubah = (kunci) => (e) => setFormulir({ ...formulir, [kunci]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);

    if (formulir.password !== formulir.ulangiPassword) {
      setGalat('Kata sandi dan ulangannya tidak sama.');
      return;
    }

    setMengirim(true);
    try {
      await daftar({
        nama: formulir.nama,
        email: formulir.email,
        nomor_telepon: normalisasiTelepon(formulir.telepon),
        password: formulir.password,
      });
      setEmailTujuan(formulir.email);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  // ─── Tahap 2: tautan verifikasi sudah dikirim ke email ────────────────────
  if (emailTujuan) {
    return (
      <KerangkaAuth {...PANEL}>
        <h1>Periksa email Anda</h1>
        <p className="auth-sub">
          Akun dibuat. Kami mengirim tautan verifikasi ke <strong>{emailTujuan}</strong>. Buka tautan itu
          (berlaku 24 jam) untuk mengaktifkan akun.
        </p>
        <Link to="/masuk" className="auth-tombol">
          Ke halaman masuk
        </Link>
      </KerangkaAuth>
    );
  }

  // ─── Tahap 1: formulir ────────────────────────────────────────────────────
  return (
    <KerangkaAuth {...PANEL}>
      <h1>Buat akun baru</h1>
      <p className="auth-sub">Bergabung dan mulai rencanakan petualanganmu.</p>

      <form onSubmit={kirim} className="auth-form">
        <Bidang label="Nama lengkap">
          <input
            className="auth-input"
            type="text"
            name="nama"
            value={formulir.nama}
            onChange={ubah('nama')}
            autoComplete="name"
            placeholder="Mis. Siti Rahma…"
            minLength={2}
            required
          />
        </Bidang>

        <Bidang label="Nomor telepon">
          <span className="auth-input auth-input-telepon">
            <b>+62</b>
            <input
              type="tel"
              name="telepon"
              inputMode="tel"
              value={formulir.telepon}
              onChange={ubah('telepon')}
              autoComplete="tel-national"
              placeholder="812 3456 7890"
              pattern="(\+62|62|0)?8[0-9 \-]{7,16}"
              title="Contoh: 812 3456 7890 atau 0812 3456 7890"
              required
            />
          </span>
        </Bidang>

        <Bidang label="Email">
          <input
            className="auth-input"
            type="email"
            name="email"
            spellCheck={false}
            value={formulir.email}
            onChange={ubah('email')}
            autoComplete="email"
            placeholder="nama@email.com"
            required
          />
        </Bidang>

        <BidangSandi
          label="Kata sandi"
          value={formulir.password}
          onChange={ubah('password')}
          autoComplete="new-password"
          minLength={8}
          placeholder="Minimal 8 karakter"
        />

        <BidangSandi
          name="ulangi_password"
          label="Ulangi kata sandi"
          value={formulir.ulangiPassword}
          onChange={ubah('ulangiPassword')}
          autoComplete="new-password"
          minLength={8}
          placeholder="Ulangi kata sandi"
        />

        <label className="auth-setuju">
          <input type="checkbox" name="setuju" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} required />
          <span>Saya menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi.</span>
        </label>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <button type="submit" className="auth-tombol" disabled={mengirim}>
          {mengirim ? 'Memproses…' : 'Daftar'}
        </button>
      </form>

      <p className="auth-ganti">
        Sudah punya akun? <Link to="/masuk">Masuk</Link>
      </p>
    </KerangkaAuth>
  );
}
