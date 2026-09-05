const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.mock("../src/services/imagekit.service", () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

const app = require("../src/app");
const Product = require("../src/models/product.model");

const titlesOf = (res) => res.body.data.map((product) => product.title);

describe("GET /api/products — search, sort and filters", () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
    await Product.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  afterEach(async () => {
    await Product.deleteMany({});
  });

  const seed = (overrides = {}) =>
    Product.create({
      title: overrides.title ?? "Sample",
      description: overrides.description ?? "",
      price: overrides.price ?? { amount: 100, currency: "INR" },
      seller: overrides.seller ?? new mongoose.Types.ObjectId(),
      stock: overrides.stock ?? 5,
      images: [],
    });

  describe("partial matching", () => {
    it("matches a prefix that $text alone would miss", async () => {
      await seed({ title: "Herman Miller Aeron Chair" });
      await seed({ title: "Lodge Cast Iron Skillet" });

      const res = await request(app).get("/api/products").query({ q: "chai" });

      expect(res.status).toBe(200);
      expect(titlesOf(res)).toEqual(["Herman Miller Aeron Chair"]);
    });

    it("matches in the middle of a word", async () => {
      await seed({ title: "Keychron Q1 Pro" });

      const res = await request(app).get("/api/products").query({ q: "ychro" });

      expect(titlesOf(res)).toEqual(["Keychron Q1 Pro"]);
    });

    it("narrows as more words are typed", async () => {
      await seed({ title: "Marshall Stanmore III Speaker" });
      await seed({ title: "Marshall Acton III Speaker" });

      const broad = await request(app)
        .get("/api/products")
        .query({ q: "marshall speaker" });
      expect(broad.body.data).toHaveLength(2);

      const narrow = await request(app)
        .get("/api/products")
        .query({ q: "marshall stanmore" });
      expect(titlesOf(narrow)).toEqual(["Marshall Stanmore III Speaker"]);
    });

    it("searches the description as well as the title", async () => {
      await seed({ title: "Stagg EKG", description: "A gooseneck kettle" });

      const res = await request(app)
        .get("/api/products")
        .query({ q: "gooseneck" });

      expect(titlesOf(res)).toEqual(["Stagg EKG"]);
    });

    it("ranks a title match above a description-only match", async () => {
      await seed({ title: "Cleaning cloth", description: "Good for a kettle" });
      await seed({ title: "Kettle", description: "Boils water" });

      const res = await request(app).get("/api/products").query({ q: "kettle" });

      expect(titlesOf(res)[0]).toBe("Kettle");
    });

    it("is case insensitive", async () => {
      await seed({ title: "Polaroid I-2" });

      const res = await request(app)
        .get("/api/products")
        .query({ q: "POLAROID" });

      expect(res.body.data).toHaveLength(1);
    });

    it("treats regex metacharacters as literal text", async () => {
      await seed({ title: "Global G-2 Chef Knife" });

      const res = await request(app)
        .get("/api/products")
        .query({ q: "G-2 (" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("ignores a blank search term", async () => {
      await seed({ title: "One" });
      await seed({ title: "Two" });

      const res = await request(app).get("/api/products").query({ q: "   " });

      expect(res.body.data).toHaveLength(2);
    });
  });

  describe("sorting", () => {
    beforeEach(async () => {
      await seed({ title: "Cheap", price: { amount: 100, currency: "INR" } });
      await seed({ title: "Dear", price: { amount: 900, currency: "INR" } });
      await seed({ title: "Middle", price: { amount: 400, currency: "INR" } });
    });

    it("sorts by price ascending", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ sort: "price_asc" });

      expect(titlesOf(res)).toEqual(["Cheap", "Middle", "Dear"]);
    });

    it("sorts by price descending", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ sort: "price_desc" });

      expect(titlesOf(res)).toEqual(["Dear", "Middle", "Cheap"]);
    });

    it("sorts by title", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ sort: "title" });

      expect(titlesOf(res)).toEqual(["Cheap", "Dear", "Middle"]);
    });

    it("returns newest first by default", async () => {
      const res = await request(app).get("/api/products");

      expect(titlesOf(res)).toEqual(["Middle", "Dear", "Cheap"]);
    });

    it("lets an explicit sort win over search relevance", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ q: "e", sort: "price_asc" });

      expect(titlesOf(res)).toEqual(["Cheap", "Middle", "Dear"]);
    });

    it("ignores an unknown sort instead of failing", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ sort: "; drop" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });
  });

  describe("stock filter", () => {
    it("hides sold-out products when instock is requested", async () => {
      await seed({ title: "Available", stock: 3 });
      await seed({ title: "Sold out", stock: 0 });

      const res = await request(app)
        .get("/api/products")
        .query({ instock: "true" });

      expect(titlesOf(res)).toEqual(["Available"]);
    });

    it("shows everything when instock is not requested", async () => {
      await seed({ title: "Available", stock: 3 });
      await seed({ title: "Sold out", stock: 0 });

      const res = await request(app).get("/api/products");

      expect(res.body.data).toHaveLength(2);
    });
  });

  describe("pagination meta", () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i += 1) {
        await seed({ title: `Item ${i}` });
      }
    });

    it("reports the total matching the filter, not the page size", async () => {
      const res = await request(app).get("/api/products").query({ limit: 2 });

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({
        total: 5,
        skip: 0,
        limit: 2,
        hasMore: true,
      });
    });

    it("clears hasMore on the final page", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ skip: 4, limit: 2 });

      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.hasMore).toBe(false);
    });

    it("counts search results rather than the whole catalog", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ q: "Item 1", limit: 2 });

      expect(res.body.meta.total).toBe(1);
    });

    it("returns empty meta when no requested id is a valid object id", async () => {
      const res = await request(app)
        .get("/api/products")
        .query({ ids: "not-an-id,also-not" });

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });
});
