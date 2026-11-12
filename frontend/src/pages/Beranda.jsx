import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { rupiah } from '../utils/format';

/**
 * Beranda — P-11..P-13 pada PRD §10.
 * NFR-001: halaman utama harus tampil ≤3 detik pada 4G, karena itu hanya satu
 * panggilan API yang dilakukan di sini dan tidak ada pustaka tambahan.
 *
 * Tata letak mengikuti wireframe Figma "Landing Page" (node 4:1373):
 *   Header → Hero (7/5 grid) → Keunggulan (4 kolom) → Kategori (4 kolom)
 *   → Paket Unggulan → Alur 4 langkah → Banner lokasi → Footer
 */

/* Konten statis mengikuti teks pada wireframe. Angka stok/unit pada wireframe
 * hanya contoh; bagian yang benar-benar dinamis (katalog & paket) tetap
 * diambil dari API agar halaman tidak menampilkan data palsu. */

const KEUNGGULAN = [
  {
    judul: 'Alat Bersih & Teruji',
    teks: 'Setiap tenda diangin-anginkan, dicuci higienis, dan pasak serta frame diuji kelenturannya sebelum serah terima kepada penyewa.',
  },
  {
    judul: 'Paket Bundle Hemat',
    teks: 'Kombinasi perlengkapan terkurasi siap guna untuk camping keluarga maupun pendakian gunung dengan penghematan biaya hingga 25%.',
  },
  {
    judul: 'Booking Pasti & Kunci Stok',
    teks: 'Kunci inventaris alat secara otomatis selama 24 jam saat order dibuat. Bebas risiko barang keduluan disewa pelanggan lain.',
  },
  {
    judul: 'Basecamp Aksesibilitas Tinggi',
    teks: 'Akses pengambilan jalur lingkar utama, area muat logistik luas, siap melayani penjemputan mandiri hingga jam operasional malam.',
  },
];

const LANGKAH_SEWA = [
  { judul: 'Pilih Tanggal & Alat', teks: 'Tentukan periode waktu sewa Anda dan masukkan unit tenda, carrier, atau paket bundle ke keranjang belanja.', tanda: 'Katalog Daring' },
  { judul: 'Booking & Bayar Daring', teks: 'Konfirmasi data identitas penyewa (KTP/SIM), pilih metode pembayaran, dan terima kode booking invoice otomatis.', tanda: 'Verifikasi Instan' },
  { judul: 'Cek Fisik di Basecamp', teks: 'Datangi gudang logistik, periksa kondisi alat bersama petugas melalui lembar checklist serah terima barang.', tanda: 'Quality Control Bersama' },
  { judul: 'Kembalikan & Selesai', teks: 'Kembalikan perlengkapan sesuai jadwal sewa. Cek verifikasi kondisi barang dan pengembalian jaminan identitas Anda.', tanda: 'Deposit Kembali' },
];

const INFO_LOKASI = [
  { label: 'Gudang Logistik', nilai: 'Jl. Rimba No. 42, Sleman, DI Yogyakarta (Depan Gapura Kampus Terpadu)' },
  { label: 'Jam Operasional', nilai: 'Senin - Minggu: 08.00 - 21.00 WIB (Termasuk Hari Libur Nasional)' },
  { label: 'Telepon / WhatsApp', nilai: '+62 812-3456-7890' },
];

