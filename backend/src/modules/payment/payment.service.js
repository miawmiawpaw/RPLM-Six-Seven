const crypto = require('crypto');
const db = require('../../config/database');
const config = require('../../config');
const { STATUS_PESANAN, STATUS_PEROBAYAAN } = require('../../constants');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');
const orderService = require('../order/order.service');

/**
 * Modul pembayaran — Midtrans (ADR-11).
 *
 * REQ-4.4.1 s.d. REQ-4.4.7.
 *
 * CATATAN PENTING soal signature Midtrans:
 *   Midtrans TIDAK memakai header X-Signature. Signature dihitung dari nilai field
 *   body dengan rumus:
 *
 *     sha512(order_id + status_code + gross_amount + ServerKey)
 *
 *   Karena itu endpoint webhook didaftarkan SEBELUM express.json() dan memakai
 *   express.raw() — lihat src/app.js. Bila body sudah di-parse menjadi objek,
 *   kita dapat merekonstruksi string-nya dari field, tetapi menyimpan body mentah
 *   lebih aman karena tidak bergantung pada bentuk serialisasi.
 */

/**
 * Verifikasi signature notifikasi Midtrans.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.statusCode
 * @param {string} params.grossAmount
 * @param {string} params.signatureKey nilai signature_key dari notifikasi
 * @returns {boolean}
 */
