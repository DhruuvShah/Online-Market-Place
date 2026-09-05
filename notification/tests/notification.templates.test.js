const {
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
} = require("../src/templates/emails");

const sampleOrder = () => ({
  username: "dhruv",
  orderId: "652f1a2b3c4d5e6f70819203",
  currency: "INR",
  total: 143400,
  items: [
    {
      title: "Aeron Chair",
      image: "https://ik.example/chair.jpg",
      quantity: 1,
      amount: 128000,
      currency: "INR",
    },
    {
      title: "Hario V60 Dripper",
      image: "https://ik.example/v60.jpg",
      quantity: 2,
      amount: 3200,
      currency: "INR",
    },
  ],
  shippingAddress: {
    street: "12 Linking Road",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400050",
    country: "India",
  },
});

const sampleSellerOrder = () => ({
  email: "seller@example.com",
  username: "maker",
  sellerName: "Asha",
  orderId: "652f1a2b3c4d5e6f70819203",
  status: "PENDING",
  currency: "INR",
  subtotal: 134400,
  items: [
    {
      title: "Aeron Chair",
      image: "https://ik.example/chair.jpg",
      quantity: 1,
      amount: 128000,
      currency: "INR",
    },
    {
      title: "Hario V60 Dripper",
      image: "https://ik.example/v60.jpg",
      quantity: 2,
      amount: 3200,
      currency: "INR",
    },
  ],
  buyer: { name: "Dhruv Shah", email: "buyer@example.com" },
  shippingAddress: {
    street: "12 Linking Road",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400050",
    country: "India",
  },
});

const builders = [
  ["welcome", () => welcomeEmail({ email: "a@b.c", fullName: { firstName: "Dhruv" } })],
  [
    "payment initiated",
    () =>
      paymentInitiatedEmail({
        username: "dhruv",
        orderId: "652f1a2b3c4d5e6f70819203",
        amount: 4000,
        currency: "INR",
      }),
  ],
  [
    "payment completed",
    () =>
      paymentCompletedEmail({
        username: "dhruv",
        orderId: "652f1a2b3c4d5e6f70819203",
        paymentId: "pay_TXXer3cqFBVORC",
        amount: 4000,
        currency: "INR",
      }),
  ],
  [
    "payment failed",
    () => paymentFailedEmail({ username: "dhruv", orderId: "652f1a2b3c4d5e6f70819203" }),
  ],
  [
    "product published",
    () =>
      productPublishedEmail({
        username: "dhruv",
        productId: "652f1a2b3c4d5e6f70819205",
        title: "Aeron Chair",
        description: "A very good chair",
        price: { amount: 128000, currency: "INR" },
        stock: 3,
        image: "https://ik.example/chair.jpg",
        imageCount: 2,
      }),
  ],
  ["order placed", () => orderPlacedEmail(sampleOrder())],
  ["order shipped", () => orderShippedEmail(sampleOrder())],
  ["order delivered", () => orderDeliveredEmail(sampleOrder())],
  ["order cancelled", () => orderCancelledEmail(sampleOrder())],
  ["seller order", () => sellerOrderEmail(sampleSellerOrder())],
];

