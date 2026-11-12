const db = require('../../config/database');
const { STATUS_PESANAN } = require('../../constants');
const { formatTanggal } = require('../../utils/helpers');

/**
 * Modul laporan — REQ-4.6.1 s.d. REQ-4.6.5.
 * Seluruh fungsi di sini READ-ONLY terhadap data operasional; tidak ada penulisan
 * selain jejak audit pada lapisan rute.
 */

/**
 * Laporan penyewaan — REQ-4.6.1.
 *
 * @param {object} params
 * @param {string} params.dari 'YYYY-MM-DD'
 * @param {string} params.sampai 'YYYY-MM-DD'
 */
async function laporanPenyewaan({ dari, sampai }) {
  const dariFmt = formatTanggal(dari);
  const sampaiFmt = formatTanggal(sampai);

  const ringkasan = await db('Order')
    .whereBetween('tanggal_mulai', [dariFmt, sampaiFmt])
    .groupBy('status')
    .select('status')
    .count({ jumlah: 'order_id' })
    .sum({ total: 'total_akhir' });

  const [totalPendapatan] = await db('Order')
    .whereBetween('tanggal_mulai', [dariFmt, sampaiFmt])
    .whereIn('status', [STATUS_PESANAN.DIBAYAR, STATUS_PESANAN.DISIAPKAN, STATUS_PESANAN.SEDANG_DISEWA, STATUS_PESANAN.DIKEMBALIKAN, STATUS_PESANAN.SELESAI])
    .sum({ n: 'total_akhir' });

  const perHari = await db('Order')
    .whereBetween('tanggal_mulai', [dariFmt, sampaiFmt])
    .whereIn('status', [STATUS_PESANAN.DIBAYAR, STATUS_PESANAN.DISIAPKAN, STATUS_PESANAN.SEDANG_DISEWA, STATUS_PESANAN.DIKEMBALIKAN, STATUS_PESANAN.SELESAI])
    .groupBy('tanggal_mulai')
    .select('tanggal_mulai')
    .count({ jumlah_pesanan: 'order_id' })
    .sum({ pendapatan: 'total_akhir' })
    .orderBy('tanggal_mulai');

  // Daftar pesanan pada periode ini, dipakai tabel rincian di halaman laporan.
  const daftarPesanan = await db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .whereBetween('Order.tanggal_mulai', [dariFmt, sampaiFmt])
    .leftJoin('OrderItem', 'OrderItem.order_id', 'Order.order_id')
    .groupBy('Order.order_id', 'Order.kode_pesanan', 'Order.status', 'Order.total_akhir',
      'Order.tanggal_mulai', 'Order.tanggal_selesai', 'User.nama')
    .select(
      'Order.order_id',
      'Order.kode_pesanan',
      'Order.status',
      'Order.total_akhir',
      'Order.tanggal_mulai',
      'Order.tanggal_selesai',
      'User.nama as pelanggan'
    )
    .count({ jumlah_item: 'OrderItem.order_item_id' })
    .orderBy('Order.tanggal_mulai', 'desc');

  return {
    periode: { dari: dariFmt, sampai: sampaiFmt },
    total_pendapatan: Number(totalPendapatan.n) || 0,
    per_status: ringkasan.map((r) => ({
      status: r.status,
      jumlah: Number(r.jumlah),
      total: Number(r.total) || 0,
    })),
    per_hari: perHari.map((h) => ({
      tanggal: formatTanggal(h.tanggal_mulai),
      jumlah_pesanan: Number(h.jumlah_pesanan),
      pendapatan: Number(h.pendapatan) || 0,
    })),
    pesanan: daftarPesanan.map((p) => ({
      order_id: String(p.order_id),
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      jumlah_item: Number(p.jumlah_item),
      tanggal_mulai: formatTanggal(p.tanggal_mulai),
      tanggal_selesai: formatTanggal(p.tanggal_selesai),
      total_akhir: Number(p.total_akhir),
      status: p.status,
    })),
  };
}

/**
 * Laporan pemanfaatan alat — REQ-4.6.2.
 * Menghitung rasio hari-sewa terhadap hari tersedia pada periode.
 */
