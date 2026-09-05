const BRAND = {
  canvas: "#f5f3ee",
  raised: "#fbfaf7",
  ink: "#14130f",
  muted: "#6b675e",
  subtle: "#918c81",
  line: "#ded9cf",
  accent: "#d94e1f",
  contrast: "#fdfcfa",
};

const DISPLAY_FONT = "Georgia, 'Times New Roman', serif";
const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO_FONT = "'SF Mono', Menlo, Consolas, monospace";

const APP_URL = process.env.APP_URL || "https://hivemind.vercel.app";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount, currency = "INR") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";

  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function paragraph(text) {
  return `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:15px;line-height:1.65;color:${BRAND.muted};">${text}</p>`;
}

function summaryTable(rows) {
  const cells = rows
    .filter((row) => row.value !== undefined && row.value !== null && row.value !== "")
    .map(
      (row, index) => `
        <tr>
          <td style="padding:${index === 0 ? "0" : "10px"} 0 10px;font-family:${BODY_FONT};font-size:14px;color:${BRAND.muted};">${escapeHtml(row.label)}</td>
          <td align="right" style="padding:${index === 0 ? "0" : "10px"} 0 10px;font-family:${row.mono ? MONO_FONT : BODY_FONT};font-size:14px;color:${BRAND.ink};font-weight:${row.strong ? "600" : "400"};">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.line};border-radius:12px;background:${BRAND.raised};">
      <tr><td style="padding:20px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>
      </td></tr>
    </table>`;
}

// A 64px thumbnail beside every line. Mail clients that block images fall back
// to the bordered placeholder cell rather than collapsing the row.
function itemsTable(items = [], currency = "INR") {
  const rows = items
    .map((item) => {
      const quantity = Number(item.quantity) || 1;
      const lineTotal = formatMoney(Number(item.amount) * quantity, currency);
      const thumb = item.image
        ? `<img src="${escapeHtml(item.image)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;border:1px solid ${BRAND.line};">`
        : `<span style="display:block;width:64px;height:64px;border-radius:8px;border:1px solid ${BRAND.line};background:${BRAND.canvas};"></span>`;

      return `
        <tr>
          <td width="64" valign="top" style="padding:14px 14px 14px 0;">${thumb}</td>
          <td valign="top" style="padding:14px 0;">
            <p style="margin:0 0 4px;font-family:${BODY_FONT};font-size:15px;line-height:1.4;color:${BRAND.ink};font-weight:600;">${escapeHtml(item.title || "Product")}</p>
            <p style="margin:0;font-family:${MONO_FONT};font-size:13px;color:${BRAND.subtle};">Qty ${quantity} &middot; ${formatMoney(item.amount, currency)} each</p>
          </td>
          <td align="right" valign="top" style="padding:14px 0 14px 14px;font-family:${MONO_FONT};font-size:14px;color:${BRAND.ink};white-space:nowrap;">${lineTotal}</td>
        </tr>`;
    })
    .join(
      `<tr><td colspan="3" style="padding:0;"><div style="height:1px;background:${BRAND.line};"></div></td></tr>`,
    );

  if (!rows) return "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.line};border-radius:12px;background:${BRAND.raised};">
      <tr><td style="padding:6px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td></tr>
    </table>`;
}

function addressBlock(address, label = "Delivering to") {
  if (!address) return "";

  const lines = [
    address.street,
    [address.city, address.state].filter(Boolean).join(", "),
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:18px 20px;border:1px solid ${BRAND.line};border-radius:12px;">
        <p style="margin:0 0 8px;font-family:${MONO_FONT};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.subtle};">${escapeHtml(label)}</p>
        <p style="margin:0;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${BRAND.ink};">${lines}</p>
      </td></tr>
    </table>`;
}

function totalRow(label, value) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:14px 0 0;border-top:2px solid ${BRAND.ink};font-family:${BODY_FONT};font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(label)}</td>
        <td align="right" style="padding:14px 0 0;border-top:2px solid ${BRAND.ink};font-family:${MONO_FONT};font-size:18px;font-weight:600;color:${BRAND.ink};">${escapeHtml(value)}</td>
      </tr>
    </table>`;
}

function noteBlock(text) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-left:3px solid ${BRAND.accent};">
      <tr><td style="padding:2px 0 2px 16px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${BRAND.muted};">${text}</td></tr>
    </table>`;
}

function button(label, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr><td style="border-radius:999px;background:${BRAND.accent};">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:${BODY_FONT};font-size:15px;font-weight:600;color:${BRAND.contrast};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

function renderLayout({ preheader, eyebrow, heading, body, cta, footerNote }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};">
  <tr><td align="center" style="padding:40px 16px;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <tr><td style="padding:0 0 28px;">
        <span style="font-family:${DISPLAY_FONT};font-size:20px;letter-spacing:-0.3px;color:${BRAND.ink};">HiveMind</span>
        <span style="display:inline-block;width:22px;height:2px;background:${BRAND.accent};vertical-align:middle;margin-left:10px;"></span>
      </td></tr>

      <tr><td style="background:${BRAND.raised};border:1px solid ${BRAND.line};border-radius:20px;padding:36px 32px;">

        <p style="margin:0 0 14px;font-family:${MONO_FONT};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.subtle};">${escapeHtml(eyebrow)}</p>

        <h1 style="margin:0 0 20px;font-family:${DISPLAY_FONT};font-size:30px;line-height:1.15;font-weight:400;color:${BRAND.ink};">${escapeHtml(heading)}</h1>

        ${body}

        ${cta ? button(cta.label, cta.url) : ""}

      </td></tr>

      <tr><td style="padding:26px 4px 0;">
        <p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${BRAND.subtle};">${footerNote ? escapeHtml(footerNote) : ""}</p>
        <p style="margin:0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${BRAND.subtle};">
          HiveMind &middot; a marketplace built by many hands<br>
          <a href="${APP_URL}/privacy" style="color:${BRAND.subtle};">Privacy</a> &nbsp;&middot;&nbsp;
          <a href="${APP_URL}/terms" style="color:${BRAND.subtle};">Terms</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

module.exports = {
  APP_URL,
  BRAND,
  addressBlock,
  button,
  escapeHtml,
  formatMoney,
  itemsTable,
  noteBlock,
  paragraph,
  renderLayout,
  summaryTable,
  totalRow,
};
