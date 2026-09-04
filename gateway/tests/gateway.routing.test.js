const express = require("express");
const request = require("supertest");

let app;
let upstreams;
let deadPort;

function startUpstream(name) {
  const server = express();
  server.all(/.*/, (req, res) => {
    res.status(200).json({ name, url: req.originalUrl, method: req.method });
  });

  return new Promise((resolve) => {
    const listener = server.listen(0, () =>
      resolve({ listener, port: listener.address().port }),
    );
  });
}

function stop(listener) {
  return new Promise((resolve) => listener.close(resolve));
}

beforeAll(async () => {
  const [auth, product, cart, order, payment, seller, aiBuddy, dead] =
    await Promise.all([
      startUpstream("auth"),
      startUpstream("product"),
      startUpstream("cart"),
      startUpstream("order"),
      startUpstream("payment"),
      startUpstream("seller-dashboard"),
      startUpstream("ai-buddy"),
      startUpstream("dead"),
    ]);

  upstreams = [auth, product, cart, order, payment, seller, aiBuddy];

  deadPort = dead.port;
  await stop(dead.listener);

  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${auth.port}`;
  process.env.PRODUCT_SERVICE_URL = `http://127.0.0.1:${product.port}`;
  process.env.CART_SERVICE_URL = `http://127.0.0.1:${cart.port}`;
  process.env.ORDER_SERVICE_URL = `http://127.0.0.1:${deadPort}`;
  process.env.PAYMENT_SERVICE_URL = `http://127.0.0.1:${payment.port}`;
  process.env.SELLER_DASHBOARD_SERVICE_URL = `http://127.0.0.1:${seller.port}`;
  process.env.AI_BUDDY_SERVICE_URL = `http://127.0.0.1:${aiBuddy.port}`;

  app = require("../src/app").app;
});

afterAll(async () => {
  await Promise.all(upstreams.map(({ listener }) => stop(listener)));
});

describe("gateway health", () => {
  it("reports its own health without touching an upstream", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", service: "gateway" });
  });

  it("lists every routed prefix at the root", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.routes)).toEqual([
      "/api/auth",
      "/api/products",
      "/api/cart",
      "/api/orders",
      "/api/payments",
      "/api/seller/dashboard",
      "/api/socket",
    ]);
  });
});

describe("gateway routing", () => {
  it("sends each prefix to its own service", async () => {
    const cases = [
      ["/api/auth/me", "auth"],
      ["/api/products", "product"],
      ["/api/cart", "cart"],
      ["/api/payments/create", "payment"],
      ["/api/seller/dashboard/metrics", "seller-dashboard"],
      ["/api/socket/health", "ai-buddy"],
    ];

    for (const [path, name] of cases) {
      const res = await request(app).get(path);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(name);
    }
  });

  it("forwards the full path rather than stripping the prefix", async () => {
    const res = await request(app).get("/api/products/6512ab34cd?limit=5");

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("/api/products/6512ab34cd?limit=5");
  });

  it("does not route the seller dashboard prefix to the cart service", async () => {
    const res = await request(app).get("/api/seller/dashboard");

    expect(res.body.name).toBe("seller-dashboard");
  });

  it("preserves the request method", async () => {
    const res = await request(app).post("/api/cart/items").send({ qty: 1 });

    expect(res.body.method).toBe("POST");
  });

  it("returns 404 for a path no service claims", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.status).toBe(404);
  });
});

describe("gateway request id", () => {
  it("echoes back a caller supplied request id", async () => {
    const res = await request(app)
      .get("/health")
      .set("x-request-id", "abc-123");

    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("generates a request id when the caller omits one", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("gateway upstream failure", () => {
  it("answers 502 instead of hanging when a service is down", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(502);
    expect(JSON.parse(res.text)).toEqual({
      message: "Upstream service unavailable",
    });
  });
});