async function laporanPemanfaatan({ dari, sampai }) {
  const dariFmt = formatTanggal(dari);
  const sampaiFmt = formatTanggal(sampai);

  const baris = await db('StockReservation')
    .join('Item', 'Item.item_id', 'StockReservation.item_id')
    .where('StockReservation.tanggal_mulai', '<=', sampaiFmt)
    .where('StockReservation.tanggal_selesai', '>=', dariFmt)
    .whereIn('StockReservation.status', ['DIBAYAR', 'DISIAPKAN', 'SEDANG_DISEWA', 'DIKEMBALIKAN', 'SELESAI', 'TERPAKAI'])
    .groupBy('Item.item_id', 'Item.nama', 'Item.kode_barang', 'Item.stok_fisik')
    .select('Item.item_id', 'Item.nama', 'Item.kode_barang', 'Item.stok_fisik')
    .count({ jumlah_sewa: 'StockReservation.reservation_id' })
    .sum({ total_unit: 'StockReservation.kuantitas' })
    .orderBy('jumlah_sewa', 'desc');

  // Pendapatan per alat: dihitung dari OrderItem pada pesanan yang tidak
  // dibatalkan, dibatasi ke periode yang sama dengan tabel pemanfaatan.
  const pendapatanBaris = await db('OrderItem')
    .join('Order', 'Order.order_id', 'OrderItem.order_id')
    .where('OrderItem.tipe', 'ITEM')
    .whereNot('Order.status', STATUS_PESANAN.DIBATALKAN)
    .whereBetween('Order.created_at', [`${dariFmt} 00:00:00`, `${sampaiFmt} 23:59:59`])
    .groupBy('OrderItem.item_id')
    .select('OrderItem.item_id')
    .sum({ pendapatan: 'OrderItem.subtotal' });

  const petaPendapatan = new Map(
    pendapatanBaris.map((r) => [String(r.item_id), Number(r.pendapatan) || 0])
  );

  const totalHariPeriode = Math.max(
    1,
    Math.floor((new Date(sampaiFmt) - new Date(dariFmt)) / 86400000) + 1
  );

  const totalAlatAktif = await db('Item').where('is_aktif', true).count({ n: 'item_id' });

  const alat = baris.map((b) => {
    const totalHariTersedia = b.stok_fisik * totalHariPeriode;
    // Rasio pemanfaatan; dibatasi 100% agar anomali data tidak menghasilkan angka mustahil.
    const rasio = totalHariTersedia > 0
      ? Math.min(1, Number(b.total_unit) / totalHariTersedia)
      : 0;

    return {
      item_id: String(b.item_id),
      kode_barang: b.kode_barang,
      nama: b.nama,
      stok_fisik: b.stok_fisik,
      jumlah_sewa: Number(b.jumlah_sewa),
      kali_disewa: Number(b.jumlah_sewa),
      total_unit_hari: Number(b.total_unit) || 0,
      hari_tersewa: Number(b.total_unit) || 0,
      rasio_pemanfaatan: rasio,
      utilisasi_persen: Math.round(rasio * 1000) / 10,
      pendapatan: petaPendapatan.get(String(b.item_id)) || 0,
    };
  });

  const rataRata = alat.length > 0
    ? alat.reduce((s, a) => s + a.rasio_pemanfaatan, 0) / alat.length
    : 0;

  return {
    periode: { dari: dariFmt, sampai: sampaiFmt, jumlah_hari: totalHariPeriode },
    total_alat: Number(totalAlatAktif[0].n),
    utilisasi_rata_rata: Math.round(rataRata * 1000) / 10,
    alat_tidak_terpakai: Math.max(0, Number(totalAlatAktif[0].n) - alat.length),
    alat,
  };
}

/**
 * Laporan pendapatan & denda — REQ-4.6.3.
 */
