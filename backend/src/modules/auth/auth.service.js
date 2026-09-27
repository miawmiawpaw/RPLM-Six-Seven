const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const config = require('../../config');
const { PERAN } = require('../../constants');
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require('../../utils/errors');
const { catatAudit, AKSI_AUDIT } = require('../../middleware/auditLogger');

/**
 * Modul autentikasi — REQ-4.1.1 s.d. REQ-4.1.5.
 *
 * Aturan lapisan (ADR-01): berkas ini TIDAK menyentuh req/res Express.
 * Seluruh logika bisnis dan akses data ada di sini.
 */

const JENIS_TOKEN = Object.freeze({
  AKSES: 'akses',
  REFRESH: 'refresh',
  VERIFIKASI_EMAIL: 'verifikasi_email',
  RESET_KATA_SANDI: 'reset_kata_sandi',
});

/** Batas percobaan login gagal sebelum akun dikunci sementara — REQ-4.1.5. */
const BATAS_LOGIN_GAGAL = 5;
const DURASI_KUNCI_MENIT = 15;

/**
 * Terbitkan token.
 * @param {object} user baris dari tabel User
 * @param {string} jenis salah satu JENIS_TOKEN
 * @param {string} masaBerlaku
 */
function terbitkanToken(user, jenis, masaBerlaku) {
  return jwt.sign(
    {
      sub: String(user.user_id),
      email: user.email,
      peran: user.role,
      jenis,
    },
    config.jwt.secret,
    { expiresIn: masaBerlaku }
  );
}

/**
 * Terbitkan pasangan token akses + refresh.
 * ADR-14: akses 15 menit, refresh 7 hari.
 */
function terbitkanPasanganToken(user) {
  return {
    accessToken: terbitkanToken(user, JENIS_TOKEN.AKSES, config.jwt.accessExpiresIn),
    refreshToken: terbitkanToken(user, JENIS_TOKEN.REFRESH, config.jwt.refreshExpiresIn),
    tipeToken: 'Bearer',
    masaBerlakuDetik: 15 * 60,
  };
}

/** Bentuk data pengguna yang aman dikirim ke klien — password_hash tidak pernah keluar. */
function penggunaAman(user) {
  return {
    user_id: String(user.user_id),
    nama: user.nama,
    email: user.email,
    nomor_telepon: user.nomor_telepon,
    role: user.role,
  };
}

/** REQ-4.1.1 — registrasi pelanggan baru. */
async function daftar({ nama, email, nomor_telepon, password }) {
  const sudahAda = await db('User').where({ email }).first();
  if (sudahAda) {
    // BR-003: email unik mendukung login.
    throw new ConflictError('Email sudah terdaftar. Silakan masuk atau gunakan email lain.', 'EMAIL_TERDAFTAR');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [userId] = await db('User').insert({
    nama,
    email,
    nomor_telepon,
    password_hash: passwordHash,
    role: PERAN.PELANGGAN,
    status_verifikasi: 'BELUM_VERIFIKASI',
  });

  const user = await db('User').where({ user_id: userId }).first();

  await catatAudit({
    aksi: AKSI_AUDIT.PENGGUNA_DAFTAR,
    entity: 'User',
    entityId: userId,
    aktorId: userId,
    sesudah: { nama, email, role: PERAN.PELANGGAN },
  });

  // TODO: kirim email verifikasi. Token sudah dapat diterbitkan, tetapi pengiriman
  // email menunggu konfigurasi SMTP pada .env.
  const tokenVerifikasi = terbitkanToken(user, JENIS_TOKEN.VERIFIKASI_EMAIL, '24h');

  return { pengguna: penggunaAman(user), tokenVerifikasi };
}

/** REQ-4.1.2 — verifikasi email. */
async function verifikasiEmail(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new ValidationError('Token verifikasi tidak valid atau sudah kedaluwarsa.');
  }

  if (payload.jenis !== JENIS_TOKEN.VERIFIKASI_EMAIL) {
    throw new ValidationError('Token yang dikirim bukan token verifikasi email.');
  }

  const user = await db('User').where({ user_id: payload.sub }).first();
  if (!user) throw new NotFoundError('Akun tidak ditemukan.');
  if (user.status_verifikasi === 'AKTIF') {
    return { pengguna: penggunaAman(user), sudahVerifikasi: true };
  }

  await db('User').where({ user_id: user.user_id }).update({
    status_verifikasi: 'AKTIF',
    updated_at: db.fn.now(),
  });

  return { pengguna: penggunaAman({ ...user, status_verifikasi: 'AKTIF' }), sudahVerifikasi: false };
}

/**
 * REQ-4.1.3 & REQ-4.1.5 — login dengan pembatasan percobaan gagal.
 *
 * Pembatasan dilakukan per akun. Mitigasi tambahan di level IP ada pada middleware
 * rate limiter (lihat §6.2 architecture.md).
 */
