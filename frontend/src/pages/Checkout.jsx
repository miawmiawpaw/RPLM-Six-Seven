import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeranjang, keranjangKeBarisPesanan } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { rupiah, durasiHari } from '../utils/format';

/**
 * Checkout — REQ-4.2.8, REQ-4.2.9.
 *
 * Prinsip desain yang dipegang di sini: pengguna TIDAK diminta mengetik ulang data
 * yang sudah tersimpan di profil. Nama dan nomor telepon hanya ditampilkan sebagai
 * konfirmasi. Bila perlu diubah, pengguna diarahkan ke halaman profil — bukan
 * disajikan formulir kedua yang dapat berbeda dari data profil.
 *
 * Penguncian stok dan penetapan status MENUNGGU_PEMBAYARAN terjadi di dalam
 * transaksi backend (`order.service.js`, ADR-10). Frontend tidak menebak hasilnya.
 */
export default function Checkout() {
  const { baris, tanggalMulai, tanggalSelesai, perkiraanTotal, kosongkan } = useKeranjang();
  const { pengguna, masukAkun } = useAuth();
  const navigate = useNavigate();

  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState(null);
  const [detailGalat, setDetailGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);

  const hari = durasiHari(tanggalMulai, tanggalSelesai);

  // Pengguna dapat mengisi keranjang tanpa masuk; pada tahap ini ia harus masuk.
  if (!masukAkun) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Masuk untuk melanjutkan</h1>
        <p>Keranjang Anda tersimpan. Masuk dulu untuk menyelesaikan pesanan.</p>
        <Link to="/masuk" className="tombol-utama" state={{ dari: '/checkout' }}>
          Masuk
        </Link>
        <p className="tautan-bantu">
          Belum punya akun? <Link to="/daftar">Daftar</Link>
        </p>
      </section>
    );
  }

  if (baris.length === 0) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Keranjang kosong</h1>
        <p>Tidak ada yang dapat dipesan.</p>
        <Link to="/katalog" className="tombol-utama">
          Lihat katalog
        </Link>
      </section>
    );
  }

  if (!tanggalMulai || !tanggalSelesai) {
    return (
      <section className="halaman halaman-sempit">
        <h1>Tanggal belum dipilih</h1>
        <p>Tentukan tanggal sewa di keranjang sebelum melanjutkan.</p>
        <Link to="/keranjang" className="tombol-utama">
          Kembali ke keranjang
        </Link>
      </section>
    );
  }

  async function buatPesanan() {
    setGalat(null);
    setDetailGalat(null);
    setMengirim(true);

    try {
      const hasil = await api.pesanan.buat({
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        catatan: catatan || undefined,
        items: keranjangKeBarisPesanan(baris),
      });

      // Keranjang dikosongkan hanya setelah server mengonfirmasi stok terkunci.
      kosongkan();
      navigate(`/pesanan/${hasil.data.pesanan.order_id}`, { replace: true });
    } catch (err) {
      setGalat(err.message);
      // Backend mengirim rincian per baris saat stok tidak cukup (code STOK_TIDAK_CUKUP).
      if (Array.isArray(err.details)) setDetailGalat(err.details);
      else if (err.details) setDetailGalat([String(err.details)]);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <section className="halaman">
      <h1>Konfirmasi Pesanan</h1>

      <div className="tata-checkout">
        <div className="kolom-utama">
          <section className="blok">
            <h2>Data penyewa</h2>
            <dl className="daftar-data">
              <dt>Nama</dt>
              <dd>{pengguna?.nama}</dd>
              <dt>Email</dt>
              <dd>{pengguna?.email}</dd>
              <dt>Nomor telepon</dt>
              <dd>{pengguna?.nomor_telepon || <em>Belum diisi</em>}</dd>
            </dl>
            <p className="catatan-kecil">
              Data ini diambil dari profil Anda dan dipakai untuk serah-terima alat.{' '}
              <Link to="/profil">Ubah di halaman profil</Link> bila perlu.
            </p>
          </section>

          <section className="blok">
            <h2>Jadwal sewa</h2>
            <p>
              {tanggalMulai} sampai {tanggalSelesai} — <strong>{hari} hari</strong>
            </p>
          </section>

          <section className="blok">
            <h2>Rincian alat</h2>
            <table className="tabel">
              <thead>
                <tr>
                  <th>Alat</th>
                  <th>Jumlah</th>
                  <th>Tarif / hari</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={`${b.tipe}:${b.id}`}>
                    <td>
                      {b.nama} {b.tipe === 'BUNDLE' && <span className="catatan-kecil">(paket)</span>}
                    </td>
                    <td>{b.kuantitas}</td>
                    <td>{rupiah(b.harga)}</td>
                    <td>{rupiah(b.harga * b.kuantitas * hari)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="blok">
            <h2>Catatan tambahan</h2>
            <label htmlFor="catatan" className="catatan-kecil">
              Opsional — misalnya jam pengambilan atau permintaan khusus.
            </label>
            <textarea
              id="catatan"
              rows={3}
              maxLength={500}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: saya ambil Sabtu pagi sekitar pukul 8."
            />
          </section>
        </div>

        <aside className="kolom-ringkasan">
          <h2>Ringkasan</h2>
          <dl className="daftar-data">
            <dt>Jumlah baris</dt>
            <dd>{baris.length}</dd>
            <dt>Durasi</dt>
            <dd>{hari} hari</dd>
            <dt>Perkiraan total</dt>
            <dd className="total-besar">{rupiah(perkiraanTotal * hari)}</dd>
          </dl>

          <p className="catatan-kecil">
            Total akhir dihitung server saat pesanan dibuat. Setelah pesanan terbentuk, Anda punya
            waktu terbatas untuk membayar sebelum pesanan kedaluwarsa.
          </p>

          {galat && (
            <div className="pesan-galat" role="alert">
              <p>{galat}</p>
              {detailGalat && (
                <ul>
                  {detailGalat.map((d, i) => (
                    <li key={i}>{typeof d === 'string' ? d : d.pesan || JSON.stringify(d)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button type="button" className="tombol-utama lebar-penuh" onClick={buatPesanan} disabled={mengirim}>
            {mengirim ? 'Memproses…' : 'Buat pesanan'}
          </button>

          <Link to="/keranjang" className="tautan-bantu">
            Kembali ke keranjang
          </Link>
        </aside>
      </div>
    </section>
  );
}
