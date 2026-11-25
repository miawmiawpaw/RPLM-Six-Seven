import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

/** Tujuan tautan di email verifikasi: /verifikasi-email?token=… — REQ-4.1.2. */
export default function VerifikasiEmail() {
  const [parameter] = useSearchParams();
  const token = parameter.get('token');
  const [status, setStatus] = useState(token ? 'memuat' : 'galat');
  const [pesan, setPesan] = useState(token ? '' : 'Tautan verifikasi tidak lengkap.');
  const sudahDikirim = useRef(false);

  useEffect(() => {
    if (!token || sudahDikirim.current) return;
    sudahDikirim.current = true; // StrictMode menjalankan efek dua kali; token cukup diverifikasi sekali.
    api.auth
      .verifikasiEmail(token)
      .then(() => setStatus('sukses'))
      .catch((err) => { setStatus('galat'); setPesan(err.message); });
  }, [token]);

  return (
    <section className="halaman halaman-sempit">
      <h1>Verifikasi email</h1>
      {status === 'memuat' && <p role="status">Memverifikasi…</p>}
      {status === 'sukses' && <p className="pesan-sukses">Email berhasil diverifikasi. Akun Anda sudah dapat dipakai.</p>}
      {status === 'galat' && <p className="pesan-galat" role="alert">{pesan}</p>}
      <Link to="/masuk" className="tombol-utama">Masuk</Link>
    </section>
  );
}
