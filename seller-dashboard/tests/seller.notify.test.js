const mongoose = require("mongoose");

const mockHandlers = new Map();
const mockPublish = jest.fn(async () => true);

jest.mock("../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: (...args) => mockPublish(...args),
  subscribeToQueue: jest.fn(async (queue, handler) => {
    mockHandlers.set(queue, handler);
    return true;
  }),
}));

const setListeners = require("../src/broker/listener");
const userModel = require("../src/models/user.model");
const productModel = require("../src/models/product.model");

const QUEUE = "ORDER_NOTIFICATION.SELLER_ORDER_RECEIVED";

beforeAll(async () => {
  await setListeners();
});

beforeEach(() => {
  mockPublish.mockClear();
});

const emitOrder = (payload) =>
  mockHandlers.get("ORDER_SELLER_DASHBOARD.ORDER_CREATED")(payload);

const sellerEmails = () =>
  mockPublish.mock.calls
    .filter(([queue]) => queue === QUEUE)
    .map(([, payload]) => payload);

const makeSeller = (overrides = {}) =>
  userModel.create({
    username: `seller_${new mongoose.Types.ObjectId().toHexString().slice(-6)}`,
    email: `${new mongoose.Types.ObjectId().toHexString().slice(-6)}@sellers.test`,
    password: "hashed",
    fullName: { firstName: "Asha", lastName: "Rao" },
    role: "seller",
    ...overrides,
  });

const makeBuyer = () =>
  userModel.create({
    username: "dhruv27",
    email: "buyer@example.com",
    password: "hashed",
    fullName: { firstName: "Dhruv", lastName: "Shah" },
  });

const shippingAddress = {
  street: "12 Linking Road",
  city: "Mumbai",
  state: "Maharashtra",
  zip: "400050",
  country: "India",
};

const orderFor = (buyer, items) => ({
  _id: new mongoose.Types.ObjectId().toHexString(),
  user: buyer._id.toHexString(),
  items,
  status: "PENDING",
  totalPrice: { amount: 1000, currency: "INR" },
  shippingAddress,
  createdAt: new Date().toISOString(),
});

describe("seller order notifications", () => {
  it("emails the seller with the buyer, items, images and address", async () => {
    const buyer = await makeBuyer();
    const seller = await makeSeller();

    await emitOrder(
      orderFor(buyer, [
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          seller: seller._id.toHexString(),
          title: "Aeron Chair",
          image: "https://ik/chair-t.jpg",
          quantity: 2,
          price: { amount: 500, currency: "INR" },
        },
      ]),
    );

    const [payload] = sellerEmails();
    expect(payload).toBeDefined();
    expect(payload.email).toBe(seller.email);
    expect(payload.buyer).toEqual({
      name: "Dhruv Shah",
      email: "buyer@example.com",
    });
    expect(payload.items).toEqual([
      {
        title: "Aeron Chair",
        image: "https://ik/chair-t.jpg",
        quantity: 2,
        amount: 500,
        currency: "INR",
      },
    ]);
    expect(payload.subtotal).toBe(1000);
    expect(payload.shippingAddress).toMatchObject({ city: "Mumbai" });
  });

  it("splits a shared order so each seller only sees their own lines", async () => {
    const buyer = await makeBuyer();
    const first = await makeSeller();
    const second = await makeSeller();

    await emitOrder(
      orderFor(buyer, [
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          seller: first._id.toHexString(),
          title: "Chair",
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          seller: second._id.toHexString(),
          title: "Kettle",
          quantity: 3,
          price: { amount: 50, currency: "INR" },
        },
      ]),
    );

    const payloads = sellerEmails();
    expect(payloads).toHaveLength(2);

    const byEmail = new Map(payloads.map((p) => [p.email, p]));
    expect(byEmail.get(first.email).items.map((i) => i.title)).toEqual(["Chair"]);
    expect(byEmail.get(first.email).subtotal).toBe(100);
    expect(byEmail.get(second.email).items.map((i) => i.title)).toEqual([
      "Kettle",
    ]);
    expect(byEmail.get(second.email).subtotal).toBe(150);
  });

  it("sends one email when a seller has two lines on the same order", async () => {
    const buyer = await makeBuyer();
    const seller = await makeSeller();
    const sellerId = seller._id.toHexString();

    await emitOrder(
      orderFor(buyer, [
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          seller: sellerId,
          title: "Chair",
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          seller: sellerId,
          title: "Desk",
          quantity: 1,
          price: { amount: 400, currency: "INR" },
        },
      ]),
    );

    const payloads = sellerEmails();
    expect(payloads).toHaveLength(1);
    expect(payloads[0].items).toHaveLength(2);
    expect(payloads[0].subtotal).toBe(500);
  });

  it("falls back to the catalog for an order placed before item snapshots", async () => {
    const buyer = await makeBuyer();
    const seller = await makeSeller();
    const product = await productModel.create({
      title: "Legacy Product",
      price: { amount: 250, currency: "INR" },
      seller: seller._id,
      stock: 4,
    });

    await emitOrder(
      orderFor(buyer, [
        {
          product: product._id.toHexString(),
          quantity: 1,
          price: { amount: 250, currency: "INR" },
        },
      ]),
    );

    const [payload] = sellerEmails();
    expect(payload.email).toBe(seller.email);
  });

  it("publishes nothing when no item can be traced to a seller", async () => {
    const buyer = await makeBuyer();

    await emitOrder(
      orderFor(buyer, [
        {
          product: new mongoose.Types.ObjectId().toHexString(),
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ]),
    );

    expect(sellerEmails()).toHaveLength(0);
  });

  it("still replicates the order even if the seller cannot be emailed", async () => {
    const buyer = await makeBuyer();
    const orderModel = require("../src/models/order.model");

    const order = orderFor(buyer, [
      {
        product: new mongoose.Types.ObjectId().toHexString(),
        quantity: 1,
        price: { amount: 100, currency: "INR" },
      },
    ]);

    await emitOrder(order);

    expect(await orderModel.findById(order._id)).not.toBeNull();
  });
});
