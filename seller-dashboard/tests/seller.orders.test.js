const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async () => true),
}));

const app = require("../src/app");
const {
  signToken,
  createUser,
  createProduct,
  createOrder,
} = require("./setup/factories");

const endpoint = "/api/seller/dashboard/orders";

describe("GET /api/seller/dashboard/orders", () => {
  it("returns orders containing the seller's products with the buyer populated", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser({ username: "shopper", email: "s@example.com" });
    const product = await createProduct(sellerId);

    await createOrder({
      user: buyer._id,
      items: [
        { product: product._id, quantity: 2, price: { amount: 100, currency: "INR" } },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user).toMatchObject({
      username: "shopper",
      email: "s@example.com",
    });
  });

  it("strips line items belonging to other sellers", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const otherSellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const mine = await createProduct(sellerId, { title: "Mine" });
    const theirs = await createProduct(otherSellerId, { title: "Theirs" });

    await createOrder({
      user: buyer._id,
      items: [
        { product: mine._id, quantity: 1, price: { amount: 100, currency: "INR" } },
        { product: theirs._id, quantity: 5, price: { amount: 500, currency: "INR" } },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].items).toHaveLength(1);
    expect(String(res.body[0].items[0].product)).toBe(String(mine._id));
  });

  it("excludes orders that contain none of the seller's products", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const otherSellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    await createProduct(sellerId);
    const theirs = await createProduct(otherSellerId);

    await createOrder({
      user: buyer._id,
      items: [
        { product: theirs._id, quantity: 1, price: { amount: 100, currency: "INR" } },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("includes orders of every status", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);
    const line = [
      { product: product._id, quantity: 1, price: { amount: 100, currency: "INR" } },
    ];

    await createOrder({ user: buyer._id, items: line, status: "PENDING" });
    await createOrder({ user: buyer._id, items: line, status: "DELIVERED" });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get(endpoint);
    expect(res.status).toBe(401);
  });

  it("403 for a buyer", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ role: "user" })}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/seller/dashboard/products", () => {
  const endpoint = "/api/seller/dashboard/products";

  it("returns only the authenticated seller's products", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const otherSellerId = new mongoose.Types.ObjectId();
    await createProduct(sellerId, { title: "Mine" });
    await createProduct(otherSellerId, { title: "Theirs" });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Mine");
  });

  it("exposes stock so the dashboard can flag low inventory", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await createProduct(sellerId, { title: "Low", stock: 2 });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body[0].stock).toBe(2);
  });

  it("returns an empty list for a seller with no products", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get(endpoint);
    expect(res.status).toBe(401);
  });

  it("403 for a buyer", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ role: "user" })}`);
    expect(res.status).toBe(403);
  });
});
