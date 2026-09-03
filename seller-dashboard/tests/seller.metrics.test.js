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

const endpoint = "/api/seller/dashboard/metrics";

describe("GET /api/seller/dashboard/metrics", () => {
  it("aggregates sales and revenue across the seller's own products", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const productA = await createProduct(sellerId, { title: "Keyboard" });
    const productB = await createProduct(sellerId, { title: "Mouse" });

    await createOrder({
      user: buyer._id,
      items: [
        { product: productA._id, quantity: 2, price: { amount: 100, currency: "INR" } },
        { product: productB._id, quantity: 1, price: { amount: 50, currency: "INR" } },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body.sales).toBe(3);
    expect(res.body.revenue).toBe(250);
    expect(res.body.topProducts).toHaveLength(2);
    expect(res.body.topProducts[0]).toMatchObject({ title: "Keyboard", sold: 2 });
  });

  it("ignores products belonging to a different seller", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const otherSellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const mine = await createProduct(sellerId, { title: "Mine" });
    const theirs = await createProduct(otherSellerId, { title: "Theirs" });

    await createOrder({
      user: buyer._id,
      items: [
        { product: mine._id, quantity: 1, price: { amount: 100, currency: "INR" } },
        { product: theirs._id, quantity: 9, price: { amount: 999, currency: "INR" } },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body.sales).toBe(1);
    expect(res.body.revenue).toBe(100);
    expect(res.body.topProducts).toHaveLength(1);
    expect(res.body.topProducts[0].title).toBe("Mine");
  });

  it("counts only CONFIRMED, SHIPPED and DELIVERED orders", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);
    const line = [
      { product: product._id, quantity: 1, price: { amount: 100, currency: "INR" } },
    ];

    await createOrder({ user: buyer._id, items: line, status: "PENDING" });
    await createOrder({ user: buyer._id, items: line, status: "CANCELLED" });
    await createOrder({ user: buyer._id, items: line, status: "DELIVERED" });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ id: sellerId.toHexString() })}`);

    expect(res.status).toBe(200);
    expect(res.body.sales).toBe(1);
    expect(res.body.revenue).toBe(100);
  });

  it("returns zeroed metrics for a seller with no products", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sales: 0, revenue: 0, topProducts: [] });
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get(endpoint);
    expect(res.status).toBe(401);
  });

  it("403 for a buyer — the dashboard is seller-only", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${signToken({ role: "user" })}`);
    expect(res.status).toBe(403);
  });

  it("401 when the token is invalid", async () => {
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", "Bearer not.a.token");
    expect(res.status).toBe(401);
  });
});
