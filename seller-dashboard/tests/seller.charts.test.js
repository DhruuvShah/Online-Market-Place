const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async () => true),
}));

const app = require("../src/app");
const orderModel = require("../src/models/order.model");
const {
  signToken,
  createUser,
  createProduct,
  createOrder,
} = require("./setup/factories");

const metricsEndpoint = "/api/seller/dashboard/metrics";
const productsEndpoint = "/api/seller/dashboard/products";

const asSeller = (sellerId) =>
  `Bearer ${signToken({ id: sellerId.toHexString() })}`;

const today = () => new Date().toISOString().slice(0, 10);

// Written through the raw collection: mongoose keeps its own hands on
// createdAt, so a model-level update silently leaves it at today.
const backdate = async (orderId, days) => {
  const when = new Date();
  when.setUTCDate(when.getUTCDate() - days);
  await orderModel.collection.updateOne(
    { _id: orderId },
    { $set: { createdAt: when } },
  );
  return when.toISOString().slice(0, 10);
};

describe("GET /api/seller/dashboard/metrics — chart data", () => {
  it("returns one bucket per day for the last thirty days", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await createProduct(sellerId);

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    expect(res.status).toBe(200);
    expect(res.body.revenueSeries).toHaveLength(30);
    expect(res.body.revenueSeries.at(-1).date).toBe(today());
    expect(res.body.revenueSeries.every((point) => point.revenue === 0)).toBe(
      true,
    );
  });

  it("keeps empty days in the series so the trend is not distorted", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);

    const order = await createOrder({
      user: buyer._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: { amount: 500, currency: "INR" },
        },
      ],
    });
    const day = await backdate(order._id, 3);

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    const series = res.body.revenueSeries;
    expect(series).toHaveLength(30);

    const withRevenue = series.filter((point) => point.revenue > 0);
    expect(withRevenue).toHaveLength(1);
    expect(withRevenue[0]).toMatchObject({
      date: day,
      revenue: 1000,
      orders: 1,
      units: 2,
    });
    expect(series.at(-1).revenue).toBe(0);
  });

  it("adds up several orders landing on the same day", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);
    const line = [
      {
        product: product._id,
        quantity: 1,
        price: { amount: 200, currency: "INR" },
      },
    ];

    await createOrder({ user: buyer._id, items: line });
    await createOrder({ user: buyer._id, items: line });

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    const point = res.body.revenueSeries.at(-1);
    expect(point.revenue).toBe(400);
    expect(point.orders).toBe(2);
  });

  it("drops orders older than the window from the series but not from the total", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);

    const order = await createOrder({
      user: buyer._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: { amount: 700, currency: "INR" },
        },
      ],
    });
    await backdate(order._id, 90);

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    expect(res.body.revenue).toBe(700);
    expect(
      res.body.revenueSeries.every((point) => point.revenue === 0),
    ).toBe(true);
  });

  it("reports stock levels and a summary for the bar chart", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await createProduct(sellerId, { title: "Plenty", stock: 40 });
    await createProduct(sellerId, { title: "Low", stock: 3 });
    await createProduct(sellerId, { title: "Gone", stock: 0 });

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    expect(res.body.stockLevels.map((item) => item.title)).toEqual([
      "Plenty",
      "Low",
      "Gone",
    ]);
    expect(res.body.stockSummary).toEqual({
      inStock: 1,
      lowStock: 1,
      outOfStock: 1,
      units: 43,
    });
    expect(res.body.productCount).toBe(3);
  });

  it("prices a line by quantity in the revenue total", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId);

    await createOrder({
      user: buyer._id,
      items: [
        {
          product: product._id,
          quantity: 3,
          price: { amount: 250, currency: "INR" },
        },
      ],
    });

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    expect(res.body.revenue).toBe(750);
    expect(res.body.averageOrderValue).toBe(750);
  });

  it("carries the product image through to top products", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const buyer = await createUser();
    const product = await createProduct(sellerId, {
      title: "Aeron",
      images: [{ url: "https://ik/a.jpg", thumbnail: "https://ik/a-t.jpg" }],
    });

    await createOrder({
      user: buyer._id,
      items: [
        {
          product: product._id,
          quantity: 1,
          price: { amount: 100, currency: "INR" },
        },
      ],
    });

    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", asSeller(sellerId));

    expect(res.body.topProducts[0]).toMatchObject({
      title: "Aeron",
      image: "https://ik/a-t.jpg",
      sold: 1,
      revenue: 100,
    });
  });

  it("returns an empty summary rather than failing for a new seller", async () => {
    const res = await request(app)
      .get(metricsEndpoint)
      .set("Authorization", `Bearer ${signToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.stockLevels).toEqual([]);
    expect(res.body.stockSummary).toEqual({
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      units: 0,
    });
    expect(res.body.averageOrderValue).toBe(0);
  });
});

describe("GET /api/seller/dashboard/products — search", () => {
  const seedCatalog = async (sellerId) => {
    await createProduct(sellerId, {
      title: "Aeron Chair",
      description: "Ergonomic office seating",
      stock: 12,
    });
    await createProduct(sellerId, {
      title: "Stagg Kettle",
      description: "Gooseneck pour over",
      stock: 2,
    });
    await createProduct(sellerId, { title: "Sold Out Lamp", stock: 0 });
  };

  it("matches a partial title", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ q: "chai" })
      .set("Authorization", asSeller(sellerId));

    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.title)).toEqual(["Aeron Chair"]);
  });

  it("matches on the description too", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ q: "gooseneck" })
      .set("Authorization", asSeller(sellerId));

    expect(res.body.map((p) => p.title)).toEqual(["Stagg Kettle"]);
  });

  it("filters to products that are out of stock", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ stock: "out" })
      .set("Authorization", asSeller(sellerId));

    expect(res.body.map((p) => p.title)).toEqual(["Sold Out Lamp"]);
  });

  it("filters to products running low", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ stock: "low" })
      .set("Authorization", asSeller(sellerId));

    expect(res.body.map((p) => p.title)).toEqual(["Stagg Kettle"]);
  });

  it("never leaks another seller's products through search", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const otherSellerId = new mongoose.Types.ObjectId();
    await createProduct(sellerId, { title: "My Chair" });
    await createProduct(otherSellerId, { title: "Their Chair" });

    const res = await request(app)
      .get(productsEndpoint)
      .query({ q: "chair" })
      .set("Authorization", asSeller(sellerId));

    expect(res.body.map((p) => p.title)).toEqual(["My Chair"]);
  });

  it("treats regex metacharacters in the search box as literal text", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ q: "chair(" })
      .set("Authorization", asSeller(sellerId));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns the whole catalog when the search box is empty", async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await seedCatalog(sellerId);

    const res = await request(app)
      .get(productsEndpoint)
      .query({ q: "  " })
      .set("Authorization", asSeller(sellerId));

    expect(res.body).toHaveLength(3);
  });
});
