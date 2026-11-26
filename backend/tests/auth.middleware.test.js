const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'rahasia-uji-minimal-32-karakter-xxxxxxxx';
const config = require('../src/config');
const { authenticate } = require('../src/middleware/auth');

const buatToken = (jenis) => jwt.sign({ sub: '1', email: 'a@b.test', peran: 'ADMIN', jenis }, config.jwt.secret, { expiresIn: '5m' });

function jalankan(token) {
  const req = { headers: { authorization: `Bearer ${token}` } };
  let galat;
  authenticate(req, null, (e) => { galat = e; });
  return { req, galat };
}

test('token akses diterima', () => {
  const { req, galat } = jalankan(buatToken('akses'));
  assert.equal(galat, undefined);
  assert.equal(req.user.id, '1');
});

for (const jenis of ['refresh', 'verifikasi_email', 'reset_kata_sandi', undefined]) {
  test(`token jenis "${jenis}" ditolak sebagai token akses`, () => {
    const { req, galat } = jalankan(buatToken(jenis));
    assert.ok(galat, 'harus ada galat');
    assert.equal(req.user, undefined);
  });
}