function verifikasiSignature({ orderId, statusCode, grossAmount, signatureKey }) {
  const bahan = `${orderId}${statusCode}${grossAmount}${config.midtrans.serverKey}`;
  const diharapkan = crypto.createHash('sha512').update(bahan).digest('hex');

  // Waktu tetap agar tidak dapat ditentukan lewat serangan pengukuran waktu.
  const a = Buffer.from(diharapkan, 'utf8');
  const b = Buffer.from(String(signatureKey || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Ubah body mentah menjadi objek.
 *
 * @param {Buffer|object|string} body
 * @returns {object}
 */
function parseBody(body) {
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8'));
  if (typeof body === 'string') return JSON.parse(body);
  return body || {};
}

/**
 * Peta status Midtrans ke status pembayaran internal.
 * @param {string} transactionStatus
 * @param {string} fraudStatus
 */
function petakanStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'challenge' ? 'PENDING' : 'SUKSES';
    case 'settlement':
      return 'SUKSES';
    case 'pending':
      return 'PENDING';
    case 'deny':
      return 'GAGAL';
    case 'cancel':
      return 'GAGAL';
    case 'expire':
      return 'KEDALUWARSA';
    case 'refund':
    case 'partial_refund':
      return 'GAGAL';
    default:
      return 'PENDING';
  }
}

/**
 * Tangani notifikasi Midtrans — REQ-4.4.2, REQ-4.4.7.
 *
 * IDEMPOTEN: notifikasi yang sama dapat dikirim berulang oleh Midtrans. Bila
 * referensi_gateway sudah pernah diproses, permintaan berikutnya tidak mengubah apa pun.
 *
 * @param {object} params
 * @param {Buffer|object|string} params.rawBody
 * @param {string} [params.ip]
 */
async function tanganiNotifikasi({ rawBody, ip = null }) {
  const body = parseBody(rawBody);

  const {
    order_id: orderIdGateway,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus,
    transaction_id: transactionId,
    payment_type: paymentType,
  } = body;

  if (!verifikasiSignature({ orderId: orderIdGateway, statusCode, grossAmount, signatureKey })) {
    // Jangan bocorkan alasan detail ke pemanggil — cukup tolak.
    throw new ForbiddenError('Signature notifikasi tidak valid.');
  }

  // order_id yang dikirim ke Midtrans adalah kode_pesanan kita (human-readable),
  // bukan transaction_id Midtrans. Lihat catatan di §4.2 architecture.md.
  const pesanan = await db('Order').where({ kode_pesanan: orderIdGateway }).first();
  if (!pesanan) throw new NotFoundError(`Pesanan dengan kode ${orderIdGateway} tidak ditemukan.`);

  const statusPembayaran = petakanStatus(transactionStatus, fraudStatus);

  return db.transaction(async (trx) => {
    // ─── Idempotensi (FR-034) ────────────────────────────────────────────────
    const sudahAda = await trx('Payment').where({ referensi_gateway: transactionId }).first();
    if (sudahAda) {
      return { status: 'diabaikan', alasan: 'NOTIFIKASI_DUPLIKAT', payment_id: String(sudahAda.payment_id) };
    }

    const [paymentId] = await trx('Payment').insert({
      order_id: pesanan.order_id,
      metode: paymentType || 'MIDTRANS',
      status: statusPembayaran,
      nominal: Number(grossAmount),
      referensi_gateway: transactionId,
      payload_gateway: JSON.stringify(body).slice(0, 60000),
      waktu: trx.fn.now(),
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PEMBAYARAN_WEBHOOK,
      entity: 'Payment',
      entityId: paymentId,
      keterangan: `Notifikasi Midtrans: ${transactionStatus}${fraudStatus ? `/${fraudStatus}` : ''}`,
      ip,
    });

    // ─── Perbarui status pesanan bila pembayaran berhasil ────────────────────
    // Hanya transisi dari MENUNGGU_PEMBAYARAN ke DIBAYAR yang dilakukan di sini.
    // Transisi lain ditangani alur terpisah agar tidak ada dua sumber kebenaran.
    if (statusPembayaran === 'SUKSES' && pesanan.status === STATUS_PESANAN.MENUNGGU_PEMBAYARAN) {
      await orderService.ubahStatus({
        orderId: pesanan.order_id,
        statusBaru: STATUS_PESANAN.DIBAYAR,
        aktorId: null,
        keterangan: `Pembayaran dikonfirmasi Midtrans (${transactionId}).`,
        trx,
      });
    }

    // Pesanan kedaluwarsa di sisi Midtrans sekaligus membatalkannya di sisi kita.
    if (
      statusPembayaran === 'KEDALUWARSA' &&
      [STATUS_PESANAN.MENUNGGU_PEMBAYARAN, STATUS_PESANAN.DIBAYAR].includes(pesanan.status)
    ) {
      await orderService.ubahStatus({
        orderId: pesanan.order_id,
        statusBaru: STATUS_PESANAN.GAGAL_KEDALUWARSA,
        aktorId: null,
        keterangan: 'Kedaluwarsa menurut Midtrans.',
        trx,
      });
    }

    return { status: 'diproses', payment_id: String(paymentId), status_pembayaran: statusPembayaran };
  });
}

/**
 * Buat transaksi pembayaran di Midtrans — REQ-4.4.1.
 *
 * Catatan implementasi: memanggil REST API Midtrans secara langsung memakai fetch
 * bawaan Node 20+, sehingga tidak perlu SDK tambahan. Bila SDK resmi dipakai kelak,
 * ganti isi fungsi ini saja — pemanggil tidak terpengaruh.
 *
 * @param {object} params
 * @param {number|string} params.orderId
 * @param {number|string} params.userId
 */
async function buatTransaksiPembayaran({ orderId, userId }) {
  const pesanan = await orderService.ambilPesanan(orderId, userId);

  if (pesanan.status !== STATUS_PESANAN.MENUNGGU_PEMBAYARAN) {
    throw new ForbiddenError(`Pesanan berstatus ${pesanan.status} tidak dapat dibayar.`);
  }

  const user = await db('User').where({ user_id: pesanan.user_id }).first();

  const basisUrl = config.midtrans.isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const payload = {
    // kode_pesanan kita dipakai sebagai order_id agar mudah dipetakan balik saat webhook.
    transaction_details: {
      order_id: pesanan.kode_pesanan,
      gross_amount: Math.round(pesanan.total_akhir),
    },
    customer_details: {
      first_name: user?.nama || 'Pelanggan',
      email: user?.email,
      phone: user?.nomor_telepon,
    },
    expiry: { unit: 'hours', duration: 24 },
  };

  const otorisasi = Buffer.from(`${config.midtrans.serverKey}:`).toString('base64');

  const respons = await fetch(basisUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${otorisasi}`,
    },
    body: JSON.stringify(payload),
  });

  const hasil = await respons.json();

  if (!respons.ok) {
    throw new Error(`Midtrans menolak permintaan: ${hasil.error_messages?.join(', ') || respons.status}`);
  }

  // Catat percobaan pembayaran supaya ada jejak meski webhook belum datang.
  await db('Payment').insert({
    order_id: pesanan.order_id,
    metode: 'MIDTRANS',
    status: 'PENDING',
    nominal: Math.round(pesanan.total_akhir),
    referensi_gateway: hasil.token,
    waktu: db.fn.now(),
  });

  return {
    token: hasil.token,
    redirect_url: hasil.redirect_url,
    kode_pesanan: pesanan.kode_pesanan,
    nominal: Math.round(pesanan.total_akhir),
  };
}

module.exports = {
  verifikasiSignature,
  petakanStatus,
  tanganiNotifikasi,
  buatTransaksiPembayaran,
};
