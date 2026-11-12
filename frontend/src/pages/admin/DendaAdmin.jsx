import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { rupiah, tanggal, labelStatus, kelasStatus } from '../../utils/format';

/**
 * Manajemen denda — REQ-4.7.1 .. REQ-4.7.4.
 *
 * Halaman ini mengelola dua hal yang berbeda dan sengaja dipisah:
 *   1. TARIF — besaran denda per jam/hari dan ganti rugi bawaan. Mengubah tarif
 *      TIDAK mengubah denda yang sudah tercatat pada pesanan lama, karena nominal
 *      disalin saat denda dibuat. Tarif baru hanya berlaku untuk denda berikutnya.
 *   2. PELUNASAN — denda yang belum dibayar dari pesanan yang sudah dikembalikan.
 */
export default function DendaAdmin() {
  const [tab, setTab] = useState('pelunasan');

  return (
    <section className="halaman">
      <h1>Denda</h1>

      <div className="grup-pil" role="tablist" aria-label="Bagian denda">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pelunasan'}
          className={tab === 'pelunasan' ? 'pil aktif' : 'pil'}
          onClick={() => setTab('pelunasan')}
        >
          Pelunasan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tarif'}
          className={tab === 'tarif' ? 'pil aktif' : 'pil'}
          onClick={() => setTab('tarif')}
        >
          Tarif denda
        </button>
      </div>

      {tab === 'pelunasan' ? <BagianPelunasan /> : <BagianTarif />}
    </section>
  );
}

// ─── Pelunasan ────────────────────────────────────────────────────────────────

