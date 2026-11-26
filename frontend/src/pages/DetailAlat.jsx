import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useKeranjang } from '../context/CartContext';
import { rupiah, hariIniIso, durasiHari } from '../utils/format';
import PemilihTanggal from '../components/PemilihTanggal';
/**
 * Detail alat — REQ-4.2.4, REQ-4.2.5.
 *
 * Ketersediaan hanya bermakna dalam rentang tanggal, jadi rentang dipilih di sini
 * dan dipakai untuk memeriksa sisa unit sebelum menambahkan ke keranjang.
 */
export default function DetailAlat() {
  const { itemId } = useParams();
  const [parameter] = useSearchParams();
  const navigate = useNavigate();
  const { masukAkun } = useAuth();
  const { tambah, totalItem } = useKeranjang();

  const [alat, setAlat] = useState(null);
  const [mulai, setMulai] = useState(parameter.get('mulai') || '');
  const [selesai, setSelesai] = useState(parameter.get('selesai') || '');
  const [kuantitas, setKuantitas] = useState(1);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [fotoAktif, setFotoAktif] = useState(0);

  // Ambil ulang detail setiap rentang tanggal berubah, karena backend menghitung
  // ketersediaan saat kueri (ADR-02) dan mengirimnya bersama detail alat.
  useEffect(() => {
    let dibatalkan = false;
    setMemuat(true);
    setGalat(null);

    api.katalog
      .detailAlat(itemId, { mulai, selesai })
      .then((hasil) => {
        if (!dibatalkan) setAlat(hasil.data.item);
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
  }, [itemId, mulai, selesai]);

  const punyaRentang = Boolean(mulai && selesai);
  const hari = durasiHari(mulai, selesai);
  const sisaTersedia = alat?.tersedia ?? null;
  const melebihiStok = punyaRentang && sisaTersedia !== null && kuantitas > sisaTersedia;

  function tanganiTambah() {
    setPesan(null);

    if (!punyaRentang) {
      setPesan({ jenis: 'galat', teks: 'Pilih tanggal mulai dan selesai terlebih dahulu.' });
      return;
    }
    if (alat.status_kondisi !== 'TERSEDIA') {
      setPesan({ jenis: 'galat', teks: 'Alat ini sedang tidak dapat disewakan.' });
      return;
    }
    if (melebihiStok) {
      setPesan({ jenis: 'galat', teks: `Hanya ${sisaTersedia} unit tersedia pada tanggal tersebut.` });
      return;
    }

    tambah({
      tipe: 'ITEM',
      id: alat.item_id,
      nama: alat.nama,
      harga: alat.tarif_harian,
      kuantitas,
    });

    setPesan({ jenis: 'sukses', teks: 'Ditambahkan ke keranjang.' });
  }

  if (memuat) return <section className="halaman"><p role="status">Memuat…</p></section>;
  if (galat) {
    return (
      <section className="halaman">
        <p className="pesan-galat">{galat}</p>
        <Link to="/katalog">Kembali ke katalog</Link>
      </section>
    );
  }
  if (!alat) return null;

  const foto = (alat.media || []).filter((m) => m.tipe === 'FOTO');
  const video = (alat.media || []).filter((m) => m.tipe === 'VIDEO');
  const sedia = alat.status_kondisi === 'TERSEDIA';
  const maks = sisaTersedia ?? alat.stok_fisik ?? 99;
  const subtotal = alat.tarif_harian * kuantitas * hari;
  const kembali = parameter.toString() ? `/katalog?${parameter}` : '/katalog';
  const indeksFoto = Math.min(fotoAktif, Math.max(foto.length - 1, 0));

  return (
    <section className="det">
      <nav className="remah" aria-label="Jejak halaman">
        <Link to={kembali}>Katalog</Link> / <span>{alat.nama}</span>
      </nav>

      <div className="det-tata">
        <div className="det-kiri">
          <div className="det-galeri">
            {foto.length > 0 ? (
              <>
                <div className="det-foto">
                  <img src={foto[indeksFoto].url} alt={alat.nama} width="1200" height="800" />
                  {foto.length > 1 && (
                    <span className="det-hitung">
                      Gambar {indeksFoto + 1} / {foto.length}
                    </span>
                  )}
                </div>
                {foto.length > 1 && (
                  <ul className="det-mini">
                    {foto.map((m, n) => (
                      <li key={m.url}>
                        <button
                          type="button"
                          aria-label={`Tampilkan foto ${n + 1}`}
                          aria-pressed={n === indeksFoto}
                          onClick={() => setFotoAktif(n)}
                        >
                          <img src={m.url} alt="" width="160" height="107" loading="lazy" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="det-foto det-foto-kosong" role="img" aria-label="Belum ada foto">
                Belum ada foto
              </div>
            )}
          </div>

          <section className="det-kartu" aria-labelledby="det-info">
            <h2 id="det-info">Informasi alat</h2>
            <dl className="det-spek">
              <div>
                <dt>Kategori</dt>
                <dd>{alat.kategori}</dd>
              </div>
              {alat.merk && (
                <div>
                  <dt>Merek</dt>
                  <dd>{alat.merk}</dd>
                </div>
              )}
              <div>
                <dt>Kode barang</dt>
                <dd>{alat.kode_barang}</dd>
              </div>
              <div>
                <dt>Stok keseluruhan</dt>
                <dd>{alat.stok_fisik} unit</dd>
              </div>
            </dl>
            {video.length > 0 && (
              <p className="det-video">
                {video.map((m, n) => (
                  <a key={m.url} href={m.url} target="_blank" rel="noreferrer">
                    Tonton video alat{video.length > 1 ? ` ${n + 1}` : ''}
                  </a>
                ))}
              </p>
            )}
          </section>

          <section className="det-kartu det-inspeksi" aria-labelledby="det-inspeksi">
            <h2 id="det-inspeksi">Saat serah-terima dan pengembalian</h2>
            <p>Petugas memeriksa alat bersama Anda dengan checklist, lalu hasilnya dicatat pada pesanan.</p>
            <ul>
              <li>
                <strong>Kelengkapan</strong>
                <span>Semua bagian alat dihitung bersama petugas.</span>
              </li>
              <li>
                <strong>Kondisi fisik</strong>
                <span>Kerusakan dicatat sebelum dan sesudah sewa.</span>
              </li>
              <li>
                <strong>Kebersihan</strong>
                <span>Alat dikembalikan dalam keadaan bersih.</span>
              </li>
            </ul>
          </section>
        </div>

        <aside className="det-kanan" aria-label="Pemesanan">
          <div className="det-kartu det-pesan">
            <div className="det-lencana-baris">
              <span className="det-lencana">ITEM SATUAN</span>
              <span className={sedia ? 'det-status' : 'det-status det-status-habis'}>
                {sedia ? 'Tersedia' : 'Tidak dapat disewa'}
              </span>
            </div>

            <h1>{alat.nama}</h1>
            <p className="det-sub">
              {alat.kategori}
              {alat.merk ? ` · ${alat.merk}` : ''}
            </p>

            <div className="det-harga">
              <span>Biaya rental reguler</span>
              <strong>
                {rupiah(alat.tarif_harian)} <small>/ hari</small>
              </strong>
            </div>

            <h2 className="det-label">PERIODE SEWA</h2>
            <PemilihTanggal
              mulai={mulai}
              selesai={selesai}
              minMulai={hariIniIso()}
              onBerubah={({ mulai: m, selesai: s }) => {
                setMulai(m);
                setSelesai(s);
              }}
            />
            <p className="det-bantu">
              {punyaRentang
                ? `${hari} hari · ${
                    sisaTersedia !== null
                      ? `${sisaTersedia} dari ${alat.stok_fisik} unit tersedia`
                      : 'ketersediaan belum diketahui'
                  }`
                : 'Pilih tanggal untuk melihat ketersediaan.'}
            </p>

            <div className="det-jumlah">
              <div>
                <span id="det-jumlah-label" className="det-label">
                  JUMLAH UNIT
                </span>
                <small>Maks. {maks} unit</small>
              </div>
              <div className="det-stepper" role="group" aria-labelledby="det-jumlah-label">
                <button
                  type="button"
                  aria-label="Kurangi jumlah"
                  disabled={kuantitas <= 1}
                  onClick={() => setKuantitas((n) => Math.max(1, n - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  name="kuantitas"
                  inputMode="numeric"
                  min="1"
                  max={maks}
                  value={kuantitas}
                  aria-label="Jumlah unit"
                  onChange={(e) => setKuantitas(Math.max(1, Number(e.target.value) || 1))}
                />
                <button
                  type="button"
                  aria-label="Tambah jumlah"
                  disabled={kuantitas >= maks}
                  onClick={() => setKuantitas((n) => Math.min(maks, n + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <h2 className="det-label">RINCIAN BIAYA</h2>
            <dl className="det-rincian">
              <div>
                <dt>
                  Subtotal ({kuantitas} unit{punyaRentang ? ` × ${hari} hari` : ''})
                </dt>
                <dd>{punyaRentang ? rupiah(subtotal) : '—'}</dd>
              </div>
              <div className="det-total">
                <dt>Total estimasi sewa</dt>
                <dd>{punyaRentang ? rupiah(subtotal) : '—'}</dd>
              </div>
            </dl>
            <p className="det-bantu">Harga final dihitung sistem saat checkout.</p>

            <button type="button" className="tombol-utama det-aksi" onClick={tanganiTambah} disabled={!sedia}>
              Masukkan ke Keranjang
            </button>
            {totalItem > 0 && (
              <button type="button" className="det-aksi det-aksi-garis" onClick={() => navigate('/keranjang')}>
                Lihat Keranjang ({totalItem})
              </button>
            )}

            <div aria-live="polite">
              {pesan && (
                <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'}>{pesan.teks}</p>
              )}
            </div>

            {!masukAkun && (
              <p className="det-bantu">
                Anda dapat mengisi keranjang tanpa masuk. Anda akan diminta masuk saat checkout.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
