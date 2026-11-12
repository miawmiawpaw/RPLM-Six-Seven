import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { tanggalJam, labelStatus } from '../utils/format';

/**
 * Profil pengguna — REQ-4.1.6.
 *
 * Inilah sumber data penyewa yang dipakai saat checkout: pelanggan mengisi sekali di
 * sini, lalu tidak diminta mengetik ulang. Kolom alamat dan nomor telepon karena itu
 * dibuat cukup lengkap sejak awal.
 */
export default function Profil() {
  const { pengguna, perbaruiProfil } = useAuth();

  const [formulir, setFormulir] = useState({
    nama: '',
    nomor_telepon: '',
    alamat: '',
    nomor_identitas: '',
  });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Ambil profil terbaru dari server, bukan hanya dari localStorage — data di
  // penyimpanan lokal bisa tertinggal bila profil diubah dari perangkat lain.
  useEffect(() => {
    let dibatalkan = false;

    api.auth
      .saya()
      .then((hasil) => {
        if (dibatalkan) return;
        const p = hasil.data.pengguna;
        setFormulir({
          nama: p.nama || '',
          nomor_telepon: p.nomor_telepon || '',
          alamat: p.alamat || '',
          nomor_identitas: p.nomor_identitas || '',
        });
      })
      .catch((err) => {
        if (!dibatalkan) setGalat(err.message);
      })
      .finally(() => {
        if (!dibatalkan) setMemuat(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, []);

  async function simpan(e) {
    e.preventDefault();
    setGalat(null);
    setPesan(null);
    setMenyimpan(true);

    try {
      await perbaruiProfil(formulir);
      setPesan({ jenis: 'sukses', teks: 'Profil berhasil diperbarui.' });
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) return <section className="halaman"><p role="status">Memuat profil…</p></section>;

  return (
    <section className="halaman halaman-sempit">
      <h1>Profil Saya</h1>

      <section className="blok">
        <h2>Informasi akun</h2>
        <dl className="daftar-data">
          <dt>Email</dt>
          <dd>{pengguna?.email}</dd>
          <dt>Peran</dt>
          <dd>{pengguna?.role}</dd>
          <dt>Status email</dt>
          <dd>
            {pengguna?.email_terverifikasi ? (
              <span className="status-tersedia">Terverifikasi</span>
            ) : (
              <span className="status-habis">Belum terverifikasi</span>
            )}
          </dd>
        </dl>
        {/* Email tidak dapat diubah sendiri: email adalah identitas login dan
            sasaran pemulihan kata sandi. Perubahan harus lewat petugas. */}
        <p className="catatan-kecil">
          Email dan peran tidak dapat diubah sendiri. Hubungi petugas bila perlu diubah.
        </p>
      </section>

      <form onSubmit={simpan} className="formulir">
        <h2>Data penyewa</h2>
        <p className="catatan-kecil">
          Data ini otomatis dipakai saat Anda checkout dan saat serah-terima alat.
        </p>

        <label>
          Nama lengkap
          <input
            type="text"
            value={formulir.nama}
            onChange={(e) => setFormulir({ ...formulir, nama: e.target.value })}
            minLength={2}
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
            required
          />
        </label>

        <label>
          Nomor identitas (KTP/KTM)
          <input
            type="text"
            value={formulir.nomor_identitas}
            onChange={(e) => setFormulir({ ...formulir, nomor_identitas: e.target.value })}
            placeholder="Opsional — ditunjukkan saat pengambilan alat"
          />
        </label>

        <label>
          Alamat
          <textarea
            rows={3}
            value={formulir.alamat}
            onChange={(e) => setFormulir({ ...formulir, alamat: e.target.value })}
            placeholder="Alamat tempat tinggal saat ini"
          />
        </label>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}
        {pesan && (
          <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
            {pesan.teks}
          </p>
        )}

        <button type="submit" className="tombol-utama" disabled={menyimpan}>
          {menyimpan ? 'Menyimpan…' : 'Simpan perubahan'}
        </button>
      </form>

      <section className="blok">
        <h2>Aktivitas terakhir</h2>
        {pengguna?.aktivitas_terakhir ? (
          <p>
            {labelStatus(pengguna.aktivitas_terakhir.status)} —{' '}
            {tanggalJam(pengguna.aktivitas_terakhir.waktu)}
          </p>
        ) : (
          <p className="pesan-kosong">Belum ada aktivitas pesanan.</p>
        )}
        <Link to="/pesanan-saya">Lihat semua pesanan</Link>
      </section>
    </section>
  );
}
