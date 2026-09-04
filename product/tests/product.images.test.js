const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const mockUploadImage = jest.fn();
const mockDeleteImage = jest.fn();

jest.mock("../src/services/imagekit.service", () => ({
  uploadImage: (...args) => mockUploadImage(...args),
  deleteImage: (...args) => mockDeleteImage(...args),
}));

const app = require("../src/app");
const Product = require("../src/models/product.model");

const makeToken = (id, role = "seller") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET);

describe("product image management", () => {
  let mongo;
  let sellerId;
  let otherSellerId;
  let token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGO_URI = uri;
    process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
    await mongoose.connect(uri);

    sellerId = new mongoose.Types.ObjectId().toString();
    otherSellerId = new mongoose.Types.ObjectId().toString();
    token = makeToken(sellerId);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  afterEach(async () => {
    await Product.deleteMany({});
    jest.clearAllMocks();
  });

  const seed = (overrides = {}) =>
    Product.create({
      title: "Aeron Chair",
      price: { amount: 128000, currency: "INR" },
      seller: overrides.seller ?? sellerId,
      stock: 2,
      images: overrides.images ?? [
        { url: "https://ik/a.jpg", thumbnail: "https://ik/a-t.jpg", id: "file_a" },
      ],
    });

  describe("POST /api/products/:id/images", () => {
    it("requires a seller token", async () => {
      const product = await seed();

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .attach("images", Buffer.from("x"), "b.jpg");

      expect(res.status).toBe(401);
    });

    it("forbids adding images to another seller's product", async () => {
      const product = await seed({ seller: otherSellerId });

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .set("Cookie", [`token=${token}`])
        .attach("images", Buffer.from("x"), "b.jpg");

      expect(res.status).toBe(403);
      expect(mockUploadImage).not.toHaveBeenCalled();
    });

    it("returns 404 for a product that does not exist", async () => {
      const res = await request(app)
        .post(`/api/products/${new mongoose.Types.ObjectId()}/images`)
        .set("Cookie", [`token=${token}`])
        .attach("images", Buffer.from("x"), "b.jpg");

      expect(res.status).toBe(404);
    });

    it("returns 400 when no file is attached", async () => {
      const product = await seed();

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(400);
    });

    it("uploads and appends an image", async () => {
      mockUploadImage.mockResolvedValue({
        url: "https://ik/b.jpg",
        thumbnail: "https://ik/b-t.jpg",
        id: "file_b",
      });

      const product = await seed();

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .set("Cookie", [`token=${token}`])
        .attach("images", Buffer.from("x"), "b.jpg");

      expect(res.status).toBe(201);
      expect(res.body.product.images).toHaveLength(2);
      expect(res.body.product.images[1].id).toBe("file_b");

      const stored = await Product.findById(product._id);
      expect(stored.images).toHaveLength(2);
    });

    it("refuses to exceed five images", async () => {
      const product = await seed({
        images: Array.from({ length: 5 }, (_, i) => ({
          url: `https://ik/${i}.jpg`,
          thumbnail: `https://ik/${i}-t.jpg`,
          id: `file_${i}`,
        })),
      });

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .set("Cookie", [`token=${token}`])
        .attach("images", Buffer.from("x"), "b.jpg");

      expect(res.status).toBe(409);
      expect(mockUploadImage).not.toHaveBeenCalled();
    });

    it("only accepts as many images as the remaining slots allow", async () => {
      mockUploadImage.mockImplementation(async ({ filename }) => ({
        url: `https://ik/${filename}`,
        thumbnail: `https://ik/${filename}`,
        id: `file_${filename}`,
      }));

      const product = await seed({
        images: Array.from({ length: 4 }, (_, i) => ({
          url: `https://ik/${i}.jpg`,
          thumbnail: `https://ik/${i}-t.jpg`,
          id: `file_${i}`,
        })),
      });

      const res = await request(app)
        .post(`/api/products/${product._id}/images`)
        .set("Cookie", [`token=${token}`])
        .attach("images", Buffer.from("x"), "one.jpg")
        .attach("images", Buffer.from("y"), "two.jpg");

      expect(res.status).toBe(201);
      expect(res.body.product.images).toHaveLength(5);
      expect(mockUploadImage).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /api/products/:id/images/:imageId", () => {
    it("requires a seller token", async () => {
      const product = await seed();

      const res = await request(app).delete(
        `/api/products/${product._id}/images/file_a`,
      );

      expect(res.status).toBe(401);
    });

    it("forbids deleting from another seller's product", async () => {
      const product = await seed({ seller: otherSellerId });

      const res = await request(app)
        .delete(`/api/products/${product._id}/images/file_a`)
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(403);
      expect(mockDeleteImage).not.toHaveBeenCalled();
    });

    it("returns 404 for an image the product does not have", async () => {
      const product = await seed();

      const res = await request(app)
        .delete(`/api/products/${product._id}/images/file_missing`)
        .set("Cookie", [`token=${token}`])
        .send();

      expect(res.status).toBe(404);
      expect(mockDeleteImage).not.toHaveBeenCalled();
    });

    it("removes the image from the database and from ImageKit", async () => {
      mockDeleteImage.mockResolvedValue(true);
      const product = await seed();

      const res = await request(app)
        .delete(`/api/products/${product._id}/images/file_a`)
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(mockDeleteImage).toHaveBeenCalledWith("file_a");
      expect(res.body.product.images).toHaveLength(0);

      const stored = await Product.findById(product._id);
      expect(stored.images).toHaveLength(0);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("cleans up every image in ImageKit before removing the product", async () => {
      mockDeleteImage.mockResolvedValue(true);

      const product = await seed({
        images: [
          { url: "u1", thumbnail: "t1", id: "file_1" },
          { url: "u2", thumbnail: "t2", id: "file_2" },
        ],
      });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set("Cookie", [`token=${token}`]);

      expect(res.status).toBe(200);
      expect(mockDeleteImage).toHaveBeenCalledTimes(2);
      expect(mockDeleteImage).toHaveBeenCalledWith("file_1");
      expect(mockDeleteImage).toHaveBeenCalledWith("file_2");
      expect(await Product.findById(product._id)).toBeNull();
    });
  });
});
