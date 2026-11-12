/**
 * Pemilih rentang tanggal sewa — dipakai katalog, detail alat, dan keranjang.
 *
 * Tanggal selesai TIDAK BOLEH lebih awal dari tanggal mulai (FR-013). Batas itu
 * ditegakkan di sini dengan atribut `min` dan diperiksa ulang di backend — validasi
 * HTML saja dapat dilewati.
 */
export default function PemilihTanggal({ mulai, selesai, minMulai, onBerubah }) {
  function ubahMulai(nilai) {
    // Bila tanggal selesai kini mendahului tanggal mulai, ikutkan tanggal mulai
    // sebagai tanggal selesai agar pengguna tidak melihat kombinasi tidak sah.
    const selesaiBaru = selesai && selesai < nilai ? nilai : selesai;
    onBerubah({ mulai: nilai, selesai: selesaiBaru });
  }

  function ubahSelesai(nilai) {
    onBerubah({ mulai, selesai: nilai });
  }

  return (
    <div className="pemilih-tanggal">
      <label>
        Mulai
        <input
          type="date"
          value={mulai}
          min={minMulai}
          onChange={(e) => ubahMulai(e.target.value)}
          required
        />
      </label>

      <label>
        Selesai
        <input
          type="date"
          value={selesai}
          min={mulai || minMulai}
          onChange={(e) => ubahSelesai(e.target.value)}
          required
        />
      </label>
    </div>
  );
}
