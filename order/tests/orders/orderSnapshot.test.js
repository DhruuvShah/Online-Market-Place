const request = require("supertest");
const axios = require("axios");
const app = require("../../src/app");
const { getAuthCookie } = require("../setup/auth");
const orderModel = require("../../src/models/order.model");
const outboxModel = require("../../src/models/outbox.model");

jest.mock("axios");

const PRODUCT_ID = "507f1f77bcf86cd799439021";
const SECOND_PRODUCT_ID = "507f1f77bcf86cd799439022";
const SELLER_ID = "507f1f77bcf86cd799439055";
const DEFAULT_USER_ID = "68bc6369c17579622cbdd9fe";

const address = {
  street: "12 Linking Road",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400050",
  country: "India",
};

const catalog = {
  [PRODUCT_ID]: {
    _id: PRODUCT_ID,
    title: "Aeron Chair",
    seller: SELLER_ID,
    price: { amount: 1000, currency: "INR" },
    stock: 10,
    images: [
      { url: "https://ik/chair.jpg", thumbnail: "https://ik/chair-t.jpg" },
    ],
  },
  [SECOND_PRODUCT_ID]: {
    _id: SECOND_PRODUCT_ID,
    title: "Hario V60",
    seller: SELLER_ID,
    price: { amount: 250, currency: "INR" },
    stock: 30,
    images: [],
  },
};

function mockCart(items) {
  axios.get.mockImplementation(async (url) => {
    if (url.includes("/api/cart")) return { data: { cart: { items } } };

    const id = url.split("/api/products/")[1];
    return { data: { data: catalog[id] } };
  });
  axios.delete.mockResolvedValue({ data: {} });
  axios.post.mockResolvedValue({ data: {} });
}

const placeOrder = () =>
  request(app)
    .post("/api/orders")
    .set("Cookie", getAuthCookie())
    .send({ shippingAddress: address });

const outboxFor = (queue) => outboxModel.findOne({ queue });

describe("order item snapshots", () => {
  beforeEach(async () => {
    await orderModel.deleteMany({});
    await outboxModel.deleteMany({});
  });

  it("stores the title, image and seller alongside the product id", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 2 }]);

    const res = await placeOrder().expect(201);
    const [item] = res.body.order.items;

    expect(item.product).toBe(PRODUCT_ID);
    expect(item.title).toBe("Aeron Chair");
    expect(item.image).toBe("https://ik/chair-t.jpg");
    expect(String(item.seller)).toBe(SELLER_ID);
  });

  it("stores the unit price, not the line total", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 3 }]);

    const res = await placeOrder().expect(201);
    const [item] = res.body.order.items;

    expect(item.quantity).toBe(3);
    expect(item.price.amount).toBe(1000);
    expect(res.body.order.totalPrice.amount).toBe(3000);
  });

  it("totals a mixed cart correctly", async () => {
    mockCart([
      { productId: PRODUCT_ID, quantity: 1 },
      { productId: SECOND_PRODUCT_ID, quantity: 4 },
    ]);

    const res = await placeOrder().expect(201);

    expect(res.body.order.totalPrice.amount).toBe(1000 + 250 * 4);
  });

  it("falls back to the full-size url when there is no thumbnail", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);
    catalog[PRODUCT_ID].images = [{ url: "https://ik/only.jpg" }];

    const res = await placeOrder().expect(201);
    expect(res.body.order.items[0].image).toBe("https://ik/only.jpg");

    catalog[PRODUCT_ID].images = [
      { url: "https://ik/chair.jpg", thumbnail: "https://ik/chair-t.jpg" },
    ];
  });

  it("records an order for a product with no images at all", async () => {
    mockCart([{ productId: SECOND_PRODUCT_ID, quantity: 1 }]);

    const res = await placeOrder().expect(201);

    expect(res.body.order.items[0].image).toBeUndefined();
    expect(res.body.order.items[0].title).toBe("Hario V60");
  });

  it("keeps the snapshot even after the catalog changes", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);
    const res = await placeOrder().expect(201);

    catalog[PRODUCT_ID].title = "Renamed";
    catalog[PRODUCT_ID].price.amount = 5;

    const stored = await orderModel.findById(res.body.order._id);
    expect(stored.items[0].title).toBe("Aeron Chair");
    expect(stored.items[0].price.amount).toBe(1000);

    catalog[PRODUCT_ID].title = "Aeron Chair";
    catalog[PRODUCT_ID].price.amount = 1000;
  });
});