async function laporanPendapatan({ dari, sampai }) {
  const dariFmt = formatTanggal(dari);
  const sampaiFmt = formatTanggal(sampai);

  const [sewa] = await db('Order')
    .whereBetween('created_at', [`${dariFmt} 00:00:00`, `${sampaiFmt} 23:59:59`])
    .whereNotIn('status', [STATUS_PESANAN.DIBATALKAN])
    .sum({ total_sewa: 'total_sewa', total_tambahan: 'total_biaya_tambahan' });

  const denda = await db('Penalty')
    .join('Order', 'Order.order_id', 'Penalty.order_id')
    .whereBetween('Order.created_at', [`${dariFmt} 00:00:00`, `${sampaiFmt} 23:59:59`])
    .groupBy('Penalty.tipe')
    .select('Penalty.tipe')
    .sum({ nominal: 'Penalty.nominal' })
    .count({ jumlah: 'Penalty.penalty_id' });

  const totalDenda = denda.reduce((s, d) => s + Number(d.nominal), 0);
  const totalSewa = Number(sewa.total_sewa) || 0;
  const totalTambahan = Number(sewa.total_tambahan) || 0;

  // Rincian per hari: sewa dihitung dari pesanan, denda dari Penalty pada hari
  // pesanan dibuat. Digabung di JS agar satu tanggal tetap satu baris.
  const sewaPerHari = await db('Order')
    .whereBetween('created_at', [`${dariFmt} 00:00:00`, `${sampaiFmt} 23:59:59`])
    .whereNotIn('status', [STATUS_PESANAN.DIBATALKAN])
    .groupByRaw('DATE(created_at)')
    .select(db.raw('DATE(created_at) as tanggal'))
    .count({ jumlah_transaksi: 'order_id' })
    .sum({ nilai_sewa: 'total_akhir' });

  const dendaPerHari = await db('Penalty')
    .join('Order', 'Order.order_id', 'Penalty.order_id')
    .whereBetween('Order.created_at', [`${dariFmt} 00:00:00`, `${sampaiFmt} 23:59:59`])
    .groupByRaw('DATE(Order.created_at)')
    .select(db.raw('DATE(Order.created_at) as tanggal'))
    .sum({ nilai_denda: 'Penalty.nominal' });

  const petaHari = new Map();
  for (const s of sewaPerHari) {
    const kunci = formatTanggal(s.tanggal);
    petaHari.set(kunci, {
      tanggal: kunci,
      jumlah_transaksi: Number(s.jumlah_transaksi),
      nilai_sewa: Number(s.nilai_sewa) || 0,
      nilai_denda: 0,
    });
  }
  for (const d of dendaPerHari) {
    const kunci = formatTanggal(d.tanggal);
    const baris = petaHari.get(kunci) || {
      tanggal: kunci,
      jumlah_transaksi: 0,
      nilai_sewa: 0,
      nilai_denda: 0,
    };
    baris.nilai_denda = Number(d.nilai_denda) || 0;
    petaHari.set(kunci, baris);
  }

  const rincian = [...petaHari.values()].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  return {
    periode: { dari: dariFmt, sampai: sampaiFmt },
    // Nama kunci selaras dengan antarmuka laporan pendapatan.
    pendapatan_sewa: totalSewa,
    biaya_tambahan: totalTambahan,
    total_pendapatan: totalSewa,
    total_denda: totalDenda,
    total_keseluruhan: totalSewa + totalTambahan + totalDenda,
    rincian,
    rincian_denda: denda.map((d) => ({
      tipe: d.tipe,
      jumlah: Number(d.jumlah),
      nominal: Number(d.nominal) || 0,
    })),
  };
}

/**
 * Daftar semua pesanan untuk admin — REQ-4.6.4.
 * Mendukung penyaringan status dan rentang tanggal.
 */
async function daftarSemuaPesanan({ status, dari, sampai, halaman = 1, batas = 20 } = {}) {
  const query = db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .select(
      'Order.order_id',
      'Order.kode_pesanan',
      'Order.tanggal_mulai',
      'Order.tanggal_selesai',
      'Order.status',
      'Order.total_akhir',
      'Order.created_at',
      'User.nama as pelanggan',
      'User.email'
    );

  if (status) query.where('Order.status', status);
  if (dari && sampai) {
    query.whereBetween('Order.tanggal_mulai', [formatTanggal(dari), formatTanggal(sampai)]);
  }

  const [total] = await query.clone().clearSelect().clearOrder().count({ n: 'Order.order_id' });

  const baris = await query
    .orderBy('Order.created_at', 'desc')
    .limit(batas)
    .offset((halaman - 1) * batas);

  return {
    data: baris.map((p) => ({
      order_id: String(p.order_id),
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      email: p.email,
      tanggal_mulai: formatTanggal(p.tanggal_mulai),
      tanggal_selesai: formatTanggal(p.tanggal_selesai),
      status: p.status,
      total_akhir: Number(p.total_akhir),
      dibuat_pada: p.created_at,
    })),
    meta: { halaman, batas, total: Number(total.n) },
  };
}

/**
 * Ringkasan dashboard admin — REQ-4.6.5.
 * Satu panggilan, beberapa angka kunci; dihitung dengan kueri agregat paralel.
 */