async function masuk({ email, password }, ip = null) {
  const user = await db('User').where({ email }).first();

  // Pesan galat sengaja sama untuk email tidak ada dan kata sandi salah, agar
  // tidak membocorkan email mana yang terdaftar.
  const pesanGagal = 'Email atau kata sandi salah.';

  if (!user) {
    throw new UnauthorizedError(pesanGagal);
  }

  // Akun terkunci sementara setelah beberapa percobaan gagal.
  if (user.failed_login_count >= BATAS_LOGIN_GAGAL && user.last_failed_login_at) {
    const terkunciSampai = new Date(new Date(user.last_failed_login_at).getTime() + DURASI_KUNCI_MENIT * 60000);
    if (new Date() < terkunciSampai) {
      const sisaMenit = Math.ceil((terkunciSampai - new Date()) / 60000);
      throw new ForbiddenError(
        `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenit} menit.`
      );
    }
    // Masa kunci lewat — reset penghitung.
    await db('User').where({ user_id: user.user_id }).update({ failed_login_count: 0 });
    user.failed_login_count = 0;
  }

  const cocok = await bcrypt.compare(password, user.password_hash);
  if (!cocok) {
    await db('User').where({ user_id: user.user_id }).update({
      failed_login_count: user.failed_login_count + 1,
      last_failed_login_at: db.fn.now(),
    });
    const sisa = BATAS_LOGIN_GAGAL - (user.failed_login_count + 1);
    throw new UnauthorizedError(
      sisa > 0 ? `${pesanGagal} Sisa ${sisa} percobaan sebelum akun terkunci.` : pesanGagal
    );
  }

  if (user.status_verifikasi !== 'AKTIF') {
    throw new ForbiddenError(
      'Akun belum diverifikasi. Silakan periksa email Anda untuk tautan verifikasi.'
    );
  }

  await db('User').where({ user_id: user.user_id }).update({
    failed_login_count: 0,
    last_failed_login_at: null,
  });

  await catatAudit({
    aksi: AKSI_AUDIT.PENGGUNA_LOGIN,
    entity: 'User',
    entityId: user.user_id,
    aktorId: user.user_id,
    ip,
  });

  return { pengguna: penggunaAman(user), ...terbitkanPasanganToken(user) };
}

/**
 * Perbarui token akses memakai refresh token.
 * ADR-14 konsekuensi: refresh token hanya diperiksa keabsahannya.
 * Pencabutan token dicatat sebagai celah yang belum ditutup (lihat §6.2 architecture.md).
 */
async function perbaruiToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.secret);
  } catch {
    throw new UnauthorizedError('Sesi telah berakhir. Silakan masuk kembali.');
  }

  if (payload.jenis !== JENIS_TOKEN.REFRESH) {
    throw new UnauthorizedError('Token yang dikirim bukan refresh token.');
  }

  const user = await db('User').where({ user_id: payload.sub }).first();
  if (!user) throw new UnauthorizedError('Akun tidak ditemukan.');

  return { pengguna: penggunaAman(user), ...terbitkanPasanganToken(user) };
}

/** REQ-4.1.4 — lupa kata sandi: terbitkan token reset. */
async function lupaKataSandi(email) {
  const user = await db('User').where({ email }).first();

  // Selalu balas sukses, baik email terdaftar maupun tidak, agar tidak membocorkan
  // email mana yang ada di sistem.
  if (!user) {
    return { terkirim: true };
  }

  const tokenReset = terbitkanToken(user, JENIS_TOKEN.RESET_KATA_SANDI, config.jwt.resetExpiresIn);

  // TODO: kirim email berisi tautan reset. Belum aktif sampai SMTP dikonfigurasi.
  return { terkirim: true, tokenReset };
}

/** REQ-4.1.4 — atur ulang kata sandi memakai token. */
async function aturUlangKataSandi({ token, password }) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new ValidationError('Token reset tidak valid atau sudah kedaluwarsa.');
  }

  if (payload.jenis !== JENIS_TOKEN.RESET_KATA_SANDI) {
    throw new ValidationError('Token yang dikirim bukan token reset kata sandi.');
  }

  const user = await db('User').where({ user_id: payload.sub }).first();
  if (!user) throw new NotFoundError('Akun tidak ditemukan.');

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (trx) => {
    await trx('User').where({ user_id: user.user_id }).update({
      password_hash: passwordHash,
      // Reset penghitung gagal agar akun yang terkunci dapat dipakai kembali.
      failed_login_count: 0,
      last_failed_login_at: null,
      updated_at: trx.fn.now(),
    });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PENGGUNA_UBAH,
      entity: 'User',
      entityId: user.user_id,
      aktorId: user.user_id,
      keterangan: 'Kata sandi diatur ulang melalui token reset.',
    });
  });

  return { berhasil: true };
}

/** Ambil profil pengguna yang sedang masuk. */
async function ambilProfil(userId) {
  const user = await db('User').where({ user_id: userId }).first();
  if (!user) throw new NotFoundError('Akun tidak ditemukan.');
  return penggunaAman(user);
}

/** Perbarui profil. Email sengaja tidak dapat diubah agar identitas login stabil. */
async function perbaruiProfil(userId, perubahan) {
  const user = await db('User').where({ user_id: userId }).first();
  if (!user) throw new NotFoundError('Akun tidak ditemukan.');

  await db.transaction(async (trx) => {
    await trx('User').where({ user_id: userId }).update({ ...perubahan, updated_at: trx.fn.now() });

    await catatAudit({
      trx,
      aksi: AKSI_AUDIT.PENGGUNA_UBAH,
      entity: 'User',
      entityId: userId,
      aktorId: userId,
      sebelum: { nama: user.nama, nomor_telepon: user.nomor_telepon },
      sesudah: perubahan,
    });
  });

  const diperbarui = await db('User').where({ user_id: userId }).first();
  return penggunaAman(diperbarui);
}

module.exports = {
  JENIS_TOKEN,
  daftar,
  verifikasiEmail,
  masuk,
  perbaruiToken,
  lupaKataSandi,
  aturUlangKataSandi,
  ambilProfil,
  perbaruiProfil,
  penggunaAman,
};
