import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { rupiah, hariIniIso, durasiHari } from '../../utils/format';
import { penyimpanan } from '../../api/client';

/**
 * Laporan admin — REQ-4.6.3 .. REQ-4.6.7.
 *
 * Tiga laporan disajikan dalam satu rentang tanggal yang sama, karena pertanyaan
 * yang biasanya diajukan bersifat silang: "bulan ini, alat mana yang paling laku,
 * dan berapa pendapatannya?" Memisahkan rentang tanggal per laporan akan membuat
 * angka sulit dibandingkan.
 *
 * Unduhan CSV memakai endpoint backend dan token akses, bukan `window.open('/api/...')`.
 * Alasannya: token dikirim lewat header Authorization, dan tautan biasa tidak dapat
 * membawa header — permintaan akan ditolak 401.
 */
export default function LaporanAdmin() {
  const [tab, setTab] = useState('penyewaan');

  const hariIni = hariIniIso();
  const awalBulan = hariIni.slice(0, 8) + '01';

  const [rentang, setRentang] = useState({ mulai: awalBulan, selesai: hariIni });
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [mengunduh, setMengunduh] = useState(false);

  const muat = useCallback(async () => {
    if (!rentang.mulai || !rentang.selesai) return;
    if (rentang.selesai < rentang.mulai) {
      setGalat('Tanggal selesai tidak boleh mendahului tanggal mulai.');
      return;
    }

    setMemuat(true);
    setGalat(null);
    try {
      // Backend memakai skema periode { dari, sampai } (lihat `skemaPeriode`
      // pada report.routes.js). Mengirim `mulai`/`selesai` akan ditolak 400.
      const kueri = { dari: rentang.mulai, sampai: rentang.selesai };
      let hasil;

      if (tab === 'penyewaan') hasil = await api.laporan.penyewaan(kueri);
      else if (tab === 'pemanfaatan') hasil = await api.laporan.pemanfaatan(kueri);
      else hasil = await api.laporan.pendapatan(kueri);

      setData(hasil.data);
    } catch (err) {
      setGalat(err.message);
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [tab, rentang]);

  useEffect(() => {
    muat();
  }, [muat]);

  /**
   * Unduh CSV. Berkas diambil sebagai blob lalu disimpan — cara ini memungkinkan
   * header Authorization disertakan, dan nama berkas dapat ditentukan dari sisi klien.
   */
  async function unduhCsv() {
    setMengunduh(true);
    setGalat(null);

    try {
      const jalur = api.laporan.urlEkspor({
        jenis: tab,
        dari: rentang.mulai,
        sampai: rentang.selesai,
      });

      const token = penyimpanan.ambilToken();
      const respons = await fetch(jalur, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!respons.ok) {
        throw new Error('Gagal mengunduh berkas. Pastikan Anda masih memiliki akses.');
      }

      const blob = await respons.blob();
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement('a');
      tautan.href = url;
      tautan.download = `laporan-${tab}-${rentang.mulai}_${rentang.selesai}.csv`;
      document.body.appendChild(tautan);
      tautan.click();
      document.body.removeChild(tautan);
      URL.revokeObjectURL(url);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengunduh(false);
    }
  }

  const jumlahHari = durasiHari(rentang.mulai, rentang.selesai);

  return (
    <section className="halaman">
      <h1>Laporan</h1>

      <div className="baris-filter">
        <label>
          Dari tanggal
          <input
            type="date"
            value={rentang.mulai}
            max={rentang.selesai || hariIni}
            onChange={(e) => setRentang({ ...rentang, mulai: e.target.value })}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            type="date"
            value={rentang.selesai}
            min={rentang.mulai}
            max={hariIni}
            onChange={(e) => setRentang({ ...rentang, selesai: e.target.value })}
          />
        </label>

        <div className="aksi-laporan">
          <button type="button" className="tombol-sekunder" onClick={muat} disabled={memuat}>
            {memuat ? 'Memuat…' : 'Terapkan'}
          </button>
          <button type="button" className="tombol-utama" onClick={unduhCsv} disabled={mengunduh || memuat}>
            {mengunduh ? 'Menyiapkan…' : 'Unduh CSV'}
          </button>
        </div>
      </div>

      {jumlahHari > 0 && (
        <p className="catatan-kecil">
          Rentang {rentang.mulai} sampai {rentang.selesai} ({jumlahHari} hari)
        </p>
      )}

      <div className="grup-pil" role="tablist" aria-label="Jenis laporan">
        {[
          ['penyewaan', 'Penyewaan'],
          ['pemanfaatan', 'Pemanfaatan Alat'],
          ['pendapatan', 'Pendapatan'],
        ].map(([nilai, label]) => (
          <button
            key={nilai}
            type="button"
            role="tab"
            aria-selected={tab === nilai}
            className={tab === nilai ? 'pil aktif' : 'pil'}
            onClick={() => setTab(nilai)}
          >
            {label}
          </button>
        ))}
      </div>

      {galat && (
        <p className="pesan-galat" role="alert">
          {galat}
        </p>
      )}

      {memuat && <p role="status">Menyusun laporan…</p>}

      {!memuat && data && tab === 'penyewaan' && <LaporanPenyewaan data={data} />}
      {!memuat && data && tab === 'pemanfaatan' && <LaporanPemanfaatan data={data} />}
      {!memuat && data && tab === 'pendapatan' && <LaporanPendapatan data={data} />}
    </section>
  );
}

// ─── Laporan penyewaan (REQ-4.6.3) ────────────────────────────────────────────

function LaporanPenyewaan({ data }) {
  const pesanan = data.pesanan || [];
  const totalBiaya = pesanan.reduce((j, p) => j + Number(p.total_akhir || 0), 0);

  return (
    <>
      <div className="kisi-statistik">
        <div className="kartu-statistik">
          <span className="angka-statistik">{data.total_pesanan ?? pesanan.length}</span>
          <span className="label-statistik">Jumlah pesanan</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{rupiah(totalBiaya)}</span>
          <span className="label-statistik">Nilai sewa</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{data.rata_rata_durasi ?? '-'}</span>
          <span className="label-statistik">Rata-rata durasi (hari)</span>
        </div>
      </div>

      {pesanan.length === 0 ? (
        <p className="pesan-kosong">Tidak ada pesanan pada rentang tanggal ini.</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Penyewa</th>
              <th>Tanggal sewa</th>
              <th>Jumlah alat</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pesanan.map((p) => (
              <tr key={p.order_id}>
                <td>{p.kode_pesanan || p.order_id}</td>
                <td>{p.pelanggan}</td>
                <td>
                  {p.tanggal_mulai} — {p.tanggal_selesai}
                </td>
                <td>{p.jumlah_item}</td>
                <td>{rupiah(p.total_akhir)}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// ─── Laporan pemanfaatan (REQ-4.6.4, REQ-4.6.5) ───────────────────────────────

function LaporanPemanfaatan({ data }) {
  const alat = data.alat || [];

  return (
    <>
      <div className="kisi-statistik">
        <div className="kartu-statistik">
          <span className="angka-statistik">{data.total_alat ?? alat.length}</span>
          <span className="label-statistik">Jenis alat</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{data.utilisasi_rata_rata ?? '-'}%</span>
          <span className="label-statistik">Utilisasi rata-rata</span>
        </div>
        <div className="kartu-statistik sorot">
          <span className="angka-statistik">{data.alat_tidak_terpakai ?? 0}</span>
          <span className="label-statistik">Tidak pernah disewa</span>
        </div>
      </div>

      {alat.length === 0 ? (
        <p className="pesan-kosong">Tidak ada data pemanfaatan pada rentang ini.</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Alat</th>
              <th>Kali disewa</th>
              <th>Hari tersewa</th>
              <th>Utilisasi</th>
              <th>Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {alat.map((a) => (
              <tr key={a.item_id} className={a.kali_disewa === 0 ? 'baris-perhatian' : ''}>
                <td>{a.nama}</td>
                <td>{a.kali_disewa}</td>
                <td>{a.hari_tersewa}</td>
                <td>
                  {/* Bilah sederhana lebih mudah dibaca daripada angka telanjang. */}
                  <div className="bilah-utilisasi">
                    <div
                      className="bilah-isi"
                      style={{ width: `${Math.min(100, Number(a.utilisasi_persen) || 0)}%` }}
                      role="img"
                      aria-label={`Utilisasi ${a.utilisasi_persen}%`}
                    />
                    <span>{a.utilisasi_persen}%</span>
                  </div>
                </td>
                <td>{rupiah(a.pendapatan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// ─── Laporan pendapatan (REQ-4.6.6, REQ-4.6.7) ────────────────────────────────

function LaporanPendapatan({ data }) {
  const rincian = data.rincian || [];

  return (
    <>
      <div className="kisi-statistik">
        <div className="kartu-statistik">
          <span className="angka-statistik">{rupiah(data.total_pendapatan)}</span>
          <span className="label-statistik">Total pendapatan sewa</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{rupiah(data.total_denda)}</span>
          <span className="label-statistik">Denda terkumpul</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{rupiah(Number(data.total_pendapatan || 0) + Number(data.total_denda || 0))}</span>
          <span className="label-statistik">Pendapatan kotor</span>
        </div>
      </div>

      <p className="catatan-kecil">
        Pendapatan sewa dihitung dari pembayaran berhasil, bukan dari pesanan dibuat. Pesanan yang
        kedaluwarsa sebelum dibayar tidak dihitung.
      </p>

      {rincian.length === 0 ? (
        <p className="pesan-kosong">Tidak ada pembayaran berhasil pada rentang ini.</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jumlah transaksi</th>
              <th>Nilai sewa</th>
              <th>Denda</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rincian.map((r) => (
              <tr key={r.tanggal}>
                <td>{r.tanggal}</td>
                <td>{r.jumlah_transaksi}</td>
                <td>{rupiah(r.nilai_sewa)}</td>
                <td>{rupiah(r.nilai_denda)}</td>
                <td>{rupiah(Number(r.nilai_sewa || 0) + Number(r.nilai_denda || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
