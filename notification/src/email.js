const nodemailer = require("nodemailer");

const EMAIL_FROM =
  process.env.EMAIL_FROM || `HiveMind <${process.env.EMAIL_USER}>`;

let transporter = null;

function isConfigured() {
  return Boolean(
    process.env.EMAIL_USER &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });

  return transporter;
}

const sendEmail = async (to, subject, text, html) => {
  if (!isConfigured()) {
    console.warn(`Gmail is not configured, skipping email to ${to}`);
    return;
  }

  try {
    const info = await getTransporter().sendMail({
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
