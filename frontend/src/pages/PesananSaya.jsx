import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { rupiah, tanggal, labelStatus, kelasStatus, durasiHari } from '../utils/format';

/**
 * Daftar pesanan pelanggan — REQ-4.2.10.
 *
 * Penyaringan status disimpan di URL agar hasil dapat dibuka kembali / dibagikan.
 */
export default function PesananSaya() {
  const [parameter, setParameter] = useSearchParams();
  const statusSaring = parameter.get('status') || '';

  const [pesanan, setPesanan] = useState([]);
  const [meta, setMeta] = useState({ halaman: 1, total: 0, batas: 10 });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    let dibatalkan = false;
    setMemuat(true);
    setGalat(null);

    api.pesanan
      .riwayat({ status: statusSaring, halaman: parameter.get('halaman') || 1 })
      .then((hasil) => {
        if (dibatalkan) return;
        setPesanan(hasil.data);
        setMeta(hasil.meta || { halaman: 1, total: hasil.data.length, batas: hasil.data.length });
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
  }, [statusSaring, parameter]);

  function ubahStatus(nilai) {
    const berikutnya = new URLSearchParams(parameter);
    if (nilai) berikutnya.set('status', nilai);
    else berikutnya.delete('status');
    berikutnya.delete('halaman');
    setParameter(berikutnya);
  }

  const halamanSekarang = Number(meta.halaman) || 1;
  const batasHalaman = Number(meta.batas) || 10;
  const jumlahHalaman = Math.max(1, Math.ceil((Number(meta.total) || 0) / batasHalaman));

  const DAFTAR_STATUS = [
    'MENUNGGU_PEMBAYARAN',
    'DIBAYAR',
    'DISIAPKAN',
    'SEDANG_DISEWA',
    'DIKEMBALIKAN',
    'SELESAI',
    'GAGAL_KEDALUWARSA',
    'DIBATALKAN',
  ];

  return (
    <section className="halaman">
      <h1>Pesanan Saya</h1>

      <div className="baris-filter">
        <label>
          Status
          <select value={statusSaring} onChange={(e) => ubahStatus(e.target.value)}>
            <option value="">Semua status</option>
            {DAFTAR_STATUS.map((s) => (
              <option key={s} value={s}>
                {labelStatus(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {memuat && <p role="status">Memuat pesanan…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {!memuat && !galat && pesanan.length === 0 && (
        <p className="pesan-kosong">
          Belum ada pesanan{statusSaring ? ' dengan status ini' : ''}.{' '}
          <Link to="/katalog">Mulai dari katalog</Link>.
        </p>
      )}

      {pesanan.length > 0 && (
        <ul className="daftar-pesanan">
          {pesanan.map((p) => (
            <li key={p.order_id} className="kartu-pesanan">
              <div className="kepala-pesanan">
                <div>
                  <h2>
                    <Link to={`/pesanan/${p.order_id}`}>Pesanan #{p.kode_pesanan || p.order_id}</Link>
                  </h2>
                </div>
                <span className={kelasStatus(p.status)}>{labelStatus(p.status)}</span>
              </div>

              <dl className="daftar-data ringkas">
                <dt>Jadwal</dt>
                <dd>
                  {tanggal(p.tanggal_mulai)} — {tanggal(p.tanggal_selesai)} (
                  {durasiHari(p.tanggal_mulai, p.tanggal_selesai)} hari)
                </dd>
                <dt>Total</dt>
                <dd className="total-besar">{rupiah(p.total_akhir)}</dd>
              </dl>

              {p.status === 'MENUNGGU_PEMBAYARAN' && (
                <p className="catatan-penting">
                  Segera selesaikan pembayaran sebelum batas waktu, atau pesanan otomatis
                  dibatalkan.
                </p>
              )}

              <Link to={`/pesanan/${p.order_id}`} className="tombol-sekunder">
                Lihat detail
              </Link>
            </li>
          ))}
        </ul>
      )}

      {jumlahHalaman > 1 && (
        <nav className="penomoran" aria-label="Navigasi halaman">
          <button
            type="button"
            disabled={halamanSekarang <= 1}
            onClick={() => {
              const berikutnya = new URLSearchParams(parameter);
              berikutnya.set('halaman', String(halamanSekarang - 1));
              setParameter(berikutnya);
            }}
          >
            Sebelumnya
          </button>
          <span>
            Halaman {halamanSekarang} dari {jumlahHalaman}
          </span>
          <button
            type="button"
            disabled={halamanSekarang >= jumlahHalaman}
            onClick={() => {
              const berikutnya = new URLSearchParams(parameter);
              berikutnya.set('halaman', String(halamanSekarang + 1));
              setParameter(berikutnya);
            }}
          >
            Berikutnya
          </button>
        </nav>
      )}
    </section>
  );
}
