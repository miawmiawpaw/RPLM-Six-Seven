import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Konteks keranjang — ADR-17.
 *
 * Keranjang hidup di localStorage, bukan di server. Alasannya: keranjang bukan
 * pesanan, dan menahan stok sebelum checkout akan mengunci alat yang mungkin tidak
 * jadi dipesan (lihat ADR-10 — penguncian baru terjadi saat checkout).
 *
 * Tanggal sewa disimpan bersama keranjang karena ketersediaan hanya bermakna
 * dalam rentang tanggal tertentu (ADR-02).
 */

const KUNCI_KERANJANG = 'rac_keranjang';
const KonteksKeranjang = createContext(null);

function muatAwal() {
  try {
    const mentah = localStorage.getItem(KUNCI_KERANJANG);
    if (!mentah) return { baris: [], tanggalMulai: '', tanggalSelesai: '' };

    const data = JSON.parse(mentah);
    return {
      baris: Array.isArray(data.baris) ? data.baris : [],
      tanggalMulai: data.tanggalMulai || '',
      tanggalSelesai: data.tanggalSelesai || '',
    };
  } catch {
    // Data rusak tidak boleh membuat aplikasi gagal dimuat.
    localStorage.removeItem(KUNCI_KERANJANG);
    return { baris: [], tanggalMulai: '', tanggalSelesai: '' };
  }
}

export function PenyediaKeranjang({ children }) {
  const awal = useMemo(muatAwal, []);
  const [baris, setBaris] = useState(awal.baris);
  const [tanggalMulai, setTanggalMulai] = useState(awal.tanggalMulai);
  const [tanggalSelesai, setTanggalSelesai] = useState(awal.tanggalSelesai);

  useEffect(() => {
    localStorage.setItem(KUNCI_KERANJANG, JSON.stringify({ baris, tanggalMulai, tanggalSelesai }));
  }, [baris, tanggalMulai, tanggalSelesai]);

  /** Kunci unik per baris: alat dan paket tidak boleh bertabrakan id-nya. */
  const buatKunci = (tipe, id) => `${tipe}:${id}`;

  const tambah = useCallback((entri) => {
    const kunciBaru = buatKunci(entri.tipe, entri.id);
    setBaris((sebelumnya) => {
      const adaIndex = sebelumnya.findIndex((b) => buatKunci(b.tipe, b.id) === kunciBaru);

      if (adaIndex >= 0) {
        // Menambah alat yang sudah ada cukup menaikkan kuantitas.
        const disalin = [...sebelumnya];
        disalin[adaIndex] = {
          ...disalin[adaIndex],
          kuantitas: disalin[adaIndex].kuantitas + (entri.kuantitas || 1),
        };
        return disalin;
      }

      return [...sebelumnya, { ...entri, kuantitas: entri.kuantitas || 1 }];
    });
  }, []);

  const ubahKuantitas = useCallback((tipe, id, kuantitas) => {
    setBaris((sebelumnya) =>
      sebelumnya
        .map((b) =>
          b.tipe === tipe && String(b.id) === String(id) ? { ...b, kuantitas: Math.max(0, kuantitas) } : b
        )
        // Kuantitas 0 berarti pengguna mengosongkan isian angka — hapus barisnya.
        .filter((b) => b.kuantitas > 0)
    );
  }, []);

  const hapus = useCallback((tipe, id) => {
    setBaris((sebelumnya) => sebelumnya.filter((b) => !(b.tipe === tipe && String(b.id) === String(id))));
  }, []);

  const kosongkan = useCallback(() => {
    setBaris([]);
    setTanggalMulai('');
    setTanggalSelesai('');
  }, []);

  const nilai = useMemo(
    () => ({
      baris,
      tanggalMulai,
      tanggalSelesai,
      setTanggalMulai,
      setTanggalSelesai,
      tambah,
      ubahKuantitas,
      hapus,
      kosongkan,
      jumlahBaris: baris.length,
      totalItem: baris.reduce((jumlah, b) => jumlah + b.kuantitas, 0),
      kosong: baris.length === 0,
      /** Perkiraan biaya; harga final dihitung backend saat checkout (ADR-04). */
      perkiraanTotal: baris.reduce((jumlah, b) => jumlah + Number(b.harga || 0) * b.kuantitas, 0),
      siapCheckout: baris.length > 0 && Boolean(tanggalMulai) && Boolean(tanggalSelesai),
    }),
    [baris, tanggalMulai, tanggalSelesai, tambah, ubahKuantitas, hapus, kosongkan]
  );

  return <KonteksKeranjang.Provider value={nilai}>{children}</KonteksKeranjang.Provider>;
}

export function useKeranjang() {
  const konteks = useContext(KonteksKeranjang);
  if (!konteks) {
    throw new Error('useKeranjang harus dipakai di dalam <PenyediaKeranjang>.');
  }
  return konteks;
}

/** Konversi keranjang ke bentuk yang diterima POST /api/orders. */
export function keranjangKeBarisPesanan(baris) {
  return baris.map((b) =>
    b.tipe === 'ITEM'
      ? { tipe: 'ITEM', item_id: Number(b.id), kuantitas: b.kuantitas }
      : { tipe: 'BUNDLE', bundle_id: Number(b.id), kuantitas: b.kuantitas }
  );
}
