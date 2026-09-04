const {
  APP_URL,
  escapeHtml,
  formatMoney,
  noteBlock,
  paragraph,
  renderLayout,
  summaryTable,
} = require("./layout");

function displayName(data) {
  const first = data.fullName?.firstName;
  const last = data.fullName?.lastName;

  if (first) return [first, last].filter(Boolean).join(" ");
  return data.username || "there";
}

function shortId(value) {
  const id = String(value ?? "");
  return id.length > 12 ? id.slice(-12).toUpperCase() : id;
}

function welcomeEmail(data) {
  const name = displayName(data);
  const isSeller = data.role === "seller";

  const body = [
    paragraph(`Hello ${escapeHtml(name)}, your account is ready.`),
    paragraph(
      isSeller
        ? "You can list products, set your own stock levels, and watch orders arrive from your dashboard. Everything you list appears in the catalog straight away."
        : "Browse the catalog, build a cart, and check out when you are ready. Stock is reserved the moment you check out, so nothing sells out from under you at the last second.",
    ),
    noteBlock(
      isSeller
        ? "Your first listing is the hardest. Add a clear photo and an honest description and you are done."
        : "Not sure what you want? Describe it to the shopping assistant in plain language and it will search the catalog for you.",
    ),
  ].join("");

  return {
    subject: `Welcome to HiveMind, ${name}`,
    text: `Hello ${name}, your HiveMind account is ready. ${
      isSeller
        ? "List your first product from the seller dashboard."
        : "Browse the catalog and start shopping."
    } ${APP_URL}`,
    html: renderLayout({
      preheader: "Your HiveMind account is ready.",
      eyebrow: isSeller ? "Seller account" : "Welcome",
      heading: `Welcome to HiveMind, ${name}`,
      body,
      cta: {
        label: isSeller ? "Open your dashboard" : "Start browsing",
        url: isSeller ? `${APP_URL}/seller` : `${APP_URL}/discover`,
      },
      footerNote: "You are receiving this because an account was created with this address.",
    }),
  };
}

function paymentInitiatedEmail(data) {
  const amount = formatMoney(data.amount, data.currency);

  const body = [
    paragraph(
      `Hello ${escapeHtml(data.username || "there")}, we have started processing your payment. Nothing has been charged yet.`,
    ),
    summaryTable([
      { label: "Order", value: shortId(data.orderId), mono: true },
      { label: "Amount", value: amount, strong: true, mono: true },
      { label: "Status", value: "Awaiting confirmation" },
    ]),
    paragraph(
      "You will get a confirmation from us the moment your bank clears it. This usually takes a few seconds.",
    ),
  ].join("");

  return {
    subject: `Payment started for order ${shortId(data.orderId)}`,
    text: `Your payment of ${amount} for order ${shortId(data.orderId)} is being processed. We will confirm once it clears.`,
    html: renderLayout({
      preheader: `${amount} is being processed.`,
      eyebrow: "Payment started",
      heading: "We are processing your payment",
      body,
      cta: { label: "View your order", url: `${APP_URL}/orders/${data.orderId}` },
      footerNote: "If you did not start this payment, contact us straight away.",
    }),
  };
}

function paymentCompletedEmail(data) {
  const amount = formatMoney(data.amount, data.currency);

  const body = [
    paragraph(
      `Thank you, ${escapeHtml(data.username || "there")}. Your payment cleared and your order is confirmed.`,
    ),
    summaryTable([
      { label: "Order", value: shortId(data.orderId), mono: true },
      { label: "Payment", value: shortId(data.paymentId), mono: true },
      { label: "Amount paid", value: amount, strong: true, mono: true },
      { label: "Status", value: "Confirmed" },
    ]),
    paragraph(
      "The seller has been notified and will prepare your order. You can follow its progress from your orders page at any time.",
    ),
  ].join("");

  return {
    subject: `Order ${shortId(data.orderId)} confirmed`,
    text: `Your payment of ${amount} cleared. Order ${shortId(data.orderId)} is confirmed. Payment reference ${shortId(data.paymentId)}.`,
    html: renderLayout({
      preheader: `Order confirmed — ${amount} paid.`,
      eyebrow: "Order confirmed",
      heading: "Your order is confirmed",
      body,
      cta: { label: "Track your order", url: `${APP_URL}/orders/${data.orderId}` },
      footerNote: "Keep this email as your receipt.",
    }),
  };
}

function paymentFailedEmail(data) {
  const body = [
    paragraph(
      `Hello ${escapeHtml(data.username || "there")}, your payment did not go through and you have not been charged.`,
    ),
    summaryTable([
      { label: "Order", value: shortId(data.orderId), mono: true },
      { label: "Status", value: "Payment failed" },
    ]),
    noteBlock(
      "Your order is saved and the items are still held against it. You can pay again from your orders page without rebuilding your cart.",
    ),
    paragraph(
      "Payments usually fail because a bank declined the transaction or the payment window was closed early. Trying again normally works.",
    ),
  ].join("");

  return {
    subject: `Payment did not go through for order ${shortId(data.orderId)}`,
    text: `Your payment for order ${shortId(data.orderId)} failed and you were not charged. Your order is saved and you can try again.`,
    html: renderLayout({
      preheader: "You have not been charged.",
      eyebrow: "Payment failed",
      heading: "Your payment did not go through",
      body,
      cta: { label: "Try again", url: `${APP_URL}/orders/${data.orderId}` },
      footerNote: "No money left your account.",
    }),
  };
}

function productPublishedEmail(data) {
  const body = [
    paragraph(
      `Hello ${escapeHtml(data.username || "there")}, your listing is live and buyers can find it in the catalog now.`,
    ),
    summaryTable([
      { label: "Product", value: data.title || shortId(data.productId), strong: true },
      data.price
        ? {
            label: "Price",
            value: formatMoney(data.price.amount, data.price.currency),
            mono: true,
          }
        : {},
      data.stock !== undefined ? { label: "Stock", value: String(data.stock), mono: true } : {},
    ]),
    noteBlock(
      "Listings with a clear photo and an honest description sell considerably more than those without.",
    ),
  ].join("");

  return {
    subject: `Your listing is live: ${data.title || shortId(data.productId)}`,
    text: `Your product ${data.title || shortId(data.productId)} is now live in the HiveMind catalog.`,
    html: renderLayout({
      preheader: "Your product is now in the catalog.",
      eyebrow: "Listing published",
      heading: "Your product is live",
      body,
      cta: { label: "View your products", url: `${APP_URL}/seller/products` },
      footerNote: "You are receiving this because you listed a product on HiveMind.",
    }),
  };
}

module.exports = {
  welcomeEmail,
  paymentInitiatedEmail,
  paymentCompletedEmail,
  paymentFailedEmail,
  productPublishedEmail,
};
