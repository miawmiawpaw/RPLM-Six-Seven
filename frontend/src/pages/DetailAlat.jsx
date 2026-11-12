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
  const { tambah } = useKeranjang();

  const [alat, setAlat] = useState(null);
  const [mulai, setMulai] = useState(parameter.get('mulai') || '');
  const [selesai, setSelesai] = useState(parameter.get('selesai') || '');
  const [kuantitas, setKuantitas] = useState(1);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);
  const [pesan, setPesan] = useState(null);

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

  return (
    <section className="halaman detail-alat">
      <nav className="remah">
        <Link to="/katalog">Katalog</Link> / <span>{alat.nama}</span>
      </nav>

      <div className="tata-detail">
        <div className="galeri">
          {alat.media && alat.media.length > 0 ? (
            <img src={alat.media[0].url} alt={alat.nama} className="gambar-utama" />
          ) : (
            <div className="tanpa-gambar" aria-hidden="true">
              Belum ada foto
            </div>
          )}
        </div>

        <div className="info-alat">
          <h1>{alat.nama}</h1>
          <p className="kategori-alat">{alat.kategori}</p>
          {alat.merk && <p className="merk">Merek: {alat.merk}</p>}
          <p className="kode">Kode barang: {alat.kode_barang}</p>
          <p className="tarif-besar">{rupiah(alat.tarif_harian)} / hari</p>

          <p className={alat.status_kondisi === 'TERSEDIA' ? 'status-tersedia' : 'status-habis'}>
            Kondisi: {alat.status_kondisi}
          </p>

          <div className="blok-sewa">
            <PemilihTanggal
              mulai={mulai}
              selesai={selesai}
              minMulai={hariIniIso()}
              onBerubah={({ mulai: m, selesai: s }) => {
                setMulai(m);
                setSelesai(s);
              }}
            />

            {punyaRentang && (
              <>
                <p>
                  Durasi: <strong>{hari} hari</strong>
                </p>
                <p>
                  Tersedia:{' '}
                  <strong className={sisaTersedia > 0 ? 'status-tersedia' : 'status-habis'}>
                    {sisaTersedia !== null ? `${sisaTersedia} unit` : 'tidak diketahui'}
                  </strong>{' '}
                  dari {alat.stok_fisik} unit
                </p>

                <label>
                  Jumlah
                  <input
                    type="number"
                    min="1"
                    max={sisaTersedia ?? 99}
                    value={kuantitas}
                    onChange={(e) => setKuantitas(Math.max(1, Number(e.target.value)))}
                  />
                </label>

                <p className="perkiraan">
                  Perkiraan total: <strong>{rupiah(alat.tarif_harian * kuantitas * hari)}</strong>
                </p>
              </>
            )}

            <button type="button" className="tombol-utama" onClick={tanganiTambah}>
              Tambah ke keranjang
            </button>

            {!masukAkun && (
              <p className="catatan-kecil">
                Anda dapat mengisi keranjang tanpa masuk. Anda akan diminta masuk saat checkout.
              </p>
            )}

            {pesan && (
              <p className={pesan.jenis === 'galat' ? 'pesan-galat' : 'pesan-sukses'} role="alert">
                {pesan.teks}
              </p>
            )}

            {alat.media && alat.media.length > 0 && (
              <button
                type="button"
                className="tombol-sekunder"
                onClick={() => navigate('/keranjang')}
              >
                Lihat keranjang
              </button>
            )}
          </div>
        </div>
      </div>

      {alat.media && alat.media.length > 1 && (
        <div className="galeri-tambahan">
          <h2>Media lainnya</h2>
          <ul className="daftar-media">
            {alat.media.slice(1).map((m) => (
              <li key={m.url}>
                {m.tipe === 'VIDEO' ? (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    Video alat
                  </a>
                ) : (
                  <img src={m.url} alt={`${alat.nama} — foto tambahan`} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
