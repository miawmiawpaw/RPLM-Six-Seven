import { labelStatus } from '../utils/format';

/**
 * Lini masa status pesanan — SRS §2.8.
 *
 * Delapan status diurutkan menurut alur normal. Dua status akhir yang menyimpang
 * (GAGAL_KEDALUWARSA dan DIBATALKAN) tidak ditampilkan sebagai langkah dalam
 * lintasan, melainkan sebagai keterangan akhir — menampilkannya sebagai langkah
 * akan menyiratkan pesanan berjalan terus, padahal justru berhenti.
 */
const LINTASAN = [
  { status: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Pembayaran' },
  { status: 'DIBAYAR', label: 'Dibayar' },
  { status: 'DISIAPKAN', label: 'Disiapkan' },
  { status: 'SEDANG_DISEWA', label: 'Sedang Disewa' },
  { status: 'DIKEMBALIKAN', label: 'Dikembalikan' },
  { status: 'SELESAI', label: 'Selesai' },
];

const STATUS_MENYIMPANG = ['GAGAL_KEDALUWARSA', 'DIBATALKAN'];

export default function LiniMasaStatus({ status }) {
  if (STATUS_MENYIMPANG.includes(status)) {
    return (
      <div className="lini-masa-berhenti">
        <p>
          Pesanan ini <strong>{labelStatus(status)}</strong>. Tidak ada langkah lanjutan yang
          tersisa.
        </p>
      </div>
    );
  }

  const indeksSekarang = LINTASAN.findIndex((l) => l.status === status);

  return (
    <ol className="lini-masa" aria-label="Tahapan pesanan">
      {LINTASAN.map((langkah, i) => {
        let keadaan = 'akan-datang';
        if (i < indeksSekarang) keadaan = 'selesai';
        if (i === indeksSekarang) keadaan = 'sekarang';

        return (
          <li key={langkah.status} className={`langkah ${keadaan}`}>
            <span className="penanda" aria-hidden="true">
              {i < indeksSekarang ? '✓' : i + 1}
            </span>
            <span className="label-langkah">{langkah.label}</span>
            {i === indeksSekarang && <span className="sr-only">(status saat ini)</span>}
          </li>
        );
      })}
    </ol>
  );
}