async function ringkasanDashboard() {
  const hariIni = formatTanggal(new Date());

  const [
    [pesananAktif],
    [menungguKonfirmasi],
    [pendapatanBulanIni],
    [totalAlat],
    [dendaBelumLunas],
  ] = await Promise.all([
    db('Order')
      .whereIn('status', [STATUS_PESANAN.DIBAYAR, STATUS_PESANAN.DISIAPKAN, STATUS_PESANAN.SEDANG_DISEWA])
      .count({ n: 'order_id' }),
    db('Order').where({ status: STATUS_PESANAN.MENUNGGU_PEMBAYARAN }).count({ n: 'order_id' }),
    db('Order')
      .whereRaw("DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')", [hariIni])
      .whereNotIn('status', [STATUS_PESANAN.DIBATALKAN, STATUS_PESANAN.GAGAL_KEDALUWARSA])
      .sum({ n: 'total_akhir' }),
    db('Item').where('is_aktif', true).count({ n: 'item_id' }),
    db('Penalty').where({ status_pelunasan: 'BELUM_LUNAS' }).sum({ n: 'nominal' }),
  ]);

  const stokMenipis = await db('Item')
    .where('is_aktif', true)
    .whereRaw('stok_fisik <= stok_minimum')
    .count({ n: 'item_id' });

  const keterlambatan = await db('Order')
    .where('status', STATUS_PESANAN.SEDANG_DISEWA)
    .where('tanggal_selesai', '<', hariIni)
    .count({ n: 'order_id' });

  // Lima pesanan terbaru untuk daftar ringkas di dasbor. Dibatasi di sini agar
  // halaman dasbor tetap satu permintaan.
  const pesananTerbaru = await db('Order')
    .join('User', 'User.user_id', 'Order.user_id')
    .select(
      'Order.order_id',
      'Order.kode_pesanan',
      'Order.status',
      'Order.total_akhir',
      'Order.created_at',
      'User.nama as pelanggan'
    )
    .orderBy('Order.created_at', 'desc')
    .limit(5);

  // Nama kunci diselaraskan dengan antarmuka: dasbor memerlukan rincian per
  // tahap, bukan sekadar jumlah pesanan aktif.
  const perluDisiapkan = await db('Order').where({ status: STATUS_PESANAN.DISIAPKAN }).count({ n: 'order_id' });
  const sedangDisewa = await db('Order').where({ status: STATUS_PESANAN.SEDANG_DISEWA }).count({ n: 'order_id' });

  return {
    tanggal: hariIni,
    pesanan_aktif: Number(pesananAktif.n),
    menunggu_pembayaran: Number(menungguKonfirmasi.n),
    pesanan_menunggu_pembayaran: Number(menungguKonfirmasi.n),
    pesanan_perlu_disiapkan: Number(perluDisiapkan[0].n),
    pesanan_sedang_disewa: Number(sedangDisewa[0].n),
    pendapatan_bulan_ini: Number(pendapatanBulanIni.n) || 0,
    total_alat_aktif: Number(totalAlat.n),
    alat_stok_menipis: Number(stokMenipis[0].n),
    stok_menipis: Number(stokMenipis[0].n),
    pesanan_terlambat: Number(keterlambatan[0].n),
    denda_belum_lunas: Number(dendaBelumLunas.n) || 0,
    pesanan_terbaru: pesananTerbaru.map((p) => ({
      order_id: String(p.order_id),
      kode_pesanan: p.kode_pesanan,
      pelanggan: p.pelanggan,
      status: p.status,
      total_akhir: Number(p.total_akhir),
      created_at: p.created_at,
    })),
  };
}

/**
 * Ekspor laporan ke CSV — REQ-4.6.5.
 * Tidak memakai pustaka tambahan; CSV sederhana cukup untuk kebutuhan ini.
 */
async function eksporCsv({ jenis, dari, sampai }) {
  let header;
  let baris;

  if (jenis === 'pemanfaatan') {
    const laporan = await laporanPemanfaatan({ dari, sampai });
    header = ['item_id', 'kode_barang', 'nama', 'stok_fisik', 'jumlah_sewa', 'total_unit_hari', 'rasio_pemanfaatan', 'pendapatan'];
    baris = laporan.alat.map((a) => [
      a.item_id, a.kode_barang, a.nama, a.stok_fisik, a.jumlah_sewa, a.total_unit_hari, a.rasio_pemanfaatan.toFixed(4), a.pendapatan,
    ]);
  } else {
    const laporan = await laporanPenyewaan({ dari, sampai });
    header = ['tanggal', 'jumlah_pesanan', 'pendapatan'];
    baris = laporan.per_hari.map((h) => [h.tanggal, h.jumlah_pesanan, h.pendapatan]);
  }

  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [header.join(','), ...baris.map((r) => r.map(escape).join(','))].join('\n');
}

module.exports = {
  laporanPenyewaan,
  laporanPemanfaatan,
  laporanPendapatan,
  daftarSemuaPesanan,
  ringkasanDashboard,
  eksporCsv,
};
