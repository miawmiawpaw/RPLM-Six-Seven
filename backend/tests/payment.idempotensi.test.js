const test = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'rahasia-uji-minimal-32-karakter-xxxxxxxx';
const { kunciIdempotensi } = require('../src/modules/payment/payment.service');

const id = '9aed5972-5b6a-401e-894b-a32c91ed1a3a';

test('pending dan settlement dari transaksi yang sama punya kunci berbeda', () => {
  const pending = kunciIdempotensi({ transaction_id: id, transaction_status: 'pending' });
  const settlement = kunciIdempotensi({ transaction_id: id, transaction_status: 'settlement' });
  assert.notEqual(pending, settlement);
});

test('notifikasi identik menghasilkan kunci yang sama', () => {
  const n = { transaction_id: id, transaction_status: 'settlement' };
  assert.equal(kunciIdempotensi(n), kunciIdempotensi({ ...n }));
});

test('fraud_status ikut membedakan kunci dan panjang tidak melebihi kolom', () => {
  const a = kunciIdempotensi({ transaction_id: id, transaction_status: 'capture', fraud_status: 'challenge' });
  const b = kunciIdempotensi({ transaction_id: id, transaction_status: 'capture', fraud_status: 'accept' });
  assert.notEqual(a, b);
  assert.ok(a.length <= 100);
});