describe("order notification events", () => {
  beforeEach(async () => {
    await orderModel.deleteMany({});
    await outboxModel.deleteMany({});
  });

  it("queues a placed-order email carrying every item and the address", async () => {
    mockCart([
      { productId: PRODUCT_ID, quantity: 2 },
      { productId: SECOND_PRODUCT_ID, quantity: 1 },
    ]);

    await placeOrder().expect(201);

    const event = await outboxFor("ORDER_NOTIFICATION.ORDER_PLACED");
    expect(event).not.toBeNull();

    const { payload } = event;
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).toMatchObject({
      title: "Aeron Chair",
      image: "https://ik/chair-t.jpg",
      quantity: 2,
      amount: 1000,
    });
    expect(payload.total).toBe(2250);
    expect(payload.shippingAddress).toMatchObject({
      street: "12 Linking Road",
      city: "Mumbai",
      zip: "400050",
    });
  });

  it("addresses the email to the signed-in buyer", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);

    await request(app)
      .post("/api/orders")
      .set(
        "Cookie",
        getAuthCookie({
          extra: { role: "user", email: "buyer@example.com", username: "dhruv" },
        }),
      )
      .send({ shippingAddress: address })
      .expect(201);

    const event = await outboxFor("ORDER_NOTIFICATION.ORDER_PLACED");
    expect(event.payload.email).toBe("buyer@example.com");
    expect(event.payload.username).toBe("dhruv");
  });

  it("still queues the dashboard event alongside the email", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);

    await placeOrder().expect(201);

    expect(await outboxFor("ORDER_SELLER_DASHBOARD.ORDER_CREATED")).not.toBeNull();
  });

  it("queues a cancellation email when the buyer cancels", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 2 }]);
    const created = await placeOrder().expect(201);
    await outboxModel.deleteMany({});

    await request(app)
      .post(`/api/orders/${created.body.order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    const event = await outboxFor("ORDER_NOTIFICATION.ORDER_CANCELLED");
    expect(event).not.toBeNull();
    expect(event.payload.status).toBe("CANCELLED");
    expect(event.payload.items[0].title).toBe("Aeron Chair");
    expect(event.payload.total).toBe(2000);
  });

  it("does not queue a cancellation email for an order it refused to cancel", async () => {
    const order = await orderModel.create({
      user: DEFAULT_USER_ID,
      status: "DELIVERED",
      items: [
        {
          product: PRODUCT_ID,
          title: "Aeron Chair",
          quantity: 1,
          price: { amount: 1000, currency: "INR" },
        },
      ],
      totalPrice: { amount: 1000, currency: "INR" },
      shippingAddress: { ...address, zip: address.pincode },
    });
    await outboxModel.deleteMany({});

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(409);

    expect(await outboxFor("ORDER_NOTIFICATION.ORDER_CANCELLED")).toBeNull();
  });
});

describe("GET /api/orders/me ordering", () => {
  it("returns the newest order first", async () => {
    await orderModel.deleteMany({});
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);

    const first = await placeOrder().expect(201);
    const second = await placeOrder().expect(201);

    const res = await request(app)
      .get("/api/orders/me")
      .set("Cookie", getAuthCookie())
      .expect(200);

    expect(res.body.orders[0]._id).toBe(second.body.order._id);
    expect(res.body.orders[1]._id).toBe(first.body.order._id);
  });
});

describe("order status projection", () => {
  beforeEach(async () => {
    await orderModel.deleteMany({});
    await outboxModel.deleteMany({});
  });

  it("announces a cancellation so the dashboard stops showing it as pending", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);
    const created = await placeOrder().expect(201);
    await outboxModel.deleteMany({});

    await request(app)
      .post(`/api/orders/${created.body.order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    const event = await outboxFor("ORDER_SELLER_DASHBOARD.ORDER_UPDATED");
    expect(event).not.toBeNull();
    expect(event.payload.status).toBe("CANCELLED");
  });

  it("announces an address correction", async () => {
    mockCart([{ productId: PRODUCT_ID, quantity: 1 }]);
    const created = await placeOrder().expect(201);
    await outboxModel.deleteMany({});

    await request(app)
      .patch(`/api/orders/${created.body.order._id}/address`)
      .set("Cookie", getAuthCookie())
      .send({ shippingAddress: { ...address, city: "Pune" } })
      .expect(200);

    const event = await outboxFor("ORDER_SELLER_DASHBOARD.ORDER_UPDATED");
    expect(event.payload.shippingAddress.city).toBe("Pune");
  });

  it("says nothing when the cancel was refused", async () => {
    const order = await orderModel.create({
      user: DEFAULT_USER_ID,
      status: "DELIVERED",
      items: [
        {
          product: PRODUCT_ID,
          title: "Aeron Chair",
          quantity: 1,
          price: { amount: 1000, currency: "INR" },
        },
      ],
      totalPrice: { amount: 1000, currency: "INR" },
      shippingAddress: { ...address, zip: address.pincode },
    });
    await outboxModel.deleteMany({});

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(409);

    expect(await outboxFor("ORDER_SELLER_DASHBOARD.ORDER_UPDATED")).toBeNull();
  });
});
