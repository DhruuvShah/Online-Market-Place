const nodemailer = require("nodemailer");

const EMAIL_FROM =
  process.env.EMAIL_FROM || `HiveMind <${process.env.EMAIL_USER}>`;

let transporter = null;

function authStrategy() {
  if (!process.env.EMAIL_USER) return null;

  if (process.env.EMAIL_APP_PASSWORD) {
    return {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD.replace(/\s/g, ""),
    };
  }

  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    };
  }

  return null;
}

function getTransporter() {
  if (transporter) return transporter;

  const auth = authStrategy();
  if (!auth) return null;

  transporter = nodemailer.createTransport({ service: "gmail", auth });
  return transporter;
}

const sendEmail = async (to, subject, text, html) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn(`Gmail is not configured, skipping email to ${to}`);
    return;
  }

  try {
    const info = await mailer.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent to ${to} (${info.messageId})`);
  } catch (error) {
    console.error(`Failed to send "${subject}" to ${to}:`, error.message);
  }
};

module.exports = { sendEmail };
