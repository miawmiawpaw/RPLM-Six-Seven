import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { rupiah, tanggalJam, labelStatus, kelasStatus } from '../../utils/format';

/**
 * Dasbor admin — REQ-4.6.1.
 *
 * Angka ringkasan diperbarui manual, bukan otomatis. Dasbor yang menyegarkan diri
 * sendiri menyebabkan beban kueri berulang tanpa manfaat — admin biasanya hanya
 * perlu melihat angka saat membuka halaman.
 */
export default function DasborAdmin() {
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  async function muat() {
    setMemuat(true);
    setGalat(null);
    try {
      const hasil = await api.laporan.dasbor();
      setData(hasil.data);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    muat();
  }, []);

  if (memuat) return <section className="halaman"><p role="status">Memuat dasbor…</p></section>;

  if (galat) {
    return (
      <section className="halaman">
        <p className="pesan-galat">{galat}</p>
        <button type="button" className="tombol-sekunder" onClick={muat}>
          Coba lagi
        </button>
      </section>
    );
  }

  return (
    <section className="halaman">
      <div className="kepala-detail">
        <h1>Dasbor</h1>
        <button type="button" className="tombol-sekunder" onClick={muat}>
          Muat ulang
        </button>
      </div>

      <div className="kisi-statistik">
        <KartuStatistik label="Menunggu pembayaran" nilai={data.pesanan_menunggu_pembayaran} tautan="/admin/pesanan?status=MENUNGGU_PEMBAYARAN" />
        <KartuStatistik label="Perlu disiapkan" nilai={data.pesanan_perlu_disiapkan} tautan="/petugas/tugas" />
        <KartuStatistik label="Sedang disewa" nilai={data.pesanan_sedang_disewa} tautan="/admin/pesanan?status=SEDANG_DISEWA" />
        <KartuStatistik label="Terlambat dikembalikan" nilai={data.pesanan_terlambat} tautan="/petugas/tugas" sorot={data.pesanan_terlambat > 0} />
        <KartuStatistik label="Denda belum lunas" nilai={data.denda_belum_lunas} tautan="/admin/denda" sorot={data.denda_belum_lunas > 0} />
        <KartuStatistik label="Stok menipis" nilai={data.stok_menipis} tautan="/admin/inventaris" sorot={data.stok_menipis > 0} />
      </div>

      <section className="blok">
        <h2>Pendapatan bulan ini</h2>
        <p className="total-besar">{rupiah(data.pendapatan_bulan_ini)}</p>
        <p className="catatan-kecil">
          Hanya menghitung pembayaran yang berhasil. Angka dapat berbeda sedikit dari laporan
          pendapatan karena perbedaan waktu tarik data.
        </p>
        <Link to="/admin/laporan">Buka laporan lengkap</Link>
      </section>

      {data.pesanan_terbaru?.length > 0 && (
        <section className="blok">
          <h2>Pesanan terbaru</h2>
          <table className="tabel">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Penyewa</th>
                <th>Status</th>
                <th>Total</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {data.pesanan_terbaru.map((p) => (
                <tr key={p.order_id}>
                  <td>
                    <Link to={`/pesanan/${p.order_id}`}>{p.kode_pesanan || p.order_id}</Link>
                  </td>
                  <td>{p.pelanggan}</td>
                  <td>
                    <span className={kelasStatus(p.status)}>{labelStatus(p.status)}</span>
                  </td>
                  <td>{rupiah(p.total_akhir)}</td>
                  <td>{tanggalJam(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.stok_menipis > 0 && (
        <section className="blok">
          <h2>Perhatian</h2>
          <p className="catatan-penting">
            Ada {data.stok_menipis} alat dengan stok menipis atau tidak tersedia. Periksa{' '}
            <Link to="/admin/inventaris">inventaris</Link> untuk menambah unit atau memperbaiki
            kondisi alat yang rusak.
          </p>
        </section>
      )}
    </section>
  );
}

function KartuStatistik({ label, nilai, tautan, sorot }) {
  return (
    <Link to={tautan} className={sorot ? 'kartu-statistik sorot' : 'kartu-statistik'}>
      <span className="angka-statistik">{nilai ?? 0}</span>
      <span className="label-statistik">{label}</span>
    </Link>
  );
}
