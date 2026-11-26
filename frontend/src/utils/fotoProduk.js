/**
 * Foto paket sewa (bundle). Tabel Bundle belum punya kolom foto, jadi dipilih dari nama.
 * Foto alat satuan berasal dari ItemMedia (backend). Berkas ada di public/photos.
 * shortcut: pencocokan nama, ganti dengan kolom foto di tabel Bundle bila admin perlu mengunggah sendiri.
 */
export function fotoPaket(nama = '') {
  return /\b2 orang|duo|solo/i.test(nama) ? '/photos/tent2.jpg' : '/photos/tentfam.jpg';
}
