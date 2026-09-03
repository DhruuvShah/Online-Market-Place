const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || "HiveMind <onboarding@resend.dev>";

const sendEmail = async (to, subject, text, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY is not set, skipping email to ${to}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error(`Failed to send "${subject}" to ${to}:`, error.message);
      return;
    }

    console.log(`Email sent to ${to} (${data.id})`);
  } catch (error) {
    console.error(`Failed to send "${subject}" to ${to}:`, error.message);
  }
};

module.exports = { sendEmail };
