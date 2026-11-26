/**
 * Tes integrasi alur inti terhadap MySQL asli (database *_test, dibuat dan dihapus otomatis).
 * Dilewati bila MySQL tidak menyala.
 */
const dbUji = require('./helper/dbUji'); // harus paling awal: mengatur env sebelum src/ dimuat
const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');

const db = require('../src/config/database');
const authService = require('../src/modules/auth/auth.service');
const app = require('../src/app');

let siap = false;
let server;
let base;

test.before(async () => {
  siap = await dbUji.siapkan();
  if (!siap) return;
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (siap) await dbUji.bersihkan();
  else await db.destroy();
});

const lewati = (t) => {
  if (!siap) t.skip('MySQL tidak tersedia');
  return !siap;
};

const buatPengguna = async (email, { status = 'AKTIF', password = 'Sandi#12345' } = {}) => {
  const [id] = await db('User').insert({
    nama: 'Pengguna Uji', email, nomor_telepon: '0812000000', role: 'PELANGGAN',
    password_hash: await bcrypt.hash(password, 4), status_verifikasi: status,
  });
  return id;
};

const kirim = async (jalur, { metode = 'GET', token, body } = {}) => {
  const res = await fetch(base + jalur, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

// ─── Login ────────────────────────────────────────────────────────────────────

test('login berhasil mengembalikan token akses dan refresh yang berbeda jenis', async (t) => {
  if (lewati(t)) return;
  const { status, json } = await kirim('/auth/login', { metode: 'POST', body: { email: 'admin@rentalcamping.test', password: 'Admin#12345' } });
  assert.equal(status, 200);
  assert.ok(json.data.accessToken && json.data.refreshToken);
  assert.equal(json.data.pengguna.role, 'ADMIN');
  assert.equal(json.data.pengguna.password_hash, undefined, 'hash kata sandi tidak boleh keluar');
});

test('token akses membuka /auth/me, refresh token ditolak di rute yang sama', async (t) => {
  if (lewati(t)) return;
  const { json } = await kirim('/auth/login', { metode: 'POST', body: { email: 'admin@rentalcamping.test', password: 'Admin#12345' } });
  assert.equal((await kirim('/auth/me', { token: json.data.accessToken })).status, 200);
  assert.equal((await kirim('/auth/me', { token: json.data.refreshToken })).status, 401);
  assert.equal((await kirim('/auth/me')).status, 401);
});

test('kata sandi salah ditolak dengan pesan yang sama untuk email tak dikenal', async (t) => {
  if (lewati(t)) return;
  const salah = await kirim('/auth/login', { metode: 'POST', body: { email: 'admin@rentalcamping.test', password: 'Salah#12345' } });
  const tak = await kirim('/auth/login', { metode: 'POST', body: { email: 'tidak.ada@rentalcamping.test', password: 'Salah#12345' } });
  assert.equal(salah.status, 401);
  assert.equal(tak.status, 401);
  assert.ok(salah.json.message.startsWith('Email atau kata sandi salah.'));
  assert.ok(tak.json.message.startsWith('Email atau kata sandi salah.'));
});

test('akun belum terverifikasi tidak bisa masuk walau kata sandi benar', async (t) => {
  if (lewati(t)) return;
  await buatPengguna('belum@uji.test', { status: 'BELUM_VERIFIKASI' });
  await assert.rejects(() => authService.masuk({ email: 'belum@uji.test', password: 'Sandi#12345' }), { name: 'ForbiddenError' });
});

test('akun terkunci setelah 5 kali gagal, bahkan dengan kata sandi benar', async (t) => {
  if (lewati(t)) return;
  await buatPengguna('kunci@uji.test');
  for (let i = 0; i < 5; i++) {
    await assert.rejects(() => authService.masuk({ email: 'kunci@uji.test', password: 'Salah#12345' }), { name: 'UnauthorizedError' });
  }
  await assert.rejects(() => authService.masuk({ email: 'kunci@uji.test', password: 'Sandi#12345' }), { name: 'ForbiddenError' });
});

// ─── Pesanan dan stok ─────────────────────────────────────────────────────────

const orderService = require('../src/modules/order/order.service');
const { formatTanggal } = require('../src/utils/helpers');

const hariKe = (n) => formatTanggal(new Date(Date.now() + n * 86400000));
const buatAlat = async (kode, stok, tarif = 10000) => {
  const [id] = await db('Item').insert({ kode_barang: kode, nama: kode, category_id: 1, stok_fisik: stok, tarif_harian: tarif });
  return id;
};
const pesan = (userId, itemId, kuantitas = 1, mulai = hariKe(10), selesai = hariKe(12)) =>
  orderService.buatPesanan({ userId, barisKeranjang: [{ tipe: 'ITEM', item_id: itemId, kuantitas }], tanggalMulai: mulai, tanggalSelesai: selesai });
const statusReservasi = async (orderId) => (await db('StockReservation').where({ order_id: orderId }).first()).status;

test('total pesanan = tarif x kuantitas x hari (tanggal selesai inklusif) dan stok terikat', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('total@uji.test');
  const alat = await buatAlat('UJI-TOTAL', 5, 10000);
  const p = await pesan(user, alat, 2); // hari ke-10 sampai ke-12 = 3 hari
  assert.equal(p.total_akhir, 60000);
  assert.equal(p.status, 'MENUNGGU_PEMBAYARAN');
  assert.equal(await statusReservasi(p.order_id), 'AKTIF');
});

test('stok habis pada tanggal yang beririsan ditolak, tanggal lain tetap bisa', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('stok@uji.test');
  const alat = await buatAlat('UJI-STOK', 1);
  await pesan(user, alat);
  await assert.rejects(() => pesan(user, alat), { name: 'StockUnavailableError' });
  await assert.doesNotReject(() => pesan(user, alat, 1, hariKe(20), hariKe(21)));
});

