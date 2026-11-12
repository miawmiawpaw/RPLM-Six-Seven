import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth, PERAN } from '../context/AuthContext';
import {
  rupiah,
  tanggal,
  tanggalJam,
  labelStatus,
  kelasStatus,
  durasiHari,
  hitungMundur,
} from '../utils/format';
import LiniMasaStatus from '../components/LiniMasaStatus';

/**
 * Detail pesanan — REQ-4.2.10, REQ-4.4.2, REQ-4.5.3, REQ-4.7.2.
 *
 * Satu halaman melayani tiga peran dengan cakupan berbeda. Backend yang menentukan
 * apa yang boleh terlihat; antarmuka hanya menyembunyikan bagian yang tidak relevan.
 */
export default function DetailPesanan() {
  const { orderId } = useParams();
  const { peran } = useAuth();

  const [pesanan, setPesanan] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [sisaDetik, setSisaDetik] = useState(null);
  const [sedangAksi, setSedangAksi] = useState(false);
  const [pesanAksi, setPesanAksi] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [denda, setDenda] = useState([]);

  const muat = useCallback(async () => {
    setGalat(null);
    try {
      const hasil = await api.pesanan.detail(orderId);
      setPesanan(hasil.data);

      // Hitung mundur hanya relevan saat menunggu pembayaran.
      if (hasil.data.pesanan.status === 'MENUNGGU_PEMBAYARAN' && hasil.data.pesanan.batas_pembayaran) {
        const batas = new Date(hasil.data.pesanan.batas_pembayaran).getTime();
        setSisaDetik(Math.max(0, Math.floor((batas - Date.now()) / 1000)));
      } else {
        setSisaDetik(null);
      }

      // Checklist serah-terima dan denda tidak termasuk dalam payload detail
      // pesanan; keduanya diambil dari endpoint masing-masing. Kegagalan salah
      // satu tidak boleh menggagalkan tampilan utama.
      const [hasilChecklist, hasilDenda] = await Promise.allSettled([
        api.serahTerima.checklist(orderId),
        api.denda.pesanan(orderId),
      ]);
      setChecklist(hasilChecklist.status === 'fulfilled' ? hasilChecklist.value.data || [] : []);
      setDenda(hasilDenda.status === 'fulfilled' ? hasilDenda.value.data || [] : []);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, [orderId]);

  useEffect(() => {
    setMemuat(true);
    muat();
  }, [muat]);

  // Hitung mundur berjalan tiap detik; saat mencapai nol, status dimuat ulang
  // karena backend menjadwalkan pembatalan pesanan kedaluwarsa.
  useEffect(() => {
    if (sisaDetik === null || sisaDetik <= 0) return;

    const pewaktu = setInterval(() => {
      setSisaDetik((sebelumnya) => {
        if (sebelumnya === null) return null;
        const berikutnya = sebelumnya - 1;
        if (berikutnya <= 0) {
          // Beri jeda singkat agar job pembatalan backend sempat berjalan.
          setTimeout(muat, 1500);
          return 0;
        }
        return berikutnya;
      });
    }, 1000);

    return () => clearInterval(pewaktu);
  }, [sisaDetik === null, muat]);

  async function jalankanAksi(aksi, pesanSukses) {
    setSedangAksi(true);
    setPesanAksi(null);
    try {
      await aksi();
      setPesanAksi({ jenis: 'sukses', teks: pesanSukses });
      await muat();
    } catch (err) {
      setPesanAksi({ jenis: 'galat', teks: err.message });
    } finally {
      setSedangAksi(false);
    }
  }

  async function bayarSekarang() {
    setSedangAksi(true);
    setPesanAksi(null);
    try {
      const hasil = await api.pembayaran.buat(orderId);
      // Midtrans Snap mengembalikan token; panggil antarmuka pembayarannya.
      if (window.snap && hasil.data.token) {
        window.snap.pay(hasil.data.token, {
          onSuccess: () => muat(),
          onPending: () => muat(),
          onError: () => setPesanAksi({ jenis: 'galat', teks: 'Pembayaran gagal diproses.' }),
          onClose: () => setPesanAksi({ jenis: 'galat', teks: 'Jendela pembayaran ditutup sebelum selesai.' }),
        });
      } else if (hasil.data.redirect_url) {
        window.location.href = hasil.data.redirect_url;
      } else {
        setPesanAksi({
          jenis: 'galat',
          teks: 'Halaman pembayaran tidak tersedia. Hubungi petugas untuk menyelesaikan pembayaran.',
        });
      }
    } catch (err) {
      setPesanAksi({ jenis: 'galat', teks: err.message });
    } finally {
      setSedangAksi(false);
    }
  }

  if (memuat) return <section className="halaman"><p role="status">Memuat pesanan…</p></section>;

  if (galat) {
    return (
      <section className="halaman">
        <p className="pesan-galat">{galat}</p>
        <Link to="/pesanan-saya">Kembali ke daftar pesanan</Link>
      </section>
    );
  }

  if (!pesanan) return null;

  // Backend mengirim { data: { pesanan } }, dan item ada DI DALAM objek pesanan.
  const p = pesanan.pesanan;
  const items = p.items || [];
  const totalDenda = denda.reduce((jumlah, d) => jumlah + Number(d.nominal || 0), 0);
  const bolehBatalkan = p.status === 'MENUNGGU_PEMBAYARAN';

  return (
    <section className="halaman">
      <nav className="remah">
        <Link to={peran === PERAN.PELANGGAN ? '/pesanan-saya' : '/admin/pesanan'}>Pesanan</Link> /{' '}
        <span>#{p.kode_pesanan || p.order_id}</span>
      </nav>

      <div className="kepala-detail">
        <h1>Pesanan #{p.kode_pesanan || p.order_id}</h1>
        <span className={kelasStatus(p.status)}>{labelStatus(p.status)}</span>
      </div>

      {p.status === 'MENUNGGU_PEMBAYARAN' && sisaDetik !== null && (
        <div className={sisaDetik > 0 ? 'kotak-hitung-mundur' : 'kotak-hitung-mundur lewat'}>
          {sisaDetik > 0 ? (
            <>
              <p>Selesaikan pembayaran dalam:</p>
              <p className="angka-hitung-mundur">{hitungMundur(sisaDetik)}</p>
            </>
          ) : (
            <p>Batas waktu pembayaran telah lewat. Pesanan akan segera dibatalkan otomatis.</p>
          )}
        </div>
      )}

      <LiniMasaStatus status={p.status} />

      <div className="tata-detail-pesanan">
        <div className="kolom-utama">
          <section className="blok">
            <h2>Jadwal dan lokasi</h2>
            <dl className="daftar-data">
              <dt>Mulai</dt>
              <dd>{tanggal(p.tanggal_mulai)}</dd>
              <dt>Selesai</dt>
              <dd>{tanggal(p.tanggal_selesai)}</dd>
              <dt>Durasi</dt>
              <dd>{durasiHari(p.tanggal_mulai, p.tanggal_selesai)} hari</dd>
              <dt>Lokasi pengambilan</dt>
              <dd>{p.lokasi_pengambilan || 'Lokasi utama'}</dd>
            </dl>
          </section>

          <section className="blok">
            <h2>Alat yang disewa</h2>
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
                {items.map((baris, i) => (
                  <tr key={baris.order_item_id || i}>
                    <td>
                      {baris.nama}
                      {baris.tipe === 'BUNDLE' && <span className="catatan-kecil"> (paket)</span>}
                    </td>
                    <td>{baris.kuantitas}</td>
                    <td>{rupiah(baris.tarif_saat_pesan ?? baris.tarif_harian)}</td>
                    <td>{rupiah(baris.subtotal ?? baris.tarif_harian * baris.kuantitas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {checklist.length > 0 && (
            <section className="blok">
              <h2>Checklist serah-terima</h2>
              {checklist.map((c) => (
                <div key={c.checklist_id} className="blok-checklist">
                  <h3>{c.tipe === 'SERAH' ? 'Saat penyerahan' : 'Saat pengembalian'}</h3>
                  <p className="catatan-kecil">
                    Dicatat oleh {c.petugas || 'petugas'} pada {tanggalJam(c.waktu_aktual)}
                  </p>
                  <ul className="daftar-checklist">
                    {c.items.map((it, i) => (
                      <li key={it.checklist_item_id || i}>
                        <strong>{it.nama}</strong> ({it.kode_barang}) — {it.kuantitas} unit, kondisi: {it.kondisi}
                        {it.kelengkapan && <> · kelengkapan: {it.kelengkapan}</>}
                        {it.catatan && <em> · {it.catatan}</em>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {denda.length > 0 && (
            <section className="blok">
              <h2>Denda</h2>
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Jenis</th>
                    <th>Keterangan</th>
                    <th>Nominal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {denda.map((d) => (
                    <tr key={d.penalty_id}>
                      <td>{d.tipe}</td>
                      <td>
                        {d.tipe === 'DENDA_KETERLAMBATAN'
                          ? `Terlambat ${d.durasi_terlambat_menit} menit`
                          : d.alasan_penyesuaian || 'Ganti rugi'}
                      </td>
                      <td>{rupiah(d.nominal)}</td>
                      <td>
                        <span className={d.status_pelunasan === 'LUNAS' ? 'lencana-status selesai' : 'lencana-status menunggu'}>
                          {d.status_pelunasan === 'LUNAS' ? 'Lunas' : 'Belum lunas'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="total-besar">Total denda: {rupiah(totalDenda)}</p>
            </section>
          )}

          {p.catatan && (
            <section className="blok">
              <h2>Catatan Anda</h2>
              <p>{p.catatan}</p>
            </section>
          )}
        </div>

        <aside className="kolom-ringkasan">
          <h2>Pembayaran</h2>
          <dl className="daftar-data">
            <dt>Subtotal sewa</dt>
            <dd>{rupiah(p.total_sewa)}</dd>
            {Number(p.total_biaya_tambahan) > 0 && (
              <>
                <dt>Biaya tambahan</dt>
                <dd>{rupiah(p.total_biaya_tambahan)}</dd>
              </>
            )}
            {Number(totalDenda) > 0 && (
              <>
                <dt>Denda</dt>
                <dd>{rupiah(totalDenda)}</dd>
              </>
            )}
            <dt>Total</dt>
            <dd className="total-besar">{rupiah(p.total_akhir)}</dd>
            <dt>Status pesanan</dt>
            <dd>{labelStatus(p.status)}</dd>
          </dl>

          {pesanAksi && (
            <p className={pesanAksi.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
              {pesanAksi.teks}
            </p>
          )}

          {p.status === 'MENUNGGU_PEMBAYARAN' && peran === PERAN.PELANGGAN && (
            <button type="button" className="tombol-utama lebar-penuh" onClick={bayarSekarang} disabled={sedangAksi}>
              {sedangAksi ? 'Membuka pembayaran…' : 'Bayar sekarang'}
            </button>
          )}

          {bolehBatalkan && peran === PERAN.PELANGGAN && (
            <button
              type="button"
              className="tombol-sekunder lebar-penuh"
              disabled={sedangAksi}
              onClick={() =>
                jalankanAksi(() => api.pesanan.batalkan(orderId), 'Pesanan berhasil dibatalkan.')
              }
            >
              Batalkan pesanan
            </button>
          )}

          {p.status === 'DIBAYAR' && (
            <p className="catatan-info">
              Pembayaran diterima. Petugas akan menyiapkan alat dan menghubungi Anda saat siap
              diambil.
            </p>
          )}

          {p.status === 'SEDANG_DISEWA' && (
            <p className="catatan-info">
              Alat sedang Anda sewa. Kembalikan sesuai jadwal untuk menghindari denda
              keterlambatan.
            </p>
          )}

          {p.status === 'DIKEMBALIKAN' && totalDenda > 0 && (
            <p className="catatan-penting">
              Pesanan menunggu pelunasan denda. Pesanan akan selesai setelah denda dibayar.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
