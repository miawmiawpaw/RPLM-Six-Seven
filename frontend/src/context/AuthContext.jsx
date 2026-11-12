import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, penyimpanan } from '../api/client';

/**
 * Konteks autentikasi — ADR-17.
 *
 * Peran disimpan sebagai string ('PELANGGAN' | 'PETUGAS' | 'ADMIN') dan
 * disamakan dengan nilai enum di basis data. Jangan membandingkan dengan
 * angka indeks — urutan enum dapat berubah tanpa peringatan.
 */

const KonteksAuth = createContext(null);

export const PERAN = Object.freeze({
  PELANGGAN: 'PELANGGAN',
  PETUGAS: 'PETUGAS',
  ADMIN: 'ADMIN',
});

/** Rute beranda untuk tiap peran — dipakai setelah masuk. */
export const BERANDA_PERAN = Object.freeze({
  [PERAN.PELANGGAN]: '/katalog',
  [PERAN.PETUGAS]: '/petugas/tugas',
  [PERAN.ADMIN]: '/admin/dasbor',
});

export function PenyediaAuth({ children }) {
  const [pengguna, setPengguna] = useState(() => penyimpanan.ambilPengguna());
  const [memuat, setMemuat] = useState(true);

  // Saat aplikasi dimuat, pastikan token yang tersimpan masih sah. Token bisa
  // saja sudah dicabut atau akunnya dinonaktifkan sejak sesi terakhir.
  useEffect(() => {
    let dibatalkan = false;

    async function periksaSesi() {
      if (!penyimpanan.ambilToken() && !penyimpanan.ambilRefresh()) {
        if (!dibatalkan) setMemuat(false);
        return;
      }

      try {
        const hasil = await api.auth.saya();
        if (!dibatalkan) {
          setPengguna(hasil.data.pengguna);
          penyimpanan.simpan({ pengguna: hasil.data.pengguna });
        }
      } catch {
        if (!dibatalkan) {
          penyimpanan.bersihkan();
          setPengguna(null);
        }
      } finally {
        if (!dibatalkan) setMemuat(false);
      }
    }

    periksaSesi();
    return () => {
      dibatalkan = true;
    };
  }, []);

  const masuk = useCallback(async (kredensial) => {
    const hasil = await api.auth.masuk(kredensial);
    penyimpanan.simpan({
      accessToken: hasil.data.accessToken,
      refreshToken: hasil.data.refreshToken,
      pengguna: hasil.data.pengguna,
    });
    setPengguna(hasil.data.pengguna);
    return hasil.data.pengguna;
  }, []);

  const daftar = useCallback(async (data) => {
    const hasil = await api.auth.daftar(data);
    return hasil.data;
  }, []);

  const keluar = useCallback(async () => {
    try {
      await api.auth.keluar();
    } catch {
      // Kegagalan di sisi server tidak boleh menghalangi pengguna keluar.
    } finally {
      penyimpanan.bersihkan();
      setPengguna(null);
    }
  }, []);

  const perbaruiProfil = useCallback(async (data) => {
    const hasil = await api.auth.perbaruiProfil(data);
    setPengguna(hasil.data.pengguna);
    penyimpanan.simpan({ pengguna: hasil.data.pengguna });
    return hasil.data.pengguna;
  }, []);

  const nilai = useMemo(
    () => ({
      pengguna,
      memuat,
      masukAkun: Boolean(pengguna),
      peran: pengguna?.role ?? null,
      // Dua pembantu berikut membuat pemeriksaan izin di komponen tetap ringkas.
      punyaPeran: (...daftar) => Boolean(pengguna && daftar.includes(pengguna.role)),
      masuk,
      daftar,
      keluar,
      perbaruiProfil,
    }),
    [pengguna, memuat, masuk, daftar, keluar, perbaruiProfil]
  );

  return <KonteksAuth.Provider value={nilai}>{children}</KonteksAuth.Provider>;
}

export function useAuth() {
  const konteks = useContext(KonteksAuth);
  if (!konteks) {
    throw new Error('useAuth harus dipakai di dalam <PenyediaAuth>.');
  }
  return konteks;
}
