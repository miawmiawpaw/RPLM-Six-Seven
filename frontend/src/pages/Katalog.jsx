import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { rupiah, hariIniIso } from '../utils/format';
import PemilihTanggal from '../components/PemilihTanggal';
import { fotoPaket } from '../utils/fotoProduk';
import { useAuth, PERAN } from '../context/AuthContext';
import { useKeranjang } from '../context/CartContext';

/** Nomor halaman ringkas: 1 … sekarang-1 sekarang sekarang+1 … terakhir. */
function nomorHalaman(sekarang, total) {
  const set = new Set([1, total, sekarang - 1, sekarang, sekarang + 1].filter((n) => n >= 1 && n <= total));
  const urut = [...set].sort((a, b) => a - b);
  return urut.flatMap((n, i) => (i > 0 && n - urut[i - 1] > 1 ? ['…', n] : [n]));
}

const TAB = [
  ['semua', 'Semua Produk'],
  ['item', 'Item Satuan'],
  ['paket', 'Paket Sewa'],
];

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
  const tab = TAB.some(([k]) => k === parameter.get('tab')) ? parameter.get('tab') : 'semua';
  const mulai = parameter.get('mulai') || '';
  const selesai = parameter.get('selesai') || '';

  const [inputCari, setInputCari] = useState(kataKunci);
  const [kategoriList, setKategoriList] = useState([]);
  const [items, setItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [meta, setMeta] = useState({ halaman: 1, total: 0, batas: 12 });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  // Keranjang hanya untuk tamu dan pelanggan; tanggal sewa dipilih di halaman keranjang.
  const { masukAkun, peran } = useAuth();
  const { tambah } = useKeranjang();
  const bolehPesan = !masukAkun || peran === PERAN.PELANGGAN;
  const [baruDitambah, setBaruDitambah] = useState('');

  useEffect(() => {
    if (!baruDitambah) return undefined;
    const timer = setTimeout(() => setBaruDitambah(''), 1500);
    return () => clearTimeout(timer);
  }, [baruDitambah]);

  function tambahKeKeranjang(entri) {
    tambah({ ...entri, kuantitas: 1 });
    setBaruDitambah(`${entri.tipe}:${entri.id}`);
  }

  function tombolKeranjang(entri, aktif) {
    const kunci = `${entri.tipe}:${entri.id}`;
    return (
      <button type="button" className="landing-button kat-tombol" disabled={!aktif} onClick={() => tambahKeKeranjang(entri)}>
        {baruDitambah === kunci ? <>Ditambahkan <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 7.5 5.5 10.5 11.5 3.5" /></svg></> : '+ Keranjang'}
      </button>
    );
  }

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
  const tampilPaket = tab !== 'item' && bundles.length > 0;
  const tampilItem = tab !== 'paket';
  const queryDetail = parameter.toString() ? `?${parameter}` : '';

  return (
    <section className="kat">
      <span className="sr-only" role="status" aria-live="polite">
        {baruDitambah ? 'Ditambahkan ke keranjang.' : ''}
      </span>
      <header className="kat-kepala">
        <p className="landing-eyebrow">KATALOG PERLENGKAPAN</p>
        <h1>Katalog Alat</h1>
        <p>Pilih tanggal sewa untuk melihat jumlah yang benar-benar tersedia.</p>
      </header>

      <div className="kat-panel">
        <form onSubmit={kirimCari} className="kat-cari" role="search">
          <label htmlFor="cari" className="label-cari">
            Cari alat
          </label>
          <input
            id="cari"
            name="q"
            type="search"
            autoComplete="off"
            value={inputCari}
            onChange={(e) => setInputCari(e.target.value)}
            placeholder="Cari nama atau merek alat…"
          />
          <button type="submit" className="landing-button">
            Cari
          </button>
        </form>

        {/* Ketersediaan hanya dapat dihitung bila rentang tanggal dipilih (ADR-02). */}
        <PemilihTanggal
          mulai={mulai}
          selesai={selesai}
          minMulai={hariIniIso()}
          onBerubah={({ mulai: m, selesai: s }) => ubahParameter({ mulai: m, selesai: s })}
        />
      </div>

      <div className="kat-tab" role="group" aria-label="Jenis produk">
        {TAB.map(([kunci, label]) => (
          <button
            key={kunci}
            type="button"
            aria-pressed={tab === kunci}
            className={tab === kunci ? 'aktif' : ''}
            onClick={() => ubahParameter({ tab: kunci === 'semua' ? '' : kunci })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="kat-isi">
        <aside className="kat-filter" aria-label="Filter pencarian">
          <div className="kat-filter-kepala">
            <h2>Filter Pencarian</h2>
            {(kategori || mulai || selesai || kataKunci) && (
              <button
                type="button"
                onClick={() => {
                  setInputCari('');
                  setParameter(new URLSearchParams());
                }}
              >
                Reset
              </button>
            )}
          </div>
          <fieldset>
            <legend>KATEGORI</legend>
            <label>
              <input type="radio" name="kategori" checked={!kategori} onChange={() => ubahParameter({ kategori: '' })} />
              Semua kategori
            </label>
            {kategoriList.map((k) => (
              <label key={k.category_id}>
                <input
                  type="radio"
                  name="kategori"
                  checked={String(kategori) === String(k.category_id)}
                  onChange={() => ubahParameter({ kategori: String(k.category_id) })}
                />
                {k.nama}
              </label>
            ))}
          </fieldset>
        </aside>

        <div className="kat-hasil">
          {memuat && <p role="status">Memuat katalog…</p>}
          {galat && <p className="pesan-galat">{galat}</p>}

          {!memuat && !galat && (
            <>
              {tampilPaket && (
                <>
                  <div className="kat-judul">
                    <h2>Paket Sewa</h2>
                  </div>
                  <ul className="kat-grid">
                    {bundles.map((paket) => (
                      <li key={paket.bundle_id} className="kat-kartu">
                        <div className="kat-ubin">
                          <img src={fotoPaket(paket.nama)} alt="" loading="lazy" />
                          <span className="kat-lencana kat-lencana-gelap">Paket Hemat</span>
                        </div>
                        <small>BUNDLE KOMPLIT</small>
                        <h3>{paket.nama}</h3>
                        {paket.deskripsi && <p className="kat-ket">{paket.deskripsi}</p>}
                        <ul className="kat-chip">
                          {paket.komponen.map((k) => (
                            <li key={k.item_id}>
                              {k.kuantitas}× {k.nama}
                            </li>
                          ))}
                        </ul>
                        <div className="kat-harga">
                          <strong>{rupiah(paket.harga_bundle)}</strong>
                          <span>/ hari</span>
                        </div>
                        {paket.tersedia !== null && (
                          <span className={paket.tersedia > 0 ? 'landing-stock' : 'status-habis'}>
                            {paket.tersedia > 0 ? `${paket.tersedia} paket tersedia` : 'Tidak tersedia'}
                          </span>
                        )}
                        {bolehPesan && tombolKeranjang({ tipe: 'BUNDLE', id: paket.bundle_id, nama: paket.nama, harga: paket.harga_bundle }, paket.tersedia == null || paket.tersedia > 0)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {tampilItem && (
                <>
                  <div className="kat-judul">
                    <h2>Alat Satuan</h2>
                    <span className="kat-total">{meta.total} alat</span>
                  </div>

                  {items.length === 0 ? (
                    <p className="pesan-kosong">
                      Tidak ada alat yang cocok dengan pencarian Anda. Coba kata kunci lain atau kosongkan filter.
                    </p>
                  ) : (
                    <ul className="kat-grid">
                      {items.map((alat) => {
                        const dapatDisewa = alat.status_kondisi === 'TERSEDIA';
                        const foto = alat.media?.find((m) => m.tipe === 'FOTO')?.url;
                        return (
                          <li key={alat.item_id} className="kat-kartu">
                            <div className={foto ? 'kat-ubin' : 'kat-ubin kat-ubin-kosong'}>
                              {foto && <img src={foto} alt="" loading="lazy" />}
                              <span className="kat-lencana">
                                {alat.tersedia != null ? `Tersedia: ${alat.tersedia} unit` : `Stok: ${alat.stok_fisik} unit`}
                              </span>
                            </div>
                            <small>{alat.kategori}</small>
                            <h3>
                              <Link to={`/katalog/${alat.item_id}${queryDetail}`}>{alat.nama}</Link>
                            </h3>
                            {alat.merk && <p className="kat-ket">{alat.merk}</p>}
                            <div className="kat-harga">
                              <strong>{rupiah(alat.tarif_harian)}</strong>
                              <span>/ hari</span>
                            </div>
                            {dapatDisewa ? (
                              <div className="kat-aksi-baris">
                                <Link to={`/katalog/${alat.item_id}${queryDetail}`} className="kat-tombol-garis">
                                  Detail
                                </Link>
                                {bolehPesan && tombolKeranjang({ tipe: 'ITEM', id: alat.item_id, nama: alat.nama, harga: alat.tarif_harian }, alat.tersedia == null || alat.tersedia > 0)}
                              </div>
                            ) : (
                              <p className="status-habis">Tidak dapat disewa ({alat.status_kondisi})</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {jumlahHalaman > 1 && (
                    <nav className="kat-halaman" aria-label="Navigasi halaman">
                      <span>
                        Halaman {halamanSekarang} dari {jumlahHalaman}
                      </span>
                      <div>
                        <button
                          type="button"
                          disabled={halamanSekarang <= 1}
                          onClick={() => ubahParameter({ halaman: String(halamanSekarang - 1) })}
                        >
                          Sebelumnya
                        </button>
                        {nomorHalaman(halamanSekarang, jumlahHalaman).map((n, i) => n === '…' ? (
                          <span key={`titik-${i}`} aria-hidden="true">…</span>
                        ) : (
                          <button
                            key={n}
                            type="button"
                            className={n === halamanSekarang ? 'aktif' : ''}
                            aria-current={n === halamanSekarang ? 'page' : undefined}
                            onClick={() => ubahParameter({ halaman: String(n) })}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={halamanSekarang >= jumlahHalaman}
                          onClick={() => ubahParameter({ halaman: String(halamanSekarang + 1) })}
                        >
                          Berikutnya
                        </button>
                      </div>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
