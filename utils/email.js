const nodemailer = require('nodemailer');
const { getSetting } = require('./db');

function createTransporter() {
  // Try database settings first, fall back to env vars
  const host = getSetting('smtp_host') || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(getSetting('smtp_port') || process.env.SMTP_PORT) || 587;
  const user = getSetting('smtp_user') || process.env.SMTP_USER;
  const pass = getSetting('smtp_pass') || process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: false,
    auth: {
      user: user,
      pass: pass
    }
  });
}

async function sendEmail(to, subject, html) {
  const transporter = createTransporter();

  // Get from settings
  const fromEmail = getSetting('from_email') || 'contact@insuffle.com';
  const fromName = getSetting('from_name') || 'Insuffle';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: to,
    subject: subject,
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail
};
