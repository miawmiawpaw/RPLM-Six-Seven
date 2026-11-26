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
