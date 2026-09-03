const mongoose = require("mongoose");

const mockHandlers = new Map();

jest.mock("../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async (queue, handler) => {
    mockHandlers.set(queue, handler);
    return true;
  }),
}));

const setListeners = require("../src/broker/listener");
const userModel = require("../src/models/user.model");
const productModel = require("../src/models/product.model");
const orderModel = require("../src/models/order.model");
const paymentModel = require("../src/models/payment.model");

beforeAll(async () => {
  await setListeners();
});

function emit(queue, payload) {
  return mockHandlers.get(queue)(payload);
}

describe("seller dashboard projection listeners", () => {
  it("subscribes to every upstream event", () => {
    expect([...mockHandlers.keys()].sort()).toEqual([
      "AUTH_SELLER_DASHBOARD.USER_CREATED",
      "ORDER_SELLER_DASHBOARD.ORDER_CREATED",
      "PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",
      "PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED",
      "PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED",
    ]);
  });

  it("replicates a created user", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await emit("AUTH_SELLER_DASHBOARD.USER_CREATED", {
      _id: id,
      username: "dhruv",
      email: "dhruv@example.com",
      password: "hashed",
      fullName: { firstName: "Dhruv", lastName: "Shah" },
      role: "seller",
    });

    const stored = await userModel.findById(id);
    expect(stored.username).toBe("dhruv");
    expect(stored.role).toBe("seller");
  });

  it("replicates a created product", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", {
      _id: id,
      title: "Keyboard",
      price: { amount: 100, currency: "INR" },
      seller: new mongoose.Types.ObjectId().toHexString(),
      stock: 5,
    });

    const stored = await productModel.findById(id);
    expect(stored.title).toBe("Keyboard");
    expect(stored.stock).toBe(5);
  });

  it("replicates a created order", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    await emit("ORDER_SELLER_DASHBOARD.ORDER_CREATED", {
      _id: id,
      user: new mongoose.Types.ObjectId().toHexString(),
      items: [
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ],
      status: "PENDING",
      totalPrice: { amount: 100, currency: "INR" },
      shippingAddress: {
        street: "1 Test St",
        city: "Pune",
        state: "MH",
        zip: "411001",
        country: "IN",
      },
    });

    const stored = await orderModel.findById(id);
    expect(stored.status).toBe("PENDING");
  });

  it("applies PAYMENT_UPDATED onto the existing payment record", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    const base = {
      _id: id,
      order: new mongoose.Types.ObjectId().toHexString(),
      razorpayOrderId: "order_rzp_1",
      user: new mongoose.Types.ObjectId().toHexString(),
      price: { amount: 50000, currency: "INR" },
      status: "PENDING",
    };

    await emit("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", base);
    await emit("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", {
      ...base,
      status: "COMPLETED",
      paymentId: "pay_rzp_1",
    });

    expect(await paymentModel.countDocuments()).toBe(1);
    const stored = await paymentModel.findById(id);
    expect(stored.status).toBe("COMPLETED");
    expect(stored.paymentId).toBe("pay_rzp_1");
  });

  it("upserts PAYMENT_UPDATED even if PAYMENT_CREATED was never received", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();

    await emit("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", {
      _id: id,
      order: new mongoose.Types.ObjectId().toHexString(),
      razorpayOrderId: "order_rzp_2",
      user: new mongoose.Types.ObjectId().toHexString(),
      price: { amount: 100, currency: "INR" },
      status: "COMPLETED",
    });

    const stored = await paymentModel.findById(id);
    expect(stored).not.toBeNull();
    expect(stored.status).toBe("COMPLETED");
  });

  it("is idempotent when the same event is redelivered", async () => {
    const id = new mongoose.Types.ObjectId().toHexString();
    const product = {
      _id: id,
      title: "Mouse",
      price: { amount: 50, currency: "INR" },
      seller: new mongoose.Types.ObjectId().toHexString(),
      stock: 1,
    };

    await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", product);
    await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", product);

    expect(await productModel.countDocuments({ _id: id })).toBe(1);
  });
});
