const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const productModel = require("../src/models/product.model");

const INTERNAL_KEY = "test_internal_key";
const reserveEndpoint = "/api/products/internal/stock/reserve";
const releaseEndpoint = "/api/products/internal/stock/release";

let mongo;

beforeAll(async () => {
  process.env.INTERNAL_API_KEY = INTERNAL_KEY;
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});

function createProduct(stock, title = "Product") {
  return productModel.create({
    title,
    price: { amount: 100, currency: "INR" },
    seller: new mongoose.Types.ObjectId(),
    stock,
  });
}

describe("POST /api/products/internal/stock/reserve", () => {
  it("decrements stock for every item", async () => {
    const a = await createProduct(10, "A");
    const b = await createProduct(5, "B");

    const res = await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({
        items: [
          { productId: a._id.toString(), quantity: 3 },
          { productId: b._id.toString(), quantity: 5 },
        ],
      });

    expect(res.status).toBe(200);
    expect((await productModel.findById(a._id)).stock).toBe(7);
    expect((await productModel.findById(b._id)).stock).toBe(0);
  });

  it("409s and does not decrement when stock is insufficient", async () => {
    const a = await createProduct(2);

    const res = await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({ items: [{ productId: a._id.toString(), quantity: 3 }] });

    expect(res.status).toBe(409);
    expect((await productModel.findById(a._id)).stock).toBe(2);
  });

  it("rolls back earlier items when a later item cannot be reserved", async () => {
    const a = await createProduct(10, "A");
    const b = await createProduct(1, "B");

    const res = await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({
        items: [
          { productId: a._id.toString(), quantity: 4 },
          { productId: b._id.toString(), quantity: 9 },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.productId).toBe(b._id.toString());
    expect((await productModel.findById(a._id)).stock).toBe(10);
    expect((await productModel.findById(b._id)).stock).toBe(1);
  });

  it("does not oversell under concurrent reservations", async () => {
    const a = await createProduct(10);

    const attempts = Array.from({ length: 5 }, () =>
      request(app)
        .post(reserveEndpoint)
        .set("x-internal-key", INTERNAL_KEY)
        .send({ items: [{ productId: a._id.toString(), quantity: 3 }] }),
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => r.status === 200).length;

    expect(succeeded).toBe(3);
    expect((await productModel.findById(a._id)).stock).toBe(1);
  });

  it("401 without the internal key", async () => {
    const a = await createProduct(5);
    const res = await request(app)
      .post(reserveEndpoint)
      .send({ items: [{ productId: a._id.toString(), quantity: 1 }] });

    expect(res.status).toBe(401);
    expect((await productModel.findById(a._id)).stock).toBe(5);
  });

  it("401 with a wrong internal key", async () => {
    const a = await createProduct(5);
    const res = await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", "wrong")
      .send({ items: [{ productId: a._id.toString(), quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it("400 on an invalid payload", async () => {
    const res = await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({ items: [{ productId: "not-an-id", quantity: 0 }] });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/products/internal/stock/release", () => {
  it("returns stock to inventory", async () => {
    const a = await createProduct(4);

    const res = await request(app)
      .post(releaseEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({ items: [{ productId: a._id.toString(), quantity: 3 }] });

    expect(res.status).toBe(200);
    expect((await productModel.findById(a._id)).stock).toBe(7);
  });

  it("reserve followed by release leaves stock unchanged", async () => {
    const a = await createProduct(6);
    const items = [{ productId: a._id.toString(), quantity: 2 }];

    await request(app)
      .post(reserveEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({ items })
      .expect(200);

    await request(app)
      .post(releaseEndpoint)
      .set("x-internal-key", INTERNAL_KEY)
      .send({ items })
      .expect(200);

    expect((await productModel.findById(a._id)).stock).toBe(6);
  });

  it("401 without the internal key", async () => {
    const res = await request(app)
      .post(releaseEndpoint)
      .send({ items: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }] });

    expect(res.status).toBe(401);
  });
});
