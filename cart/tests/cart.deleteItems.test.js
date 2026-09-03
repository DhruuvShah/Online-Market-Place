const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");

jest.mock("../src/models/cart.model.js", () => {
  function mockGenerateObjectId() {
    return Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");
  }
  const carts = new Map();
  class CartMock {
    constructor({ user, items }) {
      this._id = mockGenerateObjectId();
      this.user = user;
      this.items = items || [];
    }
    static async findOne(query) {
      return carts.get(query.user) || null;
    }
    async save() {
      carts.set(this.user, this);
      return this;
    }
  }
  CartMock.__reset = () => carts.clear();
  return CartMock;
});

const CartModel = require("../src/models/cart.model.js");

function generateObjectId() {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

const postEndpoint = "/api/cart/items";
const deleteBase = "/api/cart/items";
const cartEndpoint = "/api/cart";

describe("DELETE /api/cart/items/:productId", () => {
  const userId = generateObjectId();
  const existingProductId = generateObjectId();
  const otherProductId = generateObjectId();

  beforeEach(() => {
    CartModel.__reset();
  });

  test("removes an existing item and returns the updated cart", async () => {
    const token = signToken({ id: userId, role: "user" });
    await request(app)
      .post(postEndpoint)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: existingProductId, qty: 2 });
    await request(app)
      .post(postEndpoint)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: otherProductId, qty: 1 });

    const res = await request(app)
      .delete(`${deleteBase}/${existingProductId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Item removed from cart");
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].productId).toBe(otherProductId);
    expect(res.body.totals).toMatchObject({ itemCount: 1, totalQuantity: 1 });
  });

  test("404 when cart not found", async () => {
    const token = signToken({ id: userId, role: "user" });
    const res = await request(app)
      .delete(`${deleteBase}/${existingProductId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found");
  });

  test("404 when item not in cart", async () => {
    const token = signToken({ id: userId, role: "user" });
    await request(app)
      .post(postEndpoint)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: existingProductId, qty: 1 });

    const res = await request(app)
      .delete(`${deleteBase}/${otherProductId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Item not found");
  });

  test("validation error invalid productId param", async () => {
    const token = signToken({ id: userId, role: "user" });
    const res = await request(app)
      .delete(`${deleteBase}/not-a-valid-id`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test("401 when no token", async () => {
    const res = await request(app).delete(`${deleteBase}/${existingProductId}`);
    expect(res.status).toBe(401);
  });

  test("403 when role not allowed", async () => {
    const token = signToken({ id: userId, role: "seller" });
    const res = await request(app)
      .delete(`${deleteBase}/${existingProductId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("401 when token invalid", async () => {
    const res = await request(app)
      .delete(`${deleteBase}/${existingProductId}`)
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/cart", () => {
  const userId = generateObjectId();
  const productId = generateObjectId();

  beforeEach(() => {
    CartModel.__reset();
  });

  test("empties a cart that has items", async () => {
    const token = signToken({ id: userId, role: "user" });
    await request(app)
      .post(postEndpoint)
      .set("Authorization", `Bearer ${token}`)
      .send({ productId, qty: 4 });

    const res = await request(app)
      .delete(cartEndpoint)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Cart cleared");
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.totals).toMatchObject({ itemCount: 0, totalQuantity: 0 });
  });

  test("is idempotent when no cart exists", async () => {
    const token = signToken({ id: userId, role: "user" });
    const res = await request(app)
      .delete(cartEndpoint)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
  });

  test("401 when no token", async () => {
    const res = await request(app).delete(cartEndpoint);
    expect(res.status).toBe(401);
  });

  test("403 when role not allowed", async () => {
    const token = signToken({ id: userId, role: "seller" });
    const res = await request(app)
      .delete(cartEndpoint)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
