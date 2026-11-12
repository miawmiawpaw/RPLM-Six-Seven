import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { rupiah, tanggal, tanggalJam, labelStatus, kelasStatus, durasiHari } from '../../utils/format';

/** Status pesanan sesuai SRS §2.8 — dipakai untuk penyaringan. */
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

/**
 * Manajemen pesanan admin — REQ-4.6.2.
 *
 * Aksi yang tersedia sengaja dibatasi pada yang benar-benar dimiliki backend:
 * menandai siap diambil (transisi DIBAYAR → DISIAPKAN) dan melihat detail. Aksi lain
 * dilakukan lewat alur khusus — penyerahan dan pengembalian lewat formulir checklist
 * petugas, pembatalan kedaluwarsa lewat job terjadwal.
 */
export default function PesananAdmin() {
  const [parameter, setParameter] = useSearchParams();
  const statusSaring = parameter.get('status') || '';
  const cari = parameter.get('q') || '';

  const [pesanan, setPesanan] = useState([]);
  const [meta, setMeta] = useState({ halaman: 1, total: 0, batas: 20 });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [sedangProses, setSedangProses] = useState(null);

  const [inputCari, setInputCari] = useState(cari);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const hasil = await api.laporan.pesanan({
        status: statusSaring,
        q: cari,
        halaman: parameter.get('halaman') || 1,
      });
      setPesanan(hasil.data);
      setMeta(hasil.meta || { halaman: 1, total: hasil.data.length, batas: hasil.data.length || 20 });
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, [statusSaring, cari, parameter]);

  useEffect(() => {
    muat();
  }, [muat]);

  function ubahParameter(perubahan) {
    const berikutnya = new URLSearchParams(parameter);
    Object.entries(perubahan).forEach(([kunci, nilai]) => {
      if (nilai) berikutnya.set(kunci, nilai);
      else berikutnya.delete(kunci);
    });
    if (!('halaman' in perubahan)) berikutnya.delete('halaman');
    setParameter(berikutnya);
  }

  async function tandaiSiap(orderId) {
    const yakin = window.confirm(
      'Tandai pesanan ini siap diambil? Penyewa akan melihat status berubah menjadi Disiapkan.'
    );
    if (!yakin) return;

    setSedangProses(orderId);
    setPesan(null);
    try {
      await api.pesanan.tandaiSiap(orderId);
      setPesan({ jenis: 'sukses', teks: 'Pesanan ditandai siap diambil.' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    } finally {
      setSedangProses(null);
    }
  }

  const halamanSekarang = Number(meta.halaman) || 1;
  const jumlahHalaman = Math.max(1, Math.ceil(meta.total / meta.batas));

  return (
    <section className="halaman">
      <div className="kepala-detail">
        <h1>Manajemen Pesanan</h1>
        <button type="button" className="tombol-sekunder" onClick={muat}>
          Muat ulang
        </button>
      </div>

      <div className="baris-filter">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ubahParameter({ q: inputCari });
          }}
          className="baris-cari"
        >
          <label htmlFor="cari-pesanan" className="sr-only">
            Cari pesanan
          </label>
          <input
            id="cari-pesanan"
            type="search"
            value={inputCari}
            onChange={(e) => setInputCari(e.target.value)}
            placeholder="Kode pesanan atau nama penyewa…"
          />
          <button type="submit" className="tombol-sekunder">
            Cari
          </button>
        </form>

        <label>
          Status
          <select value={statusSaring} onChange={(e) => ubahParameter({ status: e.target.value })}>
            <option value="">Semua status</option>
            {DAFTAR_STATUS.map((s) => (
              <option key={s} value={s}>
                {labelStatus(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pesan && (
        <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
          {pesan.teks}
        </p>
      )}

      {memuat && <p role="status">Memuat pesanan…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {!memuat && !galat && pesanan.length === 0 && (
        <p className="pesan-kosong">Tidak ada pesanan yang cocok dengan filter ini.</p>
      )}

      {pesanan.length > 0 && (
        <table className="tabel">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Penyewa</th>
              <th>Jadwal sewa</th>
              <th>Total</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pesanan.map((p) => (
              <tr key={p.order_id}>
                <td>
                  <Link to={`/pesanan/${p.order_id}`}>{p.kode_pesanan || p.order_id}</Link>
                </td>
                <td>
                  {p.pelanggan}
                </td>
                <td>
                  {tanggal(p.tanggal_mulai)} — {tanggal(p.tanggal_selesai)}
                  <span className="catatan-kecil">
                    {' '}
                    ({durasiHari(p.tanggal_mulai, p.tanggal_selesai)} hari)
                  </span>
                </td>
                <td>{rupiah(p.total_akhir)}</td>
                <td>
                  <span className={kelasStatus(p.status)}>{labelStatus(p.status)}</span>
                </td>
                <td>{tanggalJam(p.dibuat_pada)}</td>
                <td className="sel-aksi">
                  {p.status === 'DIBAYAR' && (
                    <button
                      type="button"
                      className="tombol-kecil"
                      disabled={sedangProses === p.order_id}
                      onClick={() => tandaiSiap(p.order_id)}
                    >
                      {sedangProses === p.order_id ? '…' : 'Tandai siap'}
                    </button>
                  )}
                  <Link to={`/pesanan/${p.order_id}`} className="tombol-kecil">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {jumlahHalaman > 1 && (
        <nav className="penomoran" aria-label="Navigasi halaman">
          <button
            type="button"
            disabled={halamanSekarang <= 1}
            onClick={() => ubahParameter({ halaman: String(halamanSekarang - 1) })}
          >
            Sebelumnya
          </button>
          <span>
            Halaman {halamanSekarang} dari {jumlahHalaman} · {meta.total} pesanan
          </span>
          <button
            type="button"
            disabled={halamanSekarang >= jumlahHalaman}
            onClick={() => ubahParameter({ halaman: String(halamanSekarang + 1) })}
          >
            Berikutnya
          </button>
        </nav>
      )}
    </section>
  );
}
