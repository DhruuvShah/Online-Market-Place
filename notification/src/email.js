const nodemailer = require("nodemailer");

const configuredFrom = process.env.EMAIL_FROM;

const EMAIL_FROM =
  configuredFrom && configuredFrom.includes("@")
    ? configuredFrom
    : `${configuredFrom || "HiveMind"} <${process.env.EMAIL_USER}>`;

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [2000, 6000];

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

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth,
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 3,
  });

  return transporter;
}

function isTransient(error) {
  const code = Number(error.responseCode);
  if (code >= 400 && code < 500) return true;

  return ["ETIMEDOUT", "ECONNRESET", "ECONNECTION", "ESOCKET"].includes(
    error.code,
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmail = async (to, subject, text, html) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn(`Gmail is not configured, skipping email to ${to}`);
    return;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const info = await mailer.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      console.log(`Email sent to ${to} (${info.messageId})`);
      return;
    } catch (error) {
      const retryable = isTransient(error) && attempt < MAX_ATTEMPTS;

      if (!retryable) {
        console.error(`Failed to send "${subject}" to ${to}:`, error.message);
        return;
      }

      console.warn(
        `Send to ${to} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying: ${error.message}`,
      );
      await wait(RETRY_DELAYS[attempt - 1]);
    }
  }
};

module.exports = { sendEmail };
