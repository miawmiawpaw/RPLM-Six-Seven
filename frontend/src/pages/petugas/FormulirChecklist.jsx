import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { rupiah, tanggal, durasiHari } from '../../utils/format';

/**
 * Formulir checklist serah-terima — REQ-4.5.2, REQ-4.5.3, REQ-4.5.5.
 *
 * Menggantikan kertas checklist: petugas mencatat kondisi setiap alat, menambahkan
 * alat yang tidak ada di pesanan bila perlu, lalu menandatangani serah-terima secara
 * digital dengan menekan tombol kirim.
 *
 * Perbedaan penting antara dua tipe:
 *   SERAH   → kondisi dicatat apa adanya saat alat keluar
 *   KEMBALI → selisih kondisi dihitung; kerusakan/kehilangan memicu ganti rugi
 *             (REQ-4.7.2), dan keterlambatan dihitung dari jam pengembalian
 *             (REQ-4.7.1). Keduanya dihitung backend, bukan di layar ini.
 */
export default function FormulirChecklist() {
  const { orderId, tipe } = useParams();
  const navigate = useNavigate();

  const adalahSerah = tipe === 'SERAH';

  const [pesanan, setPesanan] = useState(null);
  const [baris, setBaris] = useState([]);
  const [catatanUmum, setCatatanUmum] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [mengirim, setMengirim] = useState(false);

  const KONDISI = ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'HILANG'];

  useEffect(() => {
    let dibatalkan = false;

    api.pesanan
      .detail(orderId)
      .then((hasil) => {
        if (dibatalkan) return;

        setPesanan(hasil.data);

        // Susun satu baris formulir per unit alat yang dipesan.
        // Endpoint detail pesanan membungkus datanya sebagai `data.pesanan`
        // (lihat order.routes.js). Sebelumnya berkas ini membaca `data.items`
        // sehingga daftar alat selalu kosong dan formulir serah-terima tidak
        // pernah terisi.
        setBaris(
          ((hasil.data.pesanan && hasil.data.pesanan.items) || []).map((it) => ({
            item_id: it.item_id,
            nama: it.nama,
            kuantitas: it.kuantitas,
            kondisi: 'BAIK',
            kelengkapan: '',
            catatan: '',
          }))
        );
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
  }, [orderId]);

  function ubahBaris(indeks, perubahan) {
    setBaris((sebelumnya) =>
      sebelumnya.map((b, i) => (i === indeks ? { ...b, ...perubahan } : b))
    );
  }

  function tambahBaris() {
    setBaris((sebelumnya) => [
      ...sebelumnya,
      { item_id: '', nama: '', kuantitas: 1, kondisi: 'BAIK', kelengkapan: '', catatan: '' },
    ]);
  }

  function hapusBaris(indeks) {
    setBaris((sebelumnya) => sebelumnya.filter((_, i) => i !== indeks));
  }

  /** Ringkasan kondisi untuk konfirmasi sebelum kirim. */
  const ringkasanMasalah = useMemo(
    () => baris.filter((b) => b.kondisi !== 'BAIK'),
    [baris]
  );

  const adaBarisTidakLengkap = baris.some((b) => !b.item_id && adalahSerah === false && !b.nama);

  async function kirim(e) {
    e.preventDefault();
    setGalat(null);

    // Baris tanpa nama alat tidak bermakna dan akan ditolak backend.
    const barisSah = baris.filter((b) => b.nama || b.item_id);
    if (barisSah.length === 0) {
      setGalat('Isi minimal satu baris checklist.');
      return;
    }

    setMengirim(true);
    try {
      const payload = {
        items: barisSah.map((b) => ({
          item_id: b.item_id || undefined,
          nama: b.nama || undefined,
          kuantitas: Number(b.kuantitas),
          kondisi: b.kondisi,
          kelengkapan: b.kelengkapan || undefined,
          catatan: b.catatan || undefined,
        })),
        catatan: catatanUmum || undefined,
      };

      if (adalahSerah) {
        await api.serahTerima.serahkan(orderId, payload);
      } else {
        await api.serahTerima.kembalikan(orderId, payload);
      }

      navigate(`/pesanan/${orderId}`, { replace: true });
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (memuat) return <section className="halaman"><p role="status">Memuat pesanan…</p></section>;

  if (galat && !pesanan) {
    return (
      <section className="halaman">
        <p className="pesan-galat">{galat}</p>
        <Link to="/petugas/tugas">Kembali ke daftar tugas</Link>
      </section>
    );
  }

  const p = pesanan?.pesanan;

  return (
    <section className="halaman">
      <nav className="remah">
        <Link to="/petugas/tugas">Tugas</Link> /{' '}
        <Link to={`/pesanan/${orderId}`}>#{p?.kode_pesanan || orderId}</Link> /{' '}
        <span>{adalahSerah ? 'Penyerahan' : 'Pengembalian'}</span>
      </nav>

      <h1>Checklist {adalahSerah ? 'Penyerahan Alat' : 'Pengembalian Alat'}</h1>

      <section className="blok">
        <h2>Ringkasan pesanan</h2>
        <dl className="daftar-data">
          <dt>Penyewa</dt>
          <dd>{p?.pelanggan || '-'}</dd>
          <dt>Telepon</dt>
          <dd>{p?.pelanggan_telepon || '-'}</dd>
          <dt>Jadwal sewa</dt>
          <dd>
            {tanggal(p?.tanggal_mulai)} — {tanggal(p?.tanggal_selesai)} (
            {durasiHari(p?.tanggal_mulai, p?.tanggal_selesai)} hari)
          </dd>
          <dt>Total dibayar</dt>
          <dd>{rupiah(p?.total_akhir)}</dd>
        </dl>
        {!adalahSerah && <p className="catatan-info">Waktu penerimaan dicatat saat Anda mengirim formulir ini.</p>}
      </section>

      <form onSubmit={kirim} className="formulir-checklist">
        <table className="tabel tabel-checklist">
          <thead>
            <tr>
              <th>Nama alat</th>
              <th>Jumlah</th>
              <th>Kondisi</th>
              <th>Kelengkapan</th>
              <th>Catatan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={b.nama}
                    onChange={(e) => ubahBaris(i, { nama: e.target.value })}
                    placeholder="Nama alat"
                    aria-label={`Nama alat baris ${i + 1}`}
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={b.kuantitas}
                    onChange={(e) => ubahBaris(i, { kuantitas: Number(e.target.value) })}
                    aria-label={`Jumlah baris ${i + 1}`}
                    required
                  />
                </td>
                <td>
                  <select
                    value={b.kondisi}
                    onChange={(e) => ubahBaris(i, { kondisi: e.target.value })}
                    aria-label={`Kondisi baris ${i + 1}`}
                    className={b.kondisi === 'BAIK' ? '' : 'pilih-masalah'}
                  >
                    {KONDISI.map((k) => (
                      <option key={k} value={k}>
                        {k.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={b.kelengkapan}
                    onChange={(e) => ubahBaris(i, { kelengkapan: e.target.value })}
                    placeholder="cth. tas + pasak"
                    aria-label={`Kelengkapan baris ${i + 1}`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={b.catatan}
                    onChange={(e) => ubahBaris(i, { catatan: e.target.value })}
                    placeholder={b.kondisi === 'BAIK' ? '' : 'Jelaskan kerusakannya'}
                    aria-label={`Catatan baris ${i + 1}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="tombol-hapus"
                    onClick={() => hapusBaris(i)}
                    aria-label={`Hapus baris ${i + 1}`}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className="tombol-sekunder" onClick={tambahBaris}>
          Tambah baris
        </button>
        <small className="catatan-kecil">
          Tambahkan baris hanya bila ada alat yang diserahkan di luar daftar pesanan.
        </small>

        <label>
          Catatan umum
          <textarea
            rows={3}
            value={catatanUmum}
            onChange={(e) => setCatatanUmum(e.target.value)}
            placeholder={
              adalahSerah
                ? 'Kondisi lingkungan saat penyerahan, permintaan khusus penyewa, dsb.'
                : 'Keterangan tambahan saat pengembalian.'
            }
          />
        </label>

        {/* Peringatan sebelum kirim: alat bermasalah memicu perhitungan denda,
            jadi petugas sebaiknya melihat ringkasannya lebih dulu. */}
        {!adalahSerah && ringkasanMasalah.length > 0 && (
          <div className="kotak-peringatan">
            <p>
              <strong>{ringkasanMasalah.length} alat dicatat tidak dalam kondisi baik.</strong> Denda
              ganti rugi akan dihitung otomatis berdasarkan tarif yang berlaku. Pastikan catatan
              Anda jelas — catatan inilah bukti yang dilihat penyewa.
            </p>
            <ul>
              {ringkasanMasalah.map((b, i) => (
                <li key={i}>
                  {b.nama} — {b.kondisi}
                  {b.catatan ? `: ${b.catatan}` : ' (tanpa catatan)'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {adalahSerah && ringkasanMasalah.length > 0 && (
          <div className="kotak-peringatan">
            <p>
              Anda mencatat {ringkasanMasalah.length} alat dalam kondisi tidak baik saat penyerahan.
              Alat seperti ini sebaiknya tidak diserahkan. Periksa kembali sebelum mengirim.
            </p>
          </div>
        )}

        {adaBarisTidakLengkap && (
          <p className="pesan-galat">Ada baris yang belum lengkap. Lengkapi atau hapus baris itu.</p>
        )}

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <div className="aksi-formulir">
          <button type="submit" className="tombol-utama" disabled={mengirim}>
            {mengirim
              ? 'Mengirim…'
              : adalahSerah
                ? 'Konfirmasi penyerahan'
                : 'Konfirmasi pengembalian'}
          </button>
          <Link to="/petugas/tugas" className="tombol-sekunder">
            Batal
          </Link>
        </div>
      </form>
    </section>
  );
}