test('dua pesanan bersamaan untuk satu-satunya unit: tepat satu yang berhasil (tanpa double-booking)', async (t) => {
  if (lewati(t)) return;
  const a = await buatPengguna('balap-a@uji.test');
  const b = await buatPengguna('balap-b@uji.test');
  const alat = await buatAlat('UJI-BALAP', 1);
  const hasil = await Promise.allSettled([pesan(a, alat), pesan(b, alat)]);
  assert.equal(hasil.filter((h) => h.status === 'fulfilled').length, 1);
  const gagal = hasil.find((h) => h.status === 'rejected');
  assert.equal(gagal.reason.name, 'StockUnavailableError');
  assert.equal((await db('StockReservation').where({ item_id: alat, status: 'AKTIF' }).sum({ n: 'kuantitas' }))[0].n, 1);
});

test('tanggal mulai di masa lalu dan keranjang kosong ditolak', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('tanggal@uji.test');
  const alat = await buatAlat('UJI-TGL', 3);
  await assert.rejects(() => pesan(user, alat, 1, hariKe(-2), hariKe(1)), { code: 'TANGGAL_MULAI_MASA_LALU' });
  await assert.rejects(() => orderService.buatPesanan({ userId: user, barisKeranjang: [], tanggalMulai: hariKe(5), tanggalSelesai: hariKe(6) }), { code: 'KERANJANG_KOSONG' });
});

test('pembatalan oleh pelanggan melepas stok; orang lain tidak boleh membatalkan', async (t) => {
  if (lewati(t)) return;
  const pemilik = await buatPengguna('batal-a@uji.test');
  const lain = await buatPengguna('batal-b@uji.test');
  const alat = await buatAlat('UJI-BATAL', 1);
  const p = await pesan(pemilik, alat);
  await assert.rejects(() => orderService.batalkanPesanan({ orderId: p.order_id, userId: lain }), { name: 'ForbiddenError' });
  const batal = await orderService.batalkanPesanan({ orderId: p.order_id, userId: pemilik });
  assert.equal(batal.status, 'DIBATALKAN');
  assert.equal(await statusReservasi(p.order_id), 'DILEPAS');
  await assert.doesNotReject(() => pesan(lain, alat), 'unit yang dilepas harus bisa dipesan lagi');
});

test('stok dihitung per item: pesanan dua alat tidak mengacaukan sisa masing-masing', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('multi@uji.test');
  const a = await buatAlat('UJI-MULTI-A', 2);
  const b = await buatAlat('UJI-MULTI-B', 1);
  await orderService.buatPesanan({
    userId: user,
    barisKeranjang: [{ tipe: 'ITEM', item_id: a, kuantitas: 1 }, { tipe: 'ITEM', item_id: b, kuantitas: 1 }],
    tanggalMulai: hariKe(30), tanggalSelesai: hariKe(31),
  });
  await assert.doesNotReject(() => pesan(user, a, 1, hariKe(30), hariKe(31)), 'A masih punya 1 unit sisa');
  await assert.rejects(() => pesan(user, a, 1, hariKe(30), hariKe(31)), { name: 'StockUnavailableError' });
  await assert.rejects(() => pesan(user, b, 1, hariKe(30), hariKe(31)), { name: 'StockUnavailableError' });
});

// ─── Webhook pembayaran dan pembatalan otomatis ───────────────────────────────

const crypto = require('crypto');
const config = require('../src/config');
const paymentService = require('../src/modules/payment/payment.service');
const { batalkanPesananKedaluwarsa } = require('../src/jobs/scheduler');

