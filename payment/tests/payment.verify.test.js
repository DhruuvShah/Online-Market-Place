const request = require("supertest");
const mongoose = require("mongoose");
const { signToken } = require("./setup/auth");

jest.mock("axios");

jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn() },
  })),
);

jest.mock("razorpay/dist/utils/razorpay-utils", () => ({
  validatePaymentVerification: jest.fn(),
}));

jest.mock("../src/broker/broker.js", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async () => true),
}));

const app = require("../src/app");
const paymentModel = require("../src/models/payment.model");
const outboxModel = require("../src/models/outbox.model");
const {
  validatePaymentVerification,
} = require("razorpay/dist/utils/razorpay-utils");

async function outboxPayload(queue) {
  const event = await outboxModel.findOne({ queue });
  return event?.payload;
}

const razorpayOrderId = "order_rzp_mock_1";
const paymentId = "pay_rzp_mock_1";
const signature = "valid_signature";

async function seedPendingPayment() {
  return paymentModel.create({
    order: new mongoose.Types.ObjectId(),
    razorpayOrderId,
    user: new mongoose.Types.ObjectId(),
    price: { amount: 4000, currency: "INR" },
  });
}

describe("POST /api/payments/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the payment COMPLETED on a valid signature", async () => {
    validatePaymentVerification.mockReturnValue(true);
    const payment = await seedPendingPayment();
    const token = signToken();

    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment verified successfully");

    const stored = await paymentModel.findById(payment._id);
    expect(stored.status).toBe("COMPLETED");
    expect(stored.paymentId).toBe(paymentId);
    expect(stored.signature).toBe(signature);
  });

  it("tells the order service to confirm the order", async () => {
    validatePaymentVerification.mockReturnValue(true);
    const payment = await seedPendingPayment();
    const token = signToken();

    await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature })
      .expect(200);

    const confirm = await outboxPayload("PAYMENT_ORDER.PAYMENT_COMPLETED");
    expect(confirm).toBeDefined();
    expect(String(confirm.orderId)).toBe(String(payment.order));
  });

  it("publishes the completion notification with a resolvable username", async () => {
    validatePaymentVerification.mockReturnValue(true);
    await seedPendingPayment();
    const token = signToken({ username: "dhruv", email: "d@example.com" });

    await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature })
      .expect(200);

    const completed = await outboxPayload(
      "PAYMENT_NOTIFICATION.PAYMENT_COMPLETED",
    );

    expect(completed.username).toBe("dhruv");
    expect(completed.email).toBe("d@example.com");
    expect(completed.amount).toBe(4000);
  });

  it("400 on an invalid signature and leaves the payment PENDING", async () => {
    validatePaymentVerification.mockReturnValue(false);
    const payment = await seedPendingPayment();
    const token = signToken();

    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature: "tampered" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid signature");

    const stored = await paymentModel.findById(payment._id);
    expect(stored.status).toBe("PENDING");
    expect(await outboxModel.countDocuments()).toBe(0);
  });

  it("404 when no PENDING payment matches the razorpay order", async () => {
    validatePaymentVerification.mockReturnValue(true);
    const token = signToken();

    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId: "order_unknown", paymentId, signature });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Payment not found");
  });

  it("does not re-confirm an already COMPLETED payment", async () => {
    validatePaymentVerification.mockReturnValue(true);
    const payment = await seedPendingPayment();
    payment.status = "COMPLETED";
    await payment.save();
    const token = signToken();

    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature });

    expect(res.status).toBe(404);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app)
      .post("/api/payments/verify")
      .send({ razorpayOrderId, paymentId, signature });
    expect(res.status).toBe(401);
  });

  it("403 for a seller — sellers cannot purchase", async () => {
    const token = signToken({ role: "seller" });
    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ razorpayOrderId, paymentId, signature });
    expect(res.status).toBe(403);
  });
});
