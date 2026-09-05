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
      "ORDER_SELLER_DASHBOARD.ORDER_UPDATED",
      "PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",
      "PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED",
      "PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED",
      "PRODUCT_SELLER_DASHBOARD.PRODUCT_DELETED",
      "PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED",
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

  describe("catalog edits after creation", () => {
    const seedProduct = async (overrides = {}) => {
      const product = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        title: "Aeron Chair",
        price: { amount: 1000, currency: "INR" },
        seller: new mongoose.Types.ObjectId().toHexString(),
        stock: 5,
        images: [],
        ...overrides,
      };

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", product);
      return product;
    };

    it("replicates newly uploaded images onto the projection", async () => {
      const product = await seedProduct();

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED", {
        ...product,
        images: [
          { url: "https://ik/a.jpg", thumbnail: "https://ik/a-t.jpg", id: "f1" },
        ],
      });

      const stored = await productModel.findById(product._id);
      expect(stored.images).toHaveLength(1);
      expect(stored.images[0].thumbnail).toBe("https://ik/a-t.jpg");
    });

    it("replicates a removed image", async () => {
      const product = await seedProduct({
        images: [
          { url: "https://ik/a.jpg", thumbnail: "https://ik/a-t.jpg", id: "f1" },
        ],
      });

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED", {
        ...product,
        images: [],
      });

      const stored = await productModel.findById(product._id);
      expect(stored.images).toHaveLength(0);
    });

    it("replicates a renamed and repriced product", async () => {
      const product = await seedProduct();

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED", {
        ...product,
        title: "Aeron Chair, Size B",
        price: { amount: 2500, currency: "INR" },
        stock: 12,
      });

      const stored = await productModel.findById(product._id);
      expect(stored.title).toBe("Aeron Chair, Size B");
      expect(stored.price.amount).toBe(2500);
      expect(stored.stock).toBe(12);
    });

    it("creates the projection if an update arrives before its create", async () => {
      const id = new mongoose.Types.ObjectId().toHexString();

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED", {
        _id: id,
        title: "Out of order",
        price: { amount: 100, currency: "INR" },
        seller: new mongoose.Types.ObjectId().toHexString(),
        stock: 1,
      });

      expect(await productModel.findById(id)).not.toBeNull();
    });

    it("drops a deleted product from the projection", async () => {
      const product = await seedProduct();

      await emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_DELETED", {
        _id: product._id,
      });

      expect(await productModel.findById(product._id)).toBeNull();
    });

    it("shrugs off a delete for something it never had", async () => {
      const id = new mongoose.Types.ObjectId().toHexString();

      await expect(
        emit("PRODUCT_SELLER_DASHBOARD.PRODUCT_DELETED", { _id: id }),
      ).resolves.not.toThrow();
    });
  });

  describe("order status changes", () => {
    const seedOrder = async (status = "PENDING") => {
      const order = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        user: new mongoose.Types.ObjectId().toHexString(),
        items: [
          {
            product: new mongoose.Types.ObjectId().toHexString(),
            quantity: 1,
            price: { amount: 500, currency: "INR" },
          },
        ],
        status,
        totalPrice: { amount: 500, currency: "INR" },
        shippingAddress: {
          street: "1 Test St",
          city: "Pune",
          state: "MH",
          zip: "411001",
          country: "IN",
        },
      };

      await emit("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order);
      return order;
    };

    it("moves a paid order off PENDING", async () => {
      // Without this the dashboard shows every order as awaiting payment
      // forever, and revenue never leaves zero.
      const order = await seedOrder();

      await emit("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", {
        ...order,
        status: "CONFIRMED",
      });

      const stored = await orderModel.findById(order._id);
      expect(stored.status).toBe("CONFIRMED");
    });

    it("replicates a cancellation", async () => {
      const order = await seedOrder();

      await emit("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", {
        ...order,
        status: "CANCELLED",
      });

      expect((await orderModel.findById(order._id)).status).toBe("CANCELLED");
    });

    it("replicates a shipping address correction", async () => {
      const order = await seedOrder();

      await emit("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", {
        ...order,
        shippingAddress: { ...order.shippingAddress, city: "Mumbai" },
      });

      expect((await orderModel.findById(order._id)).shippingAddress.city).toBe(
        "Mumbai",
      );
    });

    it("creates the projection if an update arrives before its create", async () => {
      const id = new mongoose.Types.ObjectId().toHexString();

      await emit("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", {
        _id: id,
        user: new mongoose.Types.ObjectId().toHexString(),
        items: [],
        status: "CONFIRMED",
        totalPrice: { amount: 100, currency: "INR" },
        shippingAddress: { street: "x", city: "y", state: "z", zip: "1", country: "IN" },
      });

      expect(await orderModel.findById(id)).not.toBeNull();
    });
  });
});
