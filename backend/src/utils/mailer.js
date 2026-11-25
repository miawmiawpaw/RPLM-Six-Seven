const { MailtrapClient } = require('mailtrap');
const config = require('../config');

/**
 * Kirim email lewat Mailtrap Email API.
 * Tanpa MAILTRAP_API_TOKEN: pada pengembangan isi email dicetak ke konsol; pada produksi gagal.
 */
async function kirimEmail({ to, subject, text }) {
  const { apiToken, fromEmail, fromName } = config.mail;

  if (!apiToken) {
    if (config.isProduction) throw new Error('Mailtrap belum dikonfigurasi (MAILTRAP_API_TOKEN kosong).');
    console.log(`[EMAIL-DEV] ke=${to} subjek="${subject}"\n${text}`);
    return;
  }

  await new MailtrapClient({ token: apiToken }).send({
    from: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject,
    text,
    category: 'Rental Camping',
  });
}

module.exports = { kirimEmail };
