const test = require('node:test');
const assert = require('node:assert');
const { seed } = require('../seeds/01_data_awal');

/** knex tiruan: hanya melayani count() dan mencatat apakah del() pernah dipanggil. */
function knexTiruan(jumlahUser) {
  const catatan = { dihapus: false };
  const knex = () => ({
    count: async () => [{ n: jumlahUser }],
    del: async () => { catatan.dihapus = true; },
  });
  return { knex, catatan };
}

test('seed menolak DB yang sudah berisi dan tidak menghapus apa pun', async () => {
  delete process.env.ALLOW_SEED_RESET;
  const { knex, catatan } = knexTiruan(3);
  await assert.rejects(() => seed(knex), /ALLOW_SEED_RESET/);
  assert.equal(catatan.dihapus, false);
});

test('seed menolak di production walau ada ALLOW_SEED_RESET', async () => {
  const lama = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_SEED_RESET = 'true';
  const { knex, catatan } = knexTiruan(0);
  await assert.rejects(() => seed(knex), /production/);
  assert.equal(catatan.dihapus, false);
  process.env.NODE_ENV = lama;
  delete process.env.ALLOW_SEED_RESET;
});
