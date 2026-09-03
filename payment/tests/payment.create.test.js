const request = require("supertest");
const mongoose = require("mongoose");
const axios = require("axios");
const { signToken } = require("./setup/auth");

jest.mock("axios");

const mockRazorpayOrderCreate = jest.fn(async (options) => ({
  id: "order_rzp_mock_1",
  amount: options.amount,
  currency: options.currency,
}));

jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: { create: mockRazorpayOrderCreate },
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

async function outboxQueues() {
  const events = await outboxModel.find().sort({ createdAt: 1 });
  return events.map((event) => event.queue);
}

async function outboxPayload(queue) {
  const event = await outboxModel.findOne({ queue });
  return event?.payload;
}

const orderId = new mongoose.Types.ObjectId().toHexString();

function mockOrderService({ amount = 4000, currency = "INR" } = {}) {
  axios.get.mockResolvedValue({
    data: { order: { _id: orderId, totalPrice: { amount, currency } } },
  });
}

describe("POST /api/payments/create/:orderId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a PENDING payment from the order total and returns 201", async () => {
    mockOrderService();
    const token = signToken();

    const res = await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Payment Initiated");
    expect(res.body.payment.razorpayOrderId).toBe("order_rzp_mock_1");
    expect(res.body.payment.status).toBe("PENDING");

    const stored = await paymentModel.findOne({ order: orderId });
    expect(stored).not.toBeNull();
    expect(stored.price.amount).toBe(4000);
    expect(stored.price.currency).toBe("INR");
  });

  it("charges Razorpay in paise while storing rupees", async () => {
    mockOrderService({ amount: 4000 });
    const token = signToken();

    await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(mockRazorpayOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 400000, currency: "INR" }),
    );

    const stored = await paymentModel.findOne({ order: orderId });
    expect(stored.price.amount).toBe(4000);
  });

  it("rounds fractional rupee totals to whole paise", async () => {
    mockOrderService({ amount: 99.99 });
    const token = signToken();

    await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(mockRazorpayOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 9999 }),
    );
  });

  it("records the seller-dashboard and notification events in the outbox", async () => {
    mockOrderService();
    const token = signToken({ username: "dhruv", email: "d@example.com" });

    await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    const queues = await outboxQueues();
    expect(queues).toContain("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED");
    expect(queues).toContain("PAYMENT_NOTIFICATION.PAYMENT_INITIATED");

    const initiated = await outboxPayload(
      "PAYMENT_NOTIFICATION.PAYMENT_INITIATED",
    );
    expect(initiated).toMatchObject({
      email: "d@example.com",
      username: "dhruv",
      orderId,
      currency: "INR",
      amount: 4000,
    });
  });

  it("propagates the order service status when the order is missing", async () => {
    axios.get.mockRejectedValue({
      response: { status: 404, data: { message: "Order not found" } },
    });
    const token = signToken();

    const res = await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
    expect(await paymentModel.countDocuments()).toBe(0);
    expect(await outboxModel.countDocuments()).toBe(0);
  });

  it("returns 500 when the order service is unreachable", async () => {
    axios.get.mockRejectedValue(new Error("ECONNREFUSED"));
    const token = signToken();

    const res = await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).post(`/api/payments/create/${orderId}`);
    expect(res.status).toBe(401);
  });

  it("403 for a seller — sellers cannot purchase", async () => {
    const token = signToken({ role: "seller" });
    const res = await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("401 when the token is invalid", async () => {
    const res = await request(app)
      .post(`/api/payments/create/${orderId}`)
      .set("Authorization", "Bearer not.a.token");
    expect(res.status).toBe(401);
  });
});
