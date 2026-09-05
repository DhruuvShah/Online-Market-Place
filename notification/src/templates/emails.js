const {
  APP_URL,
  addressBlock,
  escapeHtml,
  formatMoney,
  itemsTable,
  noteBlock,
  paragraph,
  renderLayout,
  summaryTable,
  totalRow,
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

function itemCount(items = []) {
  const units = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  return `${units} ${units === 1 ? "item" : "items"}`;
}

function plainItems(items = [], currency = "INR") {
  return items
    .map(
      (item) =>
        `- ${item.title || "Product"} x${item.quantity} — ${formatMoney(
          Number(item.amount) * (Number(item.quantity) || 1),
          currency,
        )}`,
    )
    .join("\n");
}

function plainAddress(address) {
  if (!address) return "";
  return [
    address.street,
    [address.city, address.state].filter(Boolean).join(", "),
    address.zip,
    address.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function orderPlacedEmail(data) {
  const items = data.items ?? [];
  const currency = data.currency || "INR";
  const total = formatMoney(data.total, currency);
  const reference = shortId(data.orderId);

  const body = [
    paragraph(
      `Thank you, ${escapeHtml(data.username || "there")}. We have your order and the stock is reserved against it. Here is exactly what is on its way.`,
    ),
    itemsTable(items, currency),
    totalRow("Order total", total),
    addressBlock(data.shippingAddress),
    summaryTable([
      { label: "Order reference", value: reference, mono: true },
      { label: "Items", value: itemCount(items) },
      { label: "Status", value: "Placed — awaiting payment" },
    ]),
    noteBlock(
      "Nothing ships until payment clears. If you closed the payment window, you can pay for this order again without rebuilding your cart.",
    ),
  ].join("");

  return {
    subject: `Order ${reference} placed — ${total}`,
    text: [
      `Thank you, ${data.username || "there"}. Your order ${reference} has been placed.`,
      "",
      plainItems(items, currency),
      "",
      `Total: ${total}`,
      "",
      "Delivering to:",
      plainAddress(data.shippingAddress),
      "",
      `Track it: ${APP_URL}/orders/${data.orderId}`,
    ].join("\n"),
    html: renderLayout({
      preheader: `${itemCount(items)} reserved — ${total}.`,
      eyebrow: "Order placed",
      heading: "We have your order",
      body,
      cta: { label: "Track your order", url: `${APP_URL}/orders/${data.orderId}` },
      footerNote: `Order ${reference}. Keep this email for your records.`,
    }),
  };
}

function orderCancelledEmail(data) {
  const items = data.items ?? [];
  const currency = data.currency || "INR";
  const total = formatMoney(data.total, currency);
  const reference = shortId(data.orderId);

  const body = [
    paragraph(
      `Hello ${escapeHtml(data.username || "there")}, order ${escapeHtml(reference)} has been cancelled and every item on it has gone back into the catalog.`,
    ),
    itemsTable(items, currency),
    totalRow("Cancelled total", total),
    addressBlock(data.shippingAddress, "Was going to"),
    noteBlock(
      "If you paid for this order, the refund is issued to your original payment method and typically settles within five to seven working days.",
    ),
    paragraph(
      "Changed your mind again? The items above are back in stock, so you can reorder them while they last.",
    ),
  ].join("");

  return {
    subject: `Order ${reference} cancelled`,
    text: [
      `Order ${reference} has been cancelled and the stock returned to the catalog.`,
      "",
      plainItems(items, currency),
      "",
      `Cancelled total: ${total}`,
      "",
      `Browse again: ${APP_URL}/discover`,
    ].join("\n"),
    html: renderLayout({
      preheader: `Order ${reference} cancelled — stock released.`,
      eyebrow: "Order cancelled",
      heading: "Your order has been cancelled",
      body,
      cta: { label: "Back to the catalog", url: `${APP_URL}/discover` },
      footerNote: `Order ${reference}. Nothing further is required from you.`,
    }),
  };
}

function orderShippedEmail(data) {
  const items = data.items ?? [];
  const currency = data.currency || "INR";
  const total = formatMoney(data.total, currency);
  const reference = shortId(data.orderId);

  const body = [
    paragraph(
      `Good news, ${escapeHtml(data.username || "there")} — order ${escapeHtml(reference)} has left the seller and is on its way to you.`,
    ),
    itemsTable(items, currency),
    totalRow("Order total", total),
    addressBlock(data.shippingAddress, "Delivering to"),
    summaryTable([
      { label: "Order reference", value: reference, mono: true },
      { label: "Items", value: itemCount(items) },
      { label: "Status", value: "Shipped" },
    ]),
    noteBlock(
      "You can follow the remaining stages from your orders page. We will email you once it has been delivered.",
    ),
  ].join("");

  return {
    subject: `Order ${reference} is on its way`,
    text: [
      `Order ${reference} has shipped and is on its way to you.`,
      "",
      plainItems(items, currency),
      "",
      `Total: ${total}`,
      "",
      "Delivering to:",
      plainAddress(data.shippingAddress),
      "",
      `Track it: ${APP_URL}/orders/${data.orderId}`,
    ].join("\n"),
    html: renderLayout({
      preheader: `${itemCount(items)} on the way — ${total}.`,
      eyebrow: "Shipped",
      heading: "Your order is on its way",
      body,
      cta: {
        label: "Track your order",
        url: `${APP_URL}/orders/${data.orderId}`,
      },
      footerNote: `Order ${reference}. Keep this email for your records.`,
    }),
  };
}

function orderDeliveredEmail(data) {
  const items = data.items ?? [];
  const currency = data.currency || "INR";
  const total = formatMoney(data.total, currency);
  const reference = shortId(data.orderId);

  const body = [
    paragraph(
      `Delivered. Order ${escapeHtml(reference)} has been handed over at your shipping address — we hope it was worth the wait.`,
    ),
    itemsTable(items, currency),
    totalRow("Order total", total),
    addressBlock(data.shippingAddress, "Delivered to"),
    summaryTable([
      { label: "Order reference", value: reference, mono: true },
      { label: "Items", value: itemCount(items) },
      { label: "Status", value: "Delivered" },
    ]),
    noteBlock(
      "Something not right? Reply to this email with your order reference and we will pick it up from there.",
    ),
  ].join("");

  return {
    subject: `Order ${reference} delivered`,
    text: [
      `Order ${reference} has been delivered.`,
      "",
      plainItems(items, currency),
      "",
      `Total: ${total}`,
      "",
      "Delivered to:",
      plainAddress(data.shippingAddress),
      "",
      `View the order: ${APP_URL}/orders/${data.orderId}`,
    ].join("\n"),
    html: renderLayout({
      preheader: `${itemCount(items)} delivered — ${total}.`,
      eyebrow: "Delivered",
      heading: "Your order has arrived",
      body,
      cta: {
        label: "View your order",
        url: `${APP_URL}/orders/${data.orderId}`,
      },
      footerNote: `Order ${reference}. Thank you for shopping with HiveMind.`,
    }),
  };
}

function sellerOrderEmail(data) {
  const items = data.items ?? [];
  const currency = data.currency || "INR";
  const subtotal = formatMoney(data.subtotal, currency);
  const reference = shortId(data.orderId);
  const units = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0,
  );
  const buyer = data.buyer?.name || "A shopper";

  // Everything needed to pack and post the parcel, in the order a seller works
  // through it: what to pick, what it earned, who it is for, where it goes.
  const body = [
    paragraph(
      `${escapeHtml(buyer)} has ordered ${units === 1 ? "an item" : `${units} items`} from you. Here is everything you need to get it out of the door.`,
    ),
    itemsTable(items, currency),
    totalRow("Your subtotal", subtotal),
    addressBlock(data.shippingAddress, "Ship to"),
    summaryTable([
      { label: "Buyer", value: data.buyer?.name || "", strong: true },
      { label: "Buyer email", value: data.buyer?.email || "" },
      { label: "Order reference", value: reference, mono: true },
      { label: "Units to pack", value: String(units), mono: true },
      { label: "Status", value: data.status || "PENDING" },
    ]),
    noteBlock(
      "Stock for these items is already reserved against this order, so your inventory is up to date. Cancel and the stock returns automatically.",
    ),
  ].join("");

  return {
    subject: `New order — ${units} ${units === 1 ? "item" : "items"}, ${subtotal}`,
    text: [
      `${buyer} has placed an order with you.`,
      "",
      plainItems(items, currency),
      "",
      `Your subtotal: ${subtotal}`,
      data.buyer?.email ? `Buyer email: ${data.buyer.email}` : "",
      "",
      "Ship to:",
      plainAddress(data.shippingAddress),
      "",
      `Order ${reference} — ${APP_URL}/seller/orders`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderLayout({
      preheader: `${buyer} ordered ${units} ${units === 1 ? "item" : "items"} — ${subtotal}.`,
      eyebrow: "New order",
      heading: "You have a new order",
      body,
      cta: { label: "Open your orders", url: `${APP_URL}/seller/orders` },
      footerNote: `Order ${reference}. You are receiving this because you sell on HiveMind.`,
    }),
  };
}

function productPublishedEmail(data) {
  const title = data.title || shortId(data.productId);
  const price = data.price
    ? formatMoney(data.price.amount, data.price.currency)
    : null;
  const stock = Number(data.stock);
  const hasStock = Number.isFinite(stock);

  // The listing is shown back exactly as a shopper sees it, so a wrong price or
  // a missing photo is obvious from the email instead of from a lost sale.
  const preview = itemsTable(
    [
      {
        title,
        image: data.image,
        quantity: hasStock ? stock : 1,
        amount: data.price?.amount ?? 0,
      },
    ],
    data.price?.currency || "INR",
  );

  const body = [
    paragraph(
      `Hello ${escapeHtml(data.username || "there")}, your listing is live and shoppers can find it in the catalog right now. This is how it appears to them.`,
    ),
    preview,
    data.description
      ? paragraph(
          `<span style="color:#14130f;">Description</span><br>${escapeHtml(data.description)}`,
        )
      : "",
    summaryTable([
      { label: "Product", value: title, strong: true },
      price ? { label: "Price", value: price, mono: true, strong: true } : {},
      hasStock
        ? { label: "Stock available", value: `${stock} units`, mono: true }
        : {},
      data.imageCount !== undefined
        ? {
            label: "Photos",
            value: `${data.imageCount} of 5`,
            mono: true,
          }
        : {},
      { label: "Reference", value: shortId(data.productId), mono: true },
    ]),
    noteBlock(
      !data.image
        ? "This listing has no photo yet. Products without a photo are passed over far more often than those with one — you can add up to five from the product editor."
        : hasStock && stock <= 5
          ? `Only ${stock} in stock. Raise the stock level from the product editor before it sells out.`
          : "Listings with a clear photo and an honest description sell considerably more than those without.",
    ),
  ].join("");

  return {
    subject: `Your listing is live: ${title}`,
    text: [
      `Your product "${title}" is now live in the HiveMind catalog.`,
      price ? `Price: ${price}` : "",
      hasStock ? `Stock: ${stock} units` : "",
      data.description ? `\n${data.description}` : "",
      `\nManage it: ${APP_URL}/seller/products`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderLayout({
      preheader: `${title} is now in the catalog${price ? ` at ${price}` : ""}.`,
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
  orderPlacedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  sellerOrderEmail,
  paymentInitiatedEmail,
  paymentCompletedEmail,
  paymentFailedEmail,
  productPublishedEmail,
};
