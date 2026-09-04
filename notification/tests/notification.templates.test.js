const {
  welcomeEmail,
  paymentInitiatedEmail,
  paymentCompletedEmail,
  paymentFailedEmail,
  productPublishedEmail,
} = require("../src/templates/emails");

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
    () => productPublishedEmail({ username: "dhruv", title: "Aeron Chair", stock: 3 }),
  ],
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

  it("falls back to the username when no full name is present", () => {
    const { html } = welcomeEmail({ username: "dhruv27" });

    expect(html).toContain("dhruv27");
    expect(html).not.toContain("undefined");
  });
});
