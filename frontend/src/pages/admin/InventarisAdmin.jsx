import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { rupiah } from '../../utils/format';

/**
 * Inventaris — REQ-4.3.2 .. REQ-4.3.9.
 *
 * Catatan tentang penghapusan: tombol hapus melakukan SOFT DELETE — alat tidak
 * dihapus dari basis data, hanya ditandai tidak aktif (ADR-05), karena alat yang
 * pernah disewa terhubung ke riwayat pesanan yang tidak boleh rusak.
 */
const STATUS_KONDISI = ['TERSEDIA', 'SEDANG_DISEWA', 'RUSAK', 'HILANG'];

export default function InventarisAdmin() {
  const [items, setItems] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [meta, setMeta] = useState({ total: 0, batas: 20 });
  const [cari, setCari] = useState('');
  const [saringKategori, setSaringKategori] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [sedangUbah, setSedangUbah] = useState(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const [hasilAlat, hasilKategori] = await Promise.all([
        api.inventaris.alat({ q: cari, kategori: saringKategori }),
        api.katalog.kategori(),
      ]);
      setItems(hasilAlat.data);
      setMeta(hasilAlat.meta || { total: hasilAlat.data.length, batas: hasilAlat.data.length || 20 });
      setKategori(hasilKategori.data);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setMemuat(false);
    }
  }, [cari, saringKategori]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function ubahKondisi(itemId, statusBaru) {
    setPesan(null);
    try {
      await api.inventaris.ubahKondisi(itemId, statusBaru);
      setPesan({ jenis: 'sukses', teks: 'Kondisi alat diperbarui.' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    }
  }

  async function tambahUnit(itemId) {
    setPesan(null);
    try {
      // Penambahan unit harus melewati jalur resmi agar audit tercatat (ADR-07).
      const alat = items.find((a) => a.item_id === itemId);
      await api.inventaris.ubahAlat(itemId, { stok_fisik: Number(alat.stok_fisik) + 1 });
      setPesan({ jenis: 'sukses', teks: 'Satu unit ditambahkan.' });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    }
  }

  async function nonaktifkan(itemId, nama) {
    // Soft delete tidak dapat dibatalkan lewat antarmuka ini, jadi konfirmasi dulu.
    const yakin = window.confirm(
      `Nonaktifkan "${nama}"? Alat tidak akan muncul di katalog, tetapi riwayat pesanannya tetap utuh.`
    );
    if (!yakin) return;

    setPesan(null);
    try {
      await api.inventaris.hapusAlat(itemId);
      setPesan({ jenis: 'sukses', teks: `"${nama}" dinonaktifkan.` });
      await muat();
    } catch (err) {
      setPesan({ jenis: 'galat', teks: err.message });
    }
  }

  return (
    <section className="halaman">
      <div className="kepala-detail">
        <h1>Inventaris</h1>
        <button type="button" className="tombol-sekunder" onClick={muat}>
          Muat ulang
        </button>
      </div>

      <div className="baris-filter">
        <label>
          Cari
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Nama atau kode barang…"
          />
        </label>
        <label>
          Kategori
          <select value={saringKategori} onChange={(e) => setSaringKategori(e.target.value)}>
            <option value="">Semua kategori</option>
            {kategori.map((k) => (
              <option key={k.category_id} value={k.category_id}>
                {k.nama}
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

      {memuat && <p role="status">Memuat inventaris…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {!memuat && !galat && items.length === 0 && (
        <p className="pesan-kosong">Tidak ada alat yang cocok.</p>
      )}

      {items.length > 0 && (
        <table className="tabel">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Kategori</th>
              <th>Tarif / hari</th>
              <th>Stok fisik</th>
              <th>Sedang keluar</th>
              <th>Kondisi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const menipis = Number(a.stok_fisik) <= Number(a.stok_minimum ?? 1);
              return (
                <tr key={a.item_id} className={menipis ? 'baris-perhatian' : ''}>
                  <td>{a.kode_barang}</td>
                  <td>
                    {a.nama}
                    {a.merk && <span className="catatan-kecil"> · {a.merk}</span>}
                  </td>
                  <td>{a.kategori}</td>
                  <td>{rupiah(a.tarif_harian)}</td>
                  <td>
                    {a.stok_fisik}
                    {menipis && <span className="tanda-perhatian" title="Stok menipis">!</span>}
                  </td>
                  <td>{a.sedang_keluar ?? 0}</td>
                  <td>
                    {sedangUbah === a.item_id ? (
                      <select
                        defaultValue={a.status_kondisi}
                        onChange={(e) => {
                          ubahKondisi(a.item_id, e.target.value);
                          setSedangUbah(null);
                        }}
                        onBlur={() => setSedangUbah(null)}
                        aria-label={`Ubah kondisi ${a.nama}`}
                      >
                        {STATUS_KONDISI.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        className="tautan-kondisi"
                        onClick={() => setSedangUbah(a.item_id)}
                        title="Klik untuk mengubah kondisi"
                      >
                        {a.status_kondisi}
                      </button>
                    )}
                  </td>
                  <td className="sel-aksi">
                    <button
                      type="button"
                      className="tombol-kecil"
                      onClick={() => tambahUnit(a.item_id)}
                      title="Menambah satu unit fisik"
                    >
                      +1 unit
                    </button>
                    <button
                      type="button"
                      className="tombol-hapus"
                      onClick={() => nonaktifkan(a.item_id, a.nama)}
                    >
                      Nonaktifkan
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="catatan-kecil">
        Menampilkan {items.length} dari {meta.total} alat. Alat yang dinonaktifkan tidak ditampilkan
        di sini maupun di katalog.
      </p>

      <section className="blok">
        <h2>Menambah alat baru</h2>
        <p>
          Formulir tambah alat (nama, kategori, tarif, stok awal, dan media) belum tersedia di
          antarmuka ini. Sementara itu, gunakan endpoint <code>POST /api/inventory/items</code> —
          atau minta petugas teknis menambahkannya langsung. Menuliskan formulir setengah jadi di
          sini akan lebih membingungkan daripada tidak ada.
        </p>
        <p className="catatan-kecil">
          Ini celah yang disadari, bukan kelalaian. Lihat catatan TODO pada berkas ini.
        </p>
      </section>
    </section>
  );
}
