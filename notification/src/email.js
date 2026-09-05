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

// Gmail's submission ports. 465 is implicit TLS and is the default; 587 is
// STARTTLS and is the one to try when a host blocks or drops 465, which some
// networks do. Overridable so switching is a config change, not a deploy.
const SMTP_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.EMAIL_PORT) || 465;

function getTransporter() {
  if (transporter) return transporter;

  const auth = authStrategy();
  if (!auth) return null;

  const secure = SMTP_PORT === 465;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure,
    // On 587 the connection starts in the clear, so insist it is upgraded
    // rather than letting credentials go out unencrypted if STARTTLS is
    // missing from the greeting.
    requireTLS: !secure,
    auth,
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 3,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  return transporter;
}

// Network-level failures worth another go. ENETUNREACH and EHOSTUNREACH show
// up when the host resolves to an address family it cannot actually route to,
// which can differ between attempts if the resolver returns several addresses.
const TRANSIENT_CODES = [
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNECTION",
  "ESOCKET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EAI_AGAIN",
  "EDNS",
];

function isTransient(error) {
  const code = Number(error.responseCode);
  if (code >= 400 && code < 500) return true;

  return TRANSIENT_CODES.includes(error.code);
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
        // The code and the message together name the host, port and address
        // family that failed, which is what makes the next one diagnosable.
        console.error(
          `Failed to send "${subject}" to ${to} via ${SMTP_HOST}:${SMTP_PORT} [${
            error.code || "no code"
          }]:`,
          error.message,
        );
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
