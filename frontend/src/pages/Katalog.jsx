import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { rupiah, hariIniIso } from '../utils/format';
import PemilihTanggal from '../components/PemilihTanggal';

/**
 * Katalog dengan pencarian & penyaringan — REQ-4.2.1, REQ-4.2.2.
 *
 * Rentang tanggal disimpan di URL, bukan hanya di state, supaya hasil pencarian
 * dapat dibagikan dan bertahan saat halaman dimuat ulang.
 */
export default function Katalog() {
  const [parameter, setParameter] = useSearchParams();

  const kataKunci = parameter.get('q') || '';
  const kategori = parameter.get('kategori') || '';
  const mulai = parameter.get('mulai') || '';
  const selesai = parameter.get('selesai') || '';

  const [inputCari, setInputCari] = useState(kataKunci);
  const [kategoriList, setKategoriList] = useState([]);
  const [items, setItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [meta, setMeta] = useState({ halaman: 1, total: 0, batas: 12 });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  // Daftar kategori hanya perlu diambil sekali.
  useEffect(() => {
    api.katalog
      .kategori()
      .then((hasil) => setKategoriList(hasil.data))
      .catch(() => setKategoriList([]));
  }, []);

  // Ambil ulang setiap parameter berubah.
  useEffect(() => {
    let dibatalkan = false;
    setMemuat(true);
    setGalat(null);

    const kueri = { q: kataKunci, kategori, mulai, selesai, halaman: parameter.get('halaman') || 1 };

    Promise.all([api.katalog.alat(kueri), api.katalog.bundle({ mulai, selesai })])
      .then(([hasilAlat, hasilBundle]) => {
        if (dibatalkan) return;
        setItems(hasilAlat.data);
        setMeta(hasilAlat.meta || { halaman: 1, total: hasilAlat.data.length, batas: hasilAlat.data.length || 12 });
        setBundles(hasilBundle.data);
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
  }, [kataKunci, kategori, mulai, selesai, parameter]);

  /** Perbarui satu parameter tanpa menghapus parameter lain. */
  function ubahParameter(perubahan) {
    const berikutnya = new URLSearchParams(parameter);
    Object.entries(perubahan).forEach(([kunci, nilai]) => {
      if (nilai) berikutnya.set(kunci, nilai);
      else berikutnya.delete(kunci);
    });
    // Setiap perubahan filter mengembalikan ke halaman pertama — halaman 3 dari
    // hasil pencarian lama tidak bermakna untuk pencarian baru.
    if (!('halaman' in perubahan)) berikutnya.delete('halaman');
    setParameter(berikutnya);
  }

  function kirimCari(e) {
    e.preventDefault();
    ubahParameter({ q: inputCari });
  }

  const halamanSekarang = Number(meta.halaman) || 1;
  const jumlahHalaman = Math.max(1, Math.ceil(meta.total / meta.batas));

  return (
    <section className="halaman">
      <h1>Katalog Alat</h1>

      <form onSubmit={kirimCari} className="baris-cari" role="search">
        <label htmlFor="cari" className="label-cari">
          Cari alat
        </label>
        <input
          id="cari"
          type="search"
          value={inputCari}
          onChange={(e) => setInputCari(e.target.value)}
          placeholder="Nama atau merek alat…"
        />
        <button type="submit" className="tombol-utama">
          Cari
        </button>
      </form>

      <div className="baris-filter">
        <label>
          Kategori
          <select value={kategori} onChange={(e) => ubahParameter({ kategori: e.target.value })}>
            <option value="">Semua kategori</option>
            {kategoriList.map((k) => (
              <option key={k.category_id} value={k.category_id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>

        {/* Ketersediaan hanya dapat dihitung bila rentang tanggal dipilih (ADR-02). */}
        <PemilihTanggal
          mulai={mulai}
          selesai={selesai}
          minMulai={hariIniIso()}
          onBerubah={({ mulai: m, selesai: s }) => ubahParameter({ mulai: m, selesai: s })}
        />
      </div>

      {!mulai && !selesai && (
        <p className="catatan-info">
          Pilih tanggal sewa untuk melihat jumlah yang benar-benar tersedia. Tanpa tanggal, angka
          ketersediaan tidak ditampilkan.
        </p>
      )}

      {memuat && <p role="status">Memuat katalog…</p>}
      {galat && <p className="pesan-galat">{galat}</p>}

      {!memuat && !galat && (
        <>
          {bundles.length > 0 && (
            <div className="blok-paket">
              <h2>Paket Perlengkapan</h2>
              <ul className="daftar-kartu">
                {bundles.map((paket) => (
                  <li key={paket.bundle_id} className="kartu kartu-paket">
                    <h3>{paket.nama}</h3>
                    {paket.deskripsi && <p>{paket.deskripsi}</p>}
                    <p className="tarif">{rupiah(paket.harga_bundle)} / hari</p>
                    <ul className="komponen">
                      {paket.komponen.map((k) => (
                        <li key={k.item_id}>
                          {k.kuantitas}× {k.nama}
                        </li>
                      ))}
                    </ul>
                    {paket.tersedia !== null && (
                      <p className={paket.tersedia > 0 ? 'status-tersedia' : 'status-habis'}>
                        {paket.tersedia > 0 ? `${paket.tersedia} paket tersedia` : 'Tidak tersedia'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2>Alat Satuan</h2>

          {items.length === 0 ? (
            <p className="pesan-kosong">
              Tidak ada alat yang cocok dengan pencarian Anda. Coba kata kunci lain atau kosongkan
              filter.
            </p>
          ) : (
            <ul className="daftar-kartu">
              {items.map((alat) => (
                <li key={alat.item_id} className="kartu">
                  <h3>
                    <Link to={`/katalog/${alat.item_id}${parameter.toString() ? `?${parameter}` : ''}`}>
                      {alat.nama}
                    </Link>
                  </h3>
                  <p className="kategori-alat">{alat.kategori}</p>
                  {alat.merk && <p className="merk">{alat.merk}</p>}
                  <p className="tarif">{rupiah(alat.tarif_harian)} / hari</p>
                  <p className="catatan-kecil">Stok fisik: {alat.stok_fisik}</p>
                  {alat.status_kondisi !== 'TERSEDIA' && (
                    <p className="status-habis">Tidak dapat disewa ({alat.status_kondisi})</p>
                  )}
                </li>
              ))}
            </ul>
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
                Halaman {halamanSekarang} dari {jumlahHalaman}
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
        </>
      )}
    </section>
  );
}
