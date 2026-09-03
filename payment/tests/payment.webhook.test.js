const crypto = require("crypto");
const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("axios");

jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({ orders: { create: jest.fn() } })),
);

jest.mock("../src/broker/broker.js", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async () => true),
}));

const app = require("../src/app");
const paymentModel = require("../src/models/payment.model");
const outboxModel = require("../src/models/outbox.model");

const WEBHOOK_SECRET = "test_webhook_secret";
const endpoint = "/api/payments/webhook";
const razorpayOrderId = "order_rzp_hook_1";

beforeAll(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function sign(body, secret = WEBHOOK_SECRET) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");
}

function eventBody(event, paymentId = "pay_rzp_hook_1") {
  return {
    event,
    payload: {
      payment: { entity: { id: paymentId, order_id: razorpayOrderId } },
    },
  };
}

function seedPayment(status = "PENDING") {
  return paymentModel.create({
    order: new mongoose.Types.ObjectId(),
    razorpayOrderId,
    user: new mongoose.Types.ObjectId(),
    userEmail: "buyer@example.com",
    username: "buyer",
    price: { amount: 4000, currency: "INR" },
    status,
  });
}

function post(body, signature) {
  return request(app)
    .post(endpoint)
    .set("x-razorpay-signature", signature ?? sign(body))
    .send(body);
}

async function queues() {
  return (await outboxModel.find()).map((event) => event.queue);
}

describe("POST /api/payments/webhook", () => {
  it("completes the payment on payment.captured", async () => {
    const payment = await seedPayment();

    const res = await post(eventBody("payment.captured"));

    expect(res.status).toBe(200);
    const stored = await paymentModel.findById(payment._id);
    expect(stored.status).toBe("COMPLETED");
    expect(stored.paymentId).toBe("pay_rzp_hook_1");
  });

  it("confirms the order and notifies the buyer on capture", async () => {
    await seedPayment();

    await post(eventBody("payment.captured")).expect(200);

    const recorded = await queues();
    expect(recorded).toContain("PAYMENT_ORDER.PAYMENT_COMPLETED");
    expect(recorded).toContain("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED");
    expect(recorded).toContain("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED");

    const notification = await outboxModel.findOne({
      queue: "PAYMENT_NOTIFICATION.PAYMENT_COMPLETED",
    });
    expect(notification.payload.email).toBe("buyer@example.com");
    expect(notification.payload.username).toBe("buyer");
    expect(notification.payload.amount).toBe(4000);
  });

  it("fails the payment and cancels the order on payment.failed", async () => {
    const payment = await seedPayment();

    const res = await post(eventBody("payment.failed"));

    expect(res.status).toBe(200);
    const stored = await paymentModel.findById(payment._id);
    expect(stored.status).toBe("FAILED");

    const recorded = await queues();
    expect(recorded).toContain("PAYMENT_ORDER.PAYMENT_FAILED");
    expect(recorded).toContain("PAYMENT_NOTIFICATION.PAYMENT_FAILED");
  });

  it("rejects a tampered signature and changes nothing", async () => {
    const payment = await seedPayment();

    const res = await post(eventBody("payment.captured"), "deadbeef");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid signature");
    expect((await paymentModel.findById(payment._id)).status).toBe("PENDING");
    expect(await outboxModel.countDocuments()).toBe(0);
  });

  it("rejects a signature made with the wrong secret", async () => {
    await seedPayment();
    const body = eventBody("payment.captured");

    const res = await post(body, sign(body, "wrong_secret"));

    expect(res.status).toBe(400);
    expect(await outboxModel.countDocuments()).toBe(0);
  });

  it("rejects a request with no signature header", async () => {
    await seedPayment();

    const res = await request(app)
      .post(endpoint)
      .send(eventBody("payment.captured"));

    expect(res.status).toBe(400);
  });

  it("is idempotent when Razorpay retries the same event", async () => {
    await seedPayment();
    const body = eventBody("payment.captured");

    await post(body).expect(200);
    const afterFirst = await outboxModel.countDocuments();

    await post(body).expect(200);

    expect(await outboxModel.countDocuments()).toBe(afterFirst);
  });

  it("does not downgrade an already COMPLETED payment on a late failure event", async () => {
    const payment = await seedPayment("COMPLETED");

    await post(eventBody("payment.failed")).expect(200);

    expect((await paymentModel.findById(payment._id)).status).toBe("COMPLETED");
  });

  it("acknowledges an unknown razorpay order without erroring", async () => {
    const body = {
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_x", order_id: "order_unknown" } },
      },
    };

    const res = await post(body);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Unknown payment");
  });

  it("ignores events without a payment entity", async () => {
    const body = { event: "payout.processed", payload: {} };

    const res = await post(body);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Event ignored");
  });
});