function BagianPelunasan() {
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [sedangProses, setSedangProses] = useState(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const hasil = await api.denda.daftar();
      setDaftar(hasil.data);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function lunaskan(penaltyId, nominal) {
    const yakin = window.confirm(
      `Tandai denda sebesar ${rupiah(nominal)} sebagai LUNAS?\n\n` +
        'Pastikan uang benar-benar sudah diterima. Tindakan ini tercatat di log audit ' +
        'dengan nama Anda.'
    );
    if (!yakin) return;

    setSedangProses(penaltyId);
    setPesan(null);
    try {
      await api.denda.lunaskan(penaltyId);
      setPesan({ jenis: 'sukses', teks: 'Denda ditandai lunas.' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    } finally {
      setSedangProses(null);
    }
  }

  async function selesaikan(orderId) {
    const yakin = window.confirm(
      'Selesaikan pesanan ini? Statusnya berubah menjadi SELESAI dan tidak dapat dikembalikan ' +
        'ke tahap sebelumnya lewat antarmuka ini.'
    );
    if (!yakin) return;

    setSedangProses(orderId);
    setPesan(null);
    try {
      await api.denda.selesaikan(orderId);
      setPesan({ jenis: 'sukses', teks: 'Pesanan ditandai selesai.' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    } finally {
      setSedangProses(null);
    }
  }

  const totalBelumLunas = daftar
    .flatMap((p) => p.denda || [])
    .filter((d) => d.status_pelunasan === 'BELUM_LUNAS')
    .reduce((jumlah, d) => jumlah + Number(d.nominal || 0), 0);

  return (
    <>
      <div className="kisi-statistik">
        <div className="kartu-statistik sorot">
          <span className="angka-statistik">{rupiah(totalBelumLunas)}</span>
          <span className="label-statistik">Total belum lunas</span>
        </div>
        <div className="kartu-statistik">
          <span className="angka-statistik">{daftar.length}</span>
          <span className="label-statistik">Pesanan dengan denda</span>
        </div>
      </div>

      {pesan && (
        <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
          {pesan.teks}
        </p>
      )}

      {memuat && <p role="status">Memuat data denda…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {!memuat && !galat && daftar.length === 0 && (
        <p className="pesan-kosong">Tidak ada denda yang perlu ditangani. Bagus.</p>
      )}

      {daftar.map((p) => {
        const belumLunas = (p.denda || []).filter((d) => d.status_pelunasan === 'BELUM_LUNAS');
        const semuaLunas = (p.denda || []).length > 0 && belumLunas.length === 0;

        return (
          <section key={p.order_id} className="blok kartu-denda">
            <div className="kepala-pesanan">
              <div>
                <h2>
                  <Link to={`/pesanan/${p.order_id}`}>{p.kode_pesanan || p.order_id}</Link>
                </h2>
                <p className="catatan-kecil">
                  {p.pelanggan} · dikembalikan {tanggal(p.updated_at)}
                </p>
              </div>
              <span className={kelasStatus(p.status)}>{labelStatus(p.status)}</span>
            </div>

            <table className="tabel">
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th>Keterangan</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(p.denda || []).map((d) => (
                  <tr key={d.penalty_id}>
                    <td>{d.tipe === 'DENDA_KETERLAMBATAN' ? 'Denda keterlambatan' : 'Ganti rugi'}</td>
                    <td>
                      {d.tipe === 'DENDA_KETERLAMBATAN'
                        ? `Terlambat ${d.durasi_terlambat_menit} menit`
                        : d.alasan_penyesuaian || '-'}
                      {d.disesuaikan_oleh && (
                        <span className="catatan-kecil"> · disesuaikan</span>
                      )}
                    </td>
                    <td>{rupiah(d.nominal)}</td>
                    <td>
                      <span
                        className={
                          d.status_pelunasan === 'LUNAS'
                            ? 'lencana-status selesai'
                            : 'lencana-status menunggu'
                        }
                      >
                        {d.status_pelunasan === 'LUNAS' ? 'Lunas' : 'Belum lunas'}
                      </span>
                    </td>
                    <td>
                      {d.status_pelunasan === 'BELUM_LUNAS' ? (
                        <button
                          type="button"
                          className="tombol-kecil"
                          disabled={sedangProses === d.penalty_id}
                          onClick={() => lunaskan(d.penalty_id, d.nominal)}
                        >
                          {sedangProses === d.penalty_id ? '…' : 'Tandai lunas'}
                        </button>
                      ) : (
                        <span className="catatan-kecil">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="total-besar">
              Total denda: {rupiah((p.denda || []).reduce((j, d) => j + Number(d.nominal), 0))}
            </p>

            {p.status === 'DIKEMBALIKAN' && (
              <>
                {semuaLunas ? (
                  <button
                    type="button"
                    className="tombol-utama"
                    disabled={sedangProses === p.order_id}
                    onClick={() => selesaikan(p.order_id)}
                  >
                    {sedangProses === p.order_id ? 'Memproses…' : 'Selesaikan pesanan'}
                  </button>
                ) : (
                  <p className="catatan-penting">
                    Pesanan tidak dapat diselesaikan sebelum {belumLunas.length} denda dilunasi.
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

// ─── Tarif ────────────────────────────────────────────────────────────────────

function BagianTarif() {
  const [tarif, setTarif] = useState([]);
  const [items, setItems] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);

  // Formulir tarif baru.
  const [formulir, setFormulir] = useState({ tipe: 'DENDA_PER_JAM', item_id: '', nominal: '' });
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const [hasilTarif, hasilItems] = await Promise.all([
        api.denda.tarif(),
        api.inventaris.alat(),
      ]);
      setTarif(hasilTarif.data);
      setItems(hasilItems.data);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function simpan(e) {
    e.preventDefault();
    setPesan(null);
    setMenyimpan(true);

    try {
      await api.denda.simpanTarif({
        tipe: formulir.tipe,
        // Ganti rugi tertentu wajib menyebut alatnya; denda waktu tidak.
        item_id: formulir.tipe === 'GANTI_RUGI_DEFAULT' && formulir.item_id ? Number(formulir.item_id) : undefined,
        nominal: Number(formulir.nominal),
      });
      setPesan({
        jenis: 'sukses',
        teks: 'Tarif disimpan. Tarif ini berlaku untuk denda yang dibuat setelah sekarang.',
      });
      setFormulir({ tipe: formulir.tipe, item_id: '', nominal: '' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <div className="kotak-peringatan">
        <p>
          Mengubah tarif <strong>tidak</strong> mengubah denda yang sudah tercatat pada pesanan
          lama. Nominal denda disalin saat denda dibuat, sehingga riwayat tetap dapat
          dipertanggungjawabkan.
        </p>
      </div>

      {pesan && (
        <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
          {pesan.teks}
        </p>
      )}

      {memuat && <p role="status">Memuat tarif…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {tarif.length > 0 && (
        <table className="tabel">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Berlaku untuk</th>
              <th>Nominal</th>
              <th>Terakhir diperbarui</th>
            </tr>
          </thead>
          <tbody>
            {tarif.map((t) => (
              <tr key={t.rate_id}>
                <td>{t.tipe.replace(/_/g, ' ')}</td>
                <td>{t.item_nama || <em>Semua alat</em>}</td>
                <td>{rupiah(t.nominal)}</td>
                <td>{t.updated_at ? tanggal(t.updated_at) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!memuat && tarif.length === 0 && (
        <p className="pesan-kosong">
          Belum ada tarif denda yang ditetapkan. Tanpa tarif, sistem tidak dapat menghitung denda
          keterlambatan maupun ganti rugi.
        </p>
      )}

      <section className="blok">
        <h2>Tetapkan tarif</h2>
        <form onSubmit={simpan} className="formulir formulir-sebaris">
          <label>
            Jenis tarif
            <select
              value={formulir.tipe}
              onChange={(e) => setFormulir({ ...formulir, tipe: e.target.value })}
            >
              <option value="DENDA_PER_JAM">Denda per jam (keterlambatan)</option>
              <option value="DENDA_PER_HARI">Denda per hari (keterlambatan)</option>
              <option value="GANTI_RUGI_DEFAULT">Ganti rugi bawaan</option>
            </select>
          </label>

          {/* Alat hanya relevan untuk ganti rugi: satu tenda dan satu kompor bisa
              punya nilai ganti rugi yang sangat berbeda. */}
          {formulir.tipe === 'GANTI_RUGI_DEFAULT' && (
            <label>
              Alat
              <select
                value={formulir.item_id}
                onChange={(e) => setFormulir({ ...formulir, item_id: e.target.value })}
              >
                <option value="">Semua alat (bawaan)</option>
                {items.map((a) => (
                  <option key={a.item_id} value={a.item_id}>
                    {a.nama}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Nominal (Rp)
            <input
              type="number"
              min="0"
              step="500"
              value={formulir.nominal}
              onChange={(e) => setFormulir({ ...formulir, nominal: e.target.value })}
              placeholder="cth. 50000"
              required
            />
          </label>

          <button type="submit" className="tombol-utama" disabled={menyimpan}>
            {menyimpan ? 'Menyimpan…' : 'Simpan tarif'}
          </button>
        </form>
      </section>
    </>
  );
}