describe("email templates", () => {
  it.each(builders)("%s renders a complete branded document", (_name, build) => {
    const { subject, text, html } = build();

    expect(subject).toBeTruthy();
    expect(text).toBeTruthy();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("HiveMind");
    expect(html).toContain("/privacy");
    expect(html).toContain("/terms");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toContain("NaN");
  });

  it("greets a buyer and a seller differently", () => {
    const buyer = welcomeEmail({ fullName: { firstName: "Dhruv" }, role: "user" });
    const seller = welcomeEmail({ fullName: { firstName: "Dhruv" }, role: "seller" });

    expect(buyer.html).toContain("Browse the catalog");
    expect(seller.html).toContain("list products");
    expect(seller.html).toContain("/seller");
  });

  it("formats money as rupees rather than a bare number", () => {
    const { html } = paymentCompletedEmail({
      username: "dhruv",
      orderId: "order_1",
      paymentId: "pay_1",
      amount: 4000,
      currency: "INR",
    });

    expect(html).toContain("₹4,000");
  });

  it("tells a failed payer they were not charged", () => {
    const { html, text } = paymentFailedEmail({
      username: "dhruv",
      orderId: "order_1",
    });

    expect(text).toContain("not charged");
    expect(html).toContain("No money left your account.");
  });

  it("gives each event a distinct subject line", () => {
    const subjects = builders.map(([, build]) => build().subject);
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it("puts every product image, name and quantity in an order receipt", () => {
    const { html, text, subject } = orderPlacedEmail(sampleOrder());

    expect(html).toContain("https://ik.example/chair.jpg");
    expect(html).toContain("https://ik.example/v60.jpg");
    expect(html).toContain("Aeron Chair");
    expect(html).toContain("Hario V60 Dripper");
    expect(html).toContain("Qty 2");
    expect(subject).toContain("1,43,400");

    expect(text).toContain("Aeron Chair x1");
    expect(text).toContain("Hario V60 Dripper x2");
  });

  it("prices order lines by quantity rather than repeating the unit price", () => {
    const { html } = orderPlacedEmail(sampleOrder());

    // 3200 x 2 = 6400 for the dripper line.
    expect(html).toContain("6,400");
  });

  it("shows the delivery address on an order receipt", () => {
    const { html, text } = orderPlacedEmail(sampleOrder());

    expect(html).toContain("12 Linking Road");
    expect(html).toContain("Mumbai, Maharashtra");
    expect(html).toContain("400050");
    expect(text).toContain("12 Linking Road");
  });

  it("tells a cancelled order apart from a placed one", () => {
    const placed = orderPlacedEmail(sampleOrder());
    const cancelled = orderCancelledEmail(sampleOrder());

    expect(placed.subject).not.toBe(cancelled.subject);
    expect(placed.html).toContain("Order placed");
    expect(cancelled.html).toContain("Order cancelled");
    expect(cancelled.html).toContain("back into the catalog");
    expect(cancelled.html).toContain("refund");
  });

  it("gives each fulfilment stage its own subject and heading", () => {
    const shipped = orderShippedEmail(sampleOrder());
    const delivered = orderDeliveredEmail(sampleOrder());

    expect(shipped.subject).not.toBe(delivered.subject);
    expect(shipped.subject).toMatch(/on its way/i);
    expect(delivered.subject).toMatch(/delivered/i);
    expect(shipped.html).toContain("Shipped");
    expect(delivered.html).toContain("Delivered");
  });

  it("carries the items and the address through the fulfilment emails", () => {
    for (const build of [orderShippedEmail, orderDeliveredEmail]) {
      const { html, text } = build(sampleOrder());

      expect(html).toContain("Aeron Chair");
      expect(html).toContain("https://ik.example/chair.jpg");
      expect(html).toContain("12 Linking Road");
      expect(text).toContain("Aeron Chair");
    }
  });

  it("links a shipped order back to its tracking page", () => {
    const { html, text } = orderShippedEmail(sampleOrder());

    expect(html).toContain("/orders/652f1a2b3c4d5e6f70819203");
    expect(text).toContain("/orders/652f1a2b3c4d5e6f70819203");
  });

  it("renders an order with no saved address without breaking", () => {
    const { html } = orderPlacedEmail({
      ...sampleOrder(),
      shippingAddress: null,
    });

    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  it("shows a seller the photo, stock and description of a new listing", () => {
    const { html, text } = productPublishedEmail({
      username: "dhruv",
      productId: "652f1a2b3c4d5e6f70819205",
      title: "Aeron Chair",
      description: "The ergonomic office chair other chairs are measured against.",
      price: { amount: 128000, currency: "INR" },
      stock: 12,
      image: "https://ik.example/chair.jpg",
      imageCount: 3,
    });

    expect(html).toContain("https://ik.example/chair.jpg");
    expect(html).toContain("measured against");
    expect(html).toContain("12 units");
    expect(html).toContain("3 of 5");
    expect(html).toContain("1,28,000");
    expect(text).toContain("Stock: 12 units");
  });

  it("warns a seller whose listing has no photo", () => {
    const { html } = productPublishedEmail({
      username: "dhruv",
      productId: "652f1a2b3c4d5e6f70819205",
      title: "Aeron Chair",
      price: { amount: 128000, currency: "INR" },
      stock: 12,
      imageCount: 0,
    });

    expect(html).toContain("no photo yet");
  });

  it("gives a seller the buyer, the products, the images and the address", () => {
    const { html, text, subject } = sellerOrderEmail(sampleSellerOrder());

    expect(html).toContain("Dhruv Shah");
    expect(html).toContain("buyer@example.com");
    expect(html).toContain("https://ik.example/chair.jpg");
    expect(html).toContain("Aeron Chair");
    expect(html).toContain("Qty 2");
    expect(html).toContain("12 Linking Road");
    expect(html).toContain("Mumbai, Maharashtra");
    expect(html).toContain("1,34,400");
    expect(subject).toContain("3 items");

    expect(text).toContain("Dhruv Shah");
    expect(text).toContain("Buyer email: buyer@example.com");
    expect(text).toContain("Hario V60 Dripper x2");
  });

  it("sends a seller somewhere different from where it sends a buyer", () => {
    const seller = sellerOrderEmail(sampleSellerOrder());
    const buyer = orderPlacedEmail(sampleOrder());

    expect(seller.html).toContain("/seller/orders");
    expect(seller.subject).not.toBe(buyer.subject);
    expect(seller.html).toContain("New order");
  });

  it("renders a seller order from an unnamed buyer without printing null", () => {
    const { html } = sellerOrderEmail({
      ...sampleSellerOrder(),
      buyer: { name: null, email: null },
    });

    expect(html).toContain("A shopper");
    expect(html).not.toContain("null");
    expect(html).not.toContain("undefined");
  });

  it("falls back to the username when no full name is present", () => {
    const { html } = welcomeEmail({ username: "dhruv27" });

    expect(html).toContain("dhruv27");
    expect(html).not.toContain("undefined");
  });
});