const notifikasi = (kode, transactionId, status, jumlah) => {
  const statusCode = '200';
  const signature_key = crypto.createHash('sha512').update(`${kode}${statusCode}${jumlah}${config.midtrans.serverKey}`).digest('hex');
  return Buffer.from(JSON.stringify({
    order_id: kode, status_code: statusCode, gross_amount: jumlah, signature_key,
    transaction_status: status, transaction_id: transactionId, payment_type: 'qris',
  }));
};
const kirimNotifikasi = (p, tid, status) => paymentService.tanganiNotifikasi({ rawBody: notifikasi(p.kode_pesanan, tid, status, `${p.total_akhir}.00`) });
const statusPesanan = async (orderId) => (await db('Order').where({ order_id: orderId }).first()).status;

test('webhook: pending lalu settlement (transaction_id sama) membuat pesanan DIBAYAR', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('wh-a@uji.test');
  const p = await pesan(user, await buatAlat('UJI-WH-A', 1));
  assert.equal((await kirimNotifikasi(p, 'tid-a', 'pending')).status, 'diproses');
  assert.equal(await statusPesanan(p.order_id), 'MENUNGGU_PEMBAYARAN');
  assert.equal((await kirimNotifikasi(p, 'tid-a', 'settlement')).status, 'diproses');
  assert.equal(await statusPesanan(p.order_id), 'DIBAYAR');
  assert.equal((await kirimNotifikasi(p, 'tid-a', 'settlement')).status, 'diabaikan');
  assert.equal((await db('Payment').where({ order_id: p.order_id }).count({ n: '*' }))[0].n, 2);
});

test('webhook: dua notifikasi identik bersamaan hanya diproses sekali dan tidak error', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('wh-b@uji.test');
  const p = await pesan(user, await buatAlat('UJI-WH-B', 1));
  const hasil = await Promise.allSettled([kirimNotifikasi(p, 'tid-b', 'settlement'), kirimNotifikasi(p, 'tid-b', 'settlement')]);
  assert.ok(hasil.every((h) => h.status === 'fulfilled'), hasil.map((h) => h.reason?.message).join());
  assert.equal(hasil.filter((h) => h.value.status === 'diproses').length, 1);
  assert.equal((await db('Payment').where({ order_id: p.order_id }).count({ n: '*' }))[0].n, 1);
});

test('webhook: signature salah ditolak dan tidak mengubah apa pun', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('wh-c@uji.test');
  const p = await pesan(user, await buatAlat('UJI-WH-C', 1));
  const palsu = JSON.parse(notifikasi(p.kode_pesanan, 'tid-c', 'settlement', `${p.total_akhir}.00`));
  palsu.signature_key = 'palsu';
  await assert.rejects(() => paymentService.tanganiNotifikasi({ rawBody: Buffer.from(JSON.stringify(palsu)) }), { name: 'ForbiddenError' });
  assert.equal(await statusPesanan(p.order_id), 'MENUNGGU_PEMBAYARAN');
  assert.equal((await db('Payment').where({ order_id: p.order_id }).count({ n: '*' }))[0].n, 0);
});

test('pesanan lewat batas bayar dibatalkan otomatis dan stoknya bisa dipesan lagi', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('exp-a@uji.test');
  const lain = await buatPengguna('exp-b@uji.test');
  const alat = await buatAlat('UJI-EXP', 1);
  const p = await pesan(user, alat);
  await assert.rejects(() => pesan(lain, alat), { name: 'StockUnavailableError' });

  await db('Order').where({ order_id: p.order_id }).update({ batas_pembayaran: new Date(Date.now() - 60000) });
  assert.ok((await batalkanPesananKedaluwarsa()) >= 1);

  assert.equal(await statusPesanan(p.order_id), 'GAGAL_KEDALUWARSA');
  assert.equal(await statusReservasi(p.order_id), 'DILEPAS');
  await assert.doesNotReject(() => pesan(lain, alat));
});

test('pesanan yang sudah dibayar tidak ikut dibatalkan walau lewat batas bayar', async (t) => {
  if (lewati(t)) return;
  const user = await buatPengguna('exp-c@uji.test');
  const p = await pesan(user, await buatAlat('UJI-EXP-LUNAS', 1));
  await kirimNotifikasi(p, 'tid-lunas', 'settlement');
  await db('Order').where({ order_id: p.order_id }).update({ batas_pembayaran: new Date(Date.now() - 60000) });
  await batalkanPesananKedaluwarsa();
  assert.equal(await statusPesanan(p.order_id), 'DIBAYAR');
  assert.equal(await statusReservasi(p.order_id), 'AKTIF');
});
