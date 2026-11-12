import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKeranjang } from '../context/CartContext';
import { api } from '../api/client';
import { rupiah, hariIniIso, durasiHari } from '../utils/format';
import PemilihTanggal from '../components/PemilihTanggal';

/**
 * Keranjang — REQ-4.2.7.
 *
 * Sebelum mengizinkan checkout, sisa stok untuk rentang tanggal yang dipilih
 * diperiksa ulang ke server. Keranjang dapat sudah lama tersimpan, dan stok bisa
 * berubah sejak alat ditambahkan (ADR-02 — ketersediaan dihitung saat kueri).
 */
export default function Keranjang() {
  const {
    baris,
    tanggalMulai,
    tanggalSelesai,
    setTanggalMulai,
    setTanggalSelesai,
    ubahKuantitas,
    hapus,
    kosongkan,
    totalItem,
    perkiraanTotal,
    siapCheckout,
  } = useKeranjang();

  const navigate = useNavigate();
  const [galat, setGalat] = useState(null);
  const [kekurangan, setKekurangan] = useState([]);
  const [memeriksa, setMemeriksa] = useState(false);

  const hari = durasiHari(tanggalMulai, tanggalSelesai);

  // Periksa ketersediaan setiap kali keranjang atau rentang tanggal berubah.
  useEffect(() => {
    if (!siapCheckout) {
      setKekurangan([]);
      return;
    }

    let dibatalkan = false;
    const itemIds = baris.filter((b) => b.tipe === 'ITEM').map((b) => b.id);

    if (itemIds.length === 0) {
      setKekurangan([]);
      return;
    }

    api.pesanan
      .periksaKetersediaan({ item_ids: itemIds.join(','), mulai: tanggalMulai, selesai: tanggalSelesai })
      .then((hasil) => {
        if (dibatalkan) return;

        // Bandingkan jumlah di keranjang dengan sisa yang dilaporkan server.
        const kurang = baris
          .filter((b) => b.tipe === 'ITEM')
          .map((b) => {
            const info = hasil.data.ketersediaan.find((k) => String(k.item_id) === String(b.id));
            const tersedia = info ? info.tersedia : 0;
            return b.kuantitas > tersedia ? { nama: b.nama, diminta: b.kuantitas, tersedia } : null;
          })
          .filter(Boolean);

        setKekurangan(kurang);
      })
      .catch(() => {
        // Kegagalan pemeriksaan tidak memblokir; backend tetap memvalidasi saat checkout.
        if (!dibatalkan) setKekurangan([]);
      });

    return () => {
      dibatalkan = true;
    };
  }, [baris, tanggalMulai, tanggalSelesai, siapCheckout]);

  function lanjutCheckout() {
    setGalat(null);

    if (!siapCheckout) {
      setGalat('Pilih tanggal mulai dan selesai terlebih dahulu.');
      return;
    }
    if (kekurangan.length > 0) {
      setGalat('Perbaiki jumlah alat yang melebihi stok sebelum melanjutkan.');
      return;
    }

    setMemeriksa(true);
    navigate('/checkout');
  }

  if (baris.length === 0) {
    return (
      <section className="halaman">
        <h1>Keranjang</h1>
        <p className="pesan-kosong">Keranjang Anda masih kosong.</p>
        <Link to="/katalog" className="tombol-utama">
          Lihat katalog
        </Link>
      </section>
    );
  }

  return (
    <section className="halaman">
      <h1>Keranjang</h1>
      <p className="catatan-kecil">{totalItem} unit dalam keranjang</p>

      <div className="blok-tanggal">
        <h2>Tanggal sewa</h2>
        <PemilihTanggal
          mulai={tanggalMulai}
          selesai={tanggalSelesai}
          minMulai={hariIniIso()}
          onBerubah={({ mulai, selesai }) => {
            setTanggalMulai(mulai);
            setTanggalSelesai(selesai);
          }}
        />
        {hari > 0 && <p>Durasi: {hari} hari</p>}
      </div>

      <table className="tabel">
        <thead>
          <tr>
            <th>Alat</th>
            <th>Tarif / hari</th>
            <th>Jumlah</th>
            <th>Subtotal</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => {
            const kurang = kekurangan.find((k) => k.nama === b.nama);
            return (
              <tr key={`${b.tipe}:${b.id}`} className={kurang ? 'baris-bermasalah' : ''}>
                <td>
                  {b.tipe === 'ITEM' ? (
                    <Link to={`/katalog/${b.id}`}>{b.nama}</Link>
                  ) : (
                    <span>{b.nama} (paket)</span>
                  )}
                  {kurang && (
                    <p className="pesan-galat kecil">
                      Hanya {kurang.tersedia} unit tersedia pada tanggal ini.
                    </p>
                  )}
                </td>
                <td>{rupiah(b.harga)}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={b.kuantitas}
                    onChange={(e) => ubahKuantitas(b.tipe, b.id, Number(e.target.value))}
                    aria-label={`Jumlah ${b.nama}`}
                  />
                </td>
                <td>{rupiah(b.harga * b.kuantitas * (hari || 1))}</td>
                <td>
                  <button
                    type="button"
                    className="tombol-hapus"
                    onClick={() => hapus(b.tipe, b.id)}
                    aria-label={`Hapus ${b.nama}`}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ringkasan-keranjang">
        {hari > 0 ? (
          <p className="total-besar">
            Perkiraan total: <strong>{rupiah(perkiraanTotal * hari)}</strong>
          </p>
        ) : (
          <p>Pilih tanggal sewa untuk melihat perkiraan total.</p>
        )}

        <p className="catatan-kecil">
          Nilai akhir dihitung ulang oleh server saat checkout, memakai tarif yang berlaku pada
          saat itu.
        </p>

        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}

        <div className="aksi-keranjang">
          <button type="button" className="tombol-utama" onClick={lanjutCheckout} disabled={memeriksa}>
            Lanjut ke checkout
          </button>
          <button type="button" className="tombol-sekunder" onClick={kosongkan}>
            Kosongkan keranjang
          </button>
          <Link to="/katalog" className="tombol-sekunder">
            Tambah alat lain
          </Link>
        </div>
      </div>
    </section>
  );
}