export default function Beranda() {
  const [populer, setPopuler] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    let dibatalkan = false;

    api.katalog
      .populer()
      .then((hasil) => {
        if (!dibatalkan) setPopuler(hasil.data);
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
  }, []);

  return (
    <>
      <section className="beranda-hero">
        <div className="beranda-hero-kisi">
          <div className="beranda-hero-teks">
            <p className="beranda-eyebrow">Cek ketersediaan cepat</p>
            <h1>Sewa Perlengkapan Camping &amp; Pendakian Mudah &amp; Terstandarisasi</h1>
            <p className="beranda-hero-ringkas">
              Platform persewaan peralatan kegiatan luar ruang dengan inspeksi fisik berkala,
              garansi kebersihan sanitasi, dan konfirmasi ketersediaan instan tanpa jeda antrean.
            </p>
            <div className="beranda-hero-aksi">
              <Link to="/katalog" className="tombol-utama">
                Cek Ketersediaan
              </Link>
              <Link to="/katalog" className="tombol-sekunder">
                Lihat Katalog
              </Link>
            </div>
          </div>

          <div className="beranda-hero-visual" aria-hidden="true">
            <span className="beranda-penanda">A-01</span>
            <span className="beranda-penanda beranda-penanda-kanan">SCHEMATIC</span>
            <div className="beranda-visual-isi">
              <strong>Skematik Tata Letak Alat</strong>
              <span>Rasio Bounding Box 4:3</span>
            </div>
          </div>
        </div>

        <div className="beranda-metrik">
          <div className="beranda-metrik-butir">
            <strong>850+</strong>
            <span>Peralatan Terawat</span>
          </div>
          <div className="beranda-metrik-butir">
            <strong>100%</strong>
            <span>Higienis &amp; Dicuci</span>
          </div>
          <div className="beranda-metrik-butir">
            <strong>24 Jam</strong>
            <span>Konfirmasi Booking</span>
          </div>
        </div>
      </section>

      <section className="beranda-seksi beranda-seksi-pudar">
        <div className="beranda-kepala">
          <p className="beranda-eyebrow">Standar Operasional Prosedur</p>
          <h2>Keunggulan Layanan Sewa Terstandarisasi</h2>
          <p className="beranda-sub">Prinsip Mutu &amp; Keamanan Jalur Alam Bebas</p>
        </div>

        <ul className="beranda-kisi-4">
          {KEUNGGULAN.map((butir, i) => (
            <li key={butir.judul} className="beranda-kartu-fitur">
              <span className="beranda-nomor">{String(i + 1).padStart(2, '0')}</span>
              <h3>{butir.judul}</h3>
              <p>{butir.teks}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="beranda-seksi">
        <div className="beranda-kepala beranda-kepala-baris">
          <div>
            <p className="beranda-eyebrow">Klasifikasi Inventaris</p>
            <h2>Kategori Perlengkapan Populer</h2>
          </div>
          <Link to="/katalog" className="beranda-tautan-tegas">
            Lihat Seluruh Katalog
          </Link>
        </div>

        {memuat && <p role="status">Memuat…</p>}
        {galat && <p className="pesan-galat">Gagal memuat data: {galat}</p>}

        {!memuat && !galat && populer.length === 0 && (
          <p className="pesan-kosong">
            Belum ada data penyewaan. Data akan muncul setelah pesanan pertama tercatat.
          </p>
        )}

        {populer.length > 0 && (
          <ul className="daftar-kartu">
            {populer.map((alat) => (
              <li key={alat.item_id} className="kartu">
                <h3>
                  <Link to={`/katalog/${alat.item_id}`}>{alat.nama}</Link>
                </h3>
                <p className="tarif">{rupiah(alat.tarif_harian)} / hari</p>
                <p className="catatan-kecil">Disewa {alat.jumlah_disewa} kali</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="beranda-seksi beranda-seksi-pudar">
        <div className="beranda-kepala">
          <p className="beranda-eyebrow">Konfigurasi Siap Berkemah</p>
          <h2>Paket Sewa Unggulan</h2>
          <p className="beranda-sub">
            Dirancang praktis tanpa perlu mencocokkan peralatan satu per satu. Sudah termasuk
            kelengkapan pasak, tali, dan lampu tenda.
          </p>
        </div>

        {!memuat && populer.length > 0 && (
          <ul className="beranda-kisi-3">
            {populer.slice(0, 3).map((alat, i) => (
              <li key={alat.item_id} className="beranda-kartu-paket">
                {i === 1 && <span className="beranda-lencana-sorot">Paling Populer</span>}
                <div className="beranda-paket-gambar" aria-hidden="true">
                  <span>Bounding Box 4:3</span>
                </div>
                <h3>{alat.nama}</h3>
                <p className="beranda-paket-harga">
                  <strong>{rupiah(alat.tarif_harian)}</strong>
                  <span> / hari</span>
                </p>
                <Link to={`/katalog/${alat.item_id}`} className="tombol-utama lebar-penuh">
                  Lihat Detail Paket
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!memuat && populer.length === 0 && (
          <p className="pesan-kosong">Paket unggulan akan tampil setelah data tersedia.</p>
        )}
      </section>

      <section className="beranda-seksi">
        <div className="beranda-kepala">
          <p className="beranda-eyebrow">Alur Transaksi &amp; Pengambilan</p>
          <h2>Tahapan Mudah Menyewa Alat</h2>
        </div>

        <ol className="beranda-kisi-4 beranda-langkah">
          {LANGKAH_SEWA.map((langkah, i) => (
            <li key={langkah.judul} className="beranda-kartu-langkah">
              <span className="beranda-nomor">{String(i + 1).padStart(2, '0')}</span>
              <h3>{langkah.judul}</h3>
              <p>{langkah.teks}</p>
              <span className="beranda-tanda">{langkah.tanda}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="beranda-seksi beranda-seksi-pudar">
        <div className="beranda-kepala">
          <p className="beranda-eyebrow">Posko Logistik &amp; Serah Terima</p>
          <h2>Lokasi Basecamp &amp; Jam Operasional</h2>
        </div>

        <div className="beranda-lokasi">
          <div className="beranda-lokasi-teks">
            <dl className="daftar-data">
              {INFO_LOKASI.map((info) => (
                <div key={info.label}>
                  <dt>{info.label}</dt>
                  <dd>{info.nilai}</dd>
                </div>
              ))}
            </dl>
            <div className="aksi-hero">
              <Link to="/katalog" className="tombol-utama">
                Hubungi Petugas
              </Link>
              <Link to="/katalog" className="tombol-sekunder">
                Bantuan &amp; FAQ
              </Link>
            </div>
          </div>
          <div className="beranda-peta" aria-hidden="true">
            <span>Skematik Peta Lokasi</span>
          </div>
        </div>
      </section>
    </>
  );
}
