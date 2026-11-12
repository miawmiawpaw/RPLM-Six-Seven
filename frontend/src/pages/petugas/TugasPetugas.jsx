import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { tanggal, labelStatus, kelasStatus, durasiHari } from '../../utils/format';

/**
 * Daftar tugas petugas — REQ-4.5.1, REQ-4.5.4.
 *
 * Dua jenis tugas dipisahkan karena keduanya berbeda tindakan:
 *   - PENYERAHAN  : pesanan berstatus DIBAYAR/DISIAPKAN, menunggu diserahkan
 *   - PENGEMBALIAN: pesanan berstatus SEDANG_DISEWA, menunggu dikembalikan
 *
 * Pesanan yang telat dikembalikan diberi penanda agar petugas memeriksa denda
 * sebelum menutup pesanan (REQ-4.7.1).
 */
export default function TugasPetugas() {
  const [tugas, setTugas] = useState({ penyerahan: [], pengembalian: [] });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [saring, setSaring] = useState('semua');

  const muat = useCallback(async () => {
    setGalat(null);
    try {
      const hasil = await api.serahTerima.tugas();
      setTugas({
        penyerahan: hasil.data.perlu_disarahkan || [],
        pengembalian: hasil.data.perlu_dikembalikan || [],
      });
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  function bagianTugas() {
    if (saring === 'penyerahan') return [['penyerahan', tugas.penyerahan]];
    if (saring === 'pengembalian') return [['pengembalian', tugas.pengembalian]];
    return [
      ['penyerahan', tugas.penyerahan],
      ['pengembalian', tugas.pengembalian],
    ];
  }

  if (memuat) return <section className="halaman"><p role="status">Memuat tugas…</p></section>;

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

  const jumlahTugas = tugas.penyerahan.length + tugas.pengembalian.length;

  return (
    <section className="halaman">
      <div className="kepala-detail">
        <h1>Tugas Saya</h1>
        <button type="button" className="tombol-sekunder" onClick={muat}>
          Muat ulang
        </button>
      </div>

      <div className="baris-filter">
        <div role="group" aria-label="Saring jenis tugas" className="grup-pil">
          {[
            ['semua', `Semua (${jumlahTugas})`],
            ['penyerahan', `Penyerahan (${tugas.penyerahan.length})`],
            ['pengembalian', `Pengembalian (${tugas.pengembalian.length})`],
          ].map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              className={saring === nilai ? 'pil aktif' : 'pil'}
              aria-pressed={saring === nilai}
              onClick={() => setSaring(nilai)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {jumlahTugas === 0 && (
        <p className="pesan-kosong">Tidak ada tugas yang menunggu saat ini.</p>
      )}

      {bagianTugas().map(([jenis, daftar]) =>
        daftar.length === 0 ? null : (
          <section key={jenis} className="blok">
            <h2>{jenis === 'penyerahan' ? 'Menunggu Penyerahan' : 'Menunggu Pengembalian'}</h2>

            <ul className="daftar-tugas">
              {daftar.map((t) => {
                // Pesanan yang jadwal kembalinya sudah lewat ditandai mencolok.
                const terlambat =
                  jenis === 'pengembalian' && t.tanggal_selesai && new Date(t.tanggal_selesai) < new Date();

                return (
                  <li key={t.order_id} className={terlambat ? 'kartu-tugas terlambat' : 'kartu-tugas'}>
                    <div className="kepala-tugas">
                      <h3>#{t.kode_pesanan || t.order_id}</h3>
                      <span className={kelasStatus(t.status)}>{labelStatus(t.status)}</span>
                    </div>

                    <dl className="daftar-data ringkas">
                      <dt>Penyewa</dt>
                      <dd>{t.pelanggan}</dd>
                      <dt>Telepon</dt>
                      <dd>{t.pelanggan_telepon || '-'}</dd>
                      <dt>Jadwal sewa</dt>
                      <dd>
                        {tanggal(t.tanggal_mulai)} — {tanggal(t.tanggal_selesai)} (
                        {durasiHari(t.tanggal_mulai, t.tanggal_selesai)} hari)
                      </dd>
                      <dt>Jumlah alat</dt>
                      <dd>{t.jumlah_item} unit</dd>
                    </dl>

                    {terlambat && (
                      <p className="catatan-penting">
                        Jadwal pengembalian sudah lewat. Periksa keterlambatan dan denda saat
                        menerima alat.
                      </p>
                    )}

                    <div className="aksi-tugas">
                      {jenis === 'penyerahan' ? (
                        <Link to={`/petugas/checklist/${t.order_id}/SERAH`} className="tombol-utama">
                          Serahkan alat
                        </Link>
                      ) : (
                        <Link to={`/petugas/checklist/${t.order_id}/KEMBALI`} className="tombol-utama">
                          Terima pengembalian
                        </Link>
                      )}
                      <Link to={`/pesanan/${t.order_id}`} className="tombol-sekunder">
                        Lihat detail
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )
      )}
    </section>
  );
}
