import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  Bed,
  CalendarBlank,
  CalendarCheck,
  CaretDown,
  Check,
  CookingPot,
  Eye,
  EyeSlash,
  Headset,
  List,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCartSimple,
  Tag,
  Tent,
  X,
} from '@phosphor-icons/react';

/**
 * Set ikon tunggal aplikasi (Phosphor, gaya "regular").
 *
 * Aturan agar tetap konsisten:
 *  - satu keluarga dan satu ketebalan garis; jangan mencampur ikon dari pustaka lain
 *  - ukuran hanya dari token: sm 16 (di dalam teks/kolom), md 20 (tombol), lg 24 (kotak ikon kecil), xl 32 (kotak ikon besar)
 *  - ikon selalu dekoratif (aria-hidden); tombol ikon wajib memberi aria-label sendiri
 *  - jangan memakai karakter Unicode (← → ✓ × +) sebagai ikon
 */
const UKURAN = { sm: 16, md: 20, lg: 24, xl: 32 };

function buat(Komponen) {
  return function Ikon({ ukuran = 'md', ...sisa }) {
    return <Komponen size={UKURAN[ukuran]} weight="regular" aria-hidden="true" {...sisa} />;
  };
}

export const IkonKeranjang = buat(ShoppingCartSimple);
export const IkonMenu = buat(List);
export const IkonTutup = buat(X);
export const IkonPanahBawah = buat(CaretDown);
export const IkonPanahKiri = buat(ArrowLeft);
export const IkonPanahKanan = buat(ArrowRight);
export const IkonMata = buat(Eye);
export const IkonMataCoret = buat(EyeSlash);
export const IkonCentang = buat(Check);
export const IkonKalender = buat(CalendarBlank);
export const IkonKalenderCentang = buat(CalendarCheck);
export const IkonTambah = buat(Plus);
export const IkonKurang = buat(Minus);
export const IkonTenda = buat(Tent);
export const IkonRansel = buat(Backpack);
export const IkonPanci = buat(CookingPot);
export const IkonKasur = buat(Bed);
export const IkonPerisai = buat(ShieldCheck);
export const IkonHarga = buat(Tag);
export const IkonHeadset = buat(Headset);
