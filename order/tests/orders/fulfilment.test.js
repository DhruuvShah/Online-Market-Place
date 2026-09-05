const request = require("supertest");
const app = require("../../src/app");
const { getAuthCookie } = require("../setup/auth");
const orderModel = require("../../src/models/order.model");
const outboxModel = require("../../src/models/outbox.model");
const fulfilment = require("../../src/services/fulfilment");

const USER_ID = "68bc6369c17579622cbdd9fe";
const PRODUCT_ID = "507f1f77bcf86cd799439021";

const address = {
  street: "12 Linking Road",
  city: "Mumbai",
  state: "Maharashtra",
  zip: "400050",
  country: "India",
};

/**
 * An order sitting at `status` with its next stage already due.
 *
 * The due time is well in the past so that every remaining stage is overdue
 * too: stages are timed from when the previous one was due, so a schedule only
 * a second stale would leave the rest of the route in the future.
 */
const dueOrder = (status = "CONFIRMED", overrides = {}) =>
  orderModel.create({
    user: USER_ID,
    userEmail: "buyer@example.com",
    username: "dhruv",
    status,
    nextTransitionAt: new Date(Date.now() - 60 * 60 * 1000),
    items: [
      {
        product: PRODUCT_ID,
        title: "Aeron Chair",
        quantity: 1,
        price: { amount: 1000, currency: "INR" },
      },
    ],
    totalPrice: { amount: 1000, currency: "INR" },
    shippingAddress: address,
    ...overrides,
  });

const queued = (queue) => outboxModel.findOne({ queue });

beforeEach(async () => {
  await orderModel.deleteMany({});
  await outboxModel.deleteMany({});
  process.env.FULFILMENT_STEP_SECONDS = "1";
  delete process.env.FULFILMENT_SIMULATION;
});

describe("fulfilment scheduling", () => {
  it("schedules the first stage once payment confirms", () => {
    const from = new Date("2026-01-01T10:00:00Z");
    const at = fulfilment.nextTransitionAt("CONFIRMED", from);

    // PACKED is one step out, and a step is a second under this config.
    expect(at.toISOString()).toBe("2026-01-01T10:00:01.000Z");
  });

  it("schedules nothing beyond the final stage", () => {
    expect(fulfilment.nextTransitionAt("DELIVERED")).toBeNull();
  });

  it("schedules nothing for an order that was never paid for", () => {
    expect(fulfilment.nextTransitionAt("PENDING")).toBeNull();
  });

  it("schedules nothing while the simulation is switched off", () => {
    process.env.FULFILMENT_SIMULATION = "off";

    expect(fulfilment.nextTransitionAt("CONFIRMED")).toBeNull();
  });
});

describe("advancing a due order", () => {
  it("moves a confirmed order to packed", async () => {
    const order = await dueOrder("CONFIRMED");

    await fulfilment.advanceOne();

    const updated = await orderModel.findById(order._id);
    expect(updated.status).toBe("PACKED");
  });

  it("records what happened and when on the timeline", async () => {
    const order = await dueOrder("CONFIRMED");

    await fulfilment.advanceOne();

    const [event] = (await orderModel.findById(order._id)).timeline;
    expect(event.status).toBe("PACKED");
    expect(event.label).toBe("Packed");
    expect(event.detail).toMatch(/seller/i);
    expect(event.at).toBeInstanceOf(Date);
  });

  it("schedules the stage after the one it just applied", async () => {
    const order = await dueOrder("CONFIRMED");

    await fulfilment.advanceOne();

    const updated = await orderModel.findById(order._id);
    expect(updated.nextTransitionAt).not.toBeNull();
    expect(updated.nextTransitionAt.getTime()).toBeGreaterThan(
      order.nextTransitionAt.getTime(),
    );
  });

  it("leaves an order alone until its stage is actually due", async () => {
    const order = await dueOrder("CONFIRMED", {
      nextTransitionAt: new Date(Date.now() + 60_000),
    });

    expect(await fulfilment.advanceOne()).toBeNull();
    expect((await orderModel.findById(order._id)).status).toBe("CONFIRMED");
  });

  it("never moves an order that has not been paid for", async () => {
    const order = await dueOrder("PENDING");

    await fulfilment.advanceDueOrders();

    expect((await orderModel.findById(order._id)).status).toBe("PENDING");
  });

  it("never resurrects a cancelled order", async () => {
    const order = await dueOrder("CANCELLED");

    await fulfilment.advanceDueOrders();

    expect((await orderModel.findById(order._id)).status).toBe("CANCELLED");
  });

  it("stops at delivered and clears the schedule", async () => {
    const order = await dueOrder("CONFIRMED");

    await fulfilment.advanceDueOrders();

    const updated = await orderModel.findById(order._id);
    expect(updated.status).toBe("DELIVERED");
    expect(updated.nextTransitionAt ?? null).toBeNull();
  });

  it("walks the whole route in order", async () => {
    const order = await dueOrder("CONFIRMED");

    await fulfilment.advanceDueOrders();

    const reached = (await orderModel.findById(order._id)).timeline.map(
      (event) => event.status,
    );
    expect(reached).toEqual([
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ]);
  });

  it("does nothing at all while the simulation is switched off", async () => {
    process.env.FULFILMENT_SIMULATION = "off";
    const order = await dueOrder("CONFIRMED");

    expect(await fulfilment.advanceDueOrders()).toBe(0);
    expect((await orderModel.findById(order._id)).status).toBe("CONFIRMED");
  });

  it("clears a stale schedule left on an already delivered order", async () => {
    const order = await dueOrder("DELIVERED");

    await fulfilment.advanceDueOrders();

    const updated = await orderModel.findById(order._id);
    expect(updated.status).toBe("DELIVERED");
    expect(updated.nextTransitionAt ?? null).toBeNull();
  });

  it("only touches orders matching the filter it was given", async () => {
    const mine = await dueOrder("CONFIRMED");
    const other = await dueOrder("CONFIRMED", {
      user: "507f1f77bcf86cd799439099",
    });

    await fulfilment.advanceDueOrders({ user: USER_ID });

    expect((await orderModel.findById(mine._id)).status).not.toBe("CONFIRMED");
    expect((await orderModel.findById(other._id)).status).toBe("CONFIRMED");
  });
});

describe("timing after the service has been asleep", () => {
  it("catches an order up through every stage it slept through", async () => {
    // Hours overdue, as it would be on a deployment that sleeps when idle.
    const order = await dueOrder("CONFIRMED", {
      nextTransitionAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    });

    await fulfilment.advanceDueOrders();

    expect((await orderModel.findById(order._id)).status).toBe("DELIVERED");
  });

  it("times each stage from when the last was due, not from the wake-up", async () => {
    process.env.FULFILMENT_STEP_SECONDS = "3600";
    const due = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const order = await dueOrder("CONFIRMED", { nextTransitionAt: due });

    await fulfilment.advanceOne();

    // PACKED landed when it was due; SHIPPED is two steps after that, which is
    // still in the past. Restarting the clock on wake would have pushed the
    // rest of the route hours into the future instead.
    const updated = await orderModel.findById(order._id);
    expect(updated.nextTransitionAt.getTime()).toBe(
      due.getTime() + 2 * 3600 * 1000,
    );
    expect(updated.nextTransitionAt.getTime()).toBeLessThan(Date.now());
  });
});

describe("events published as an order progresses", () => {
  it("tells the seller dashboard about every stage", async () => {
    await dueOrder("CONFIRMED");

    await fulfilment.advanceOne();

    const event = await queued("ORDER_SELLER_DASHBOARD.ORDER_UPDATED");
    expect(event.payload.status).toBe("PACKED");
  });

  it("emails the buyer when it ships", async () => {
    // The email fires on the way *into* SHIPPED, so start one stage back.
    await dueOrder("PACKED");

    await fulfilment.advanceOne();

    const event = await queued("ORDER_NOTIFICATION.ORDER_SHIPPED");
    expect(event).not.toBeNull();
    expect(event.payload.email).toBe("buyer@example.com");
    expect(event.payload.items[0].title).toBe("Aeron Chair");
    expect(event.payload.shippingAddress.city).toBe("Mumbai");
  });

  it("emails the buyer when it lands", async () => {
    await dueOrder("OUT_FOR_DELIVERY");

    await fulfilment.advanceOne();

    const event = await queued("ORDER_NOTIFICATION.ORDER_DELIVERED");
    expect(event).not.toBeNull();
    expect(event.payload.status).toBe("DELIVERED");
    expect(event.payload.total).toBe(1000);
  });

  it("stays quiet on the stages that do not warrant an email", async () => {
    await dueOrder("CONFIRMED");

    await fulfilment.advanceOne();

    expect(await queued("ORDER_NOTIFICATION.ORDER_SHIPPED")).toBeNull();
    expect(await queued("ORDER_NOTIFICATION.ORDER_DELIVERED")).toBeNull();
  });

  it("addresses the email to the buyer snapshotted on the order", async () => {
    // There is no request behind a ticker, so this has to come off the order.
    await dueOrder("OUT_FOR_DELIVERY", { username: "someone-else" });

    await fulfilment.advanceOne();

    const event = await queued("ORDER_NOTIFICATION.ORDER_DELIVERED");
    expect(event.payload.username).toBe("someone-else");
  });
});

describe("reading an order brings it up to date", () => {
  it("advances a due order before returning it", async () => {
    const order = await dueOrder("CONFIRMED");

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    expect(res.body.order.status).not.toBe("CONFIRMED");
  });

  it("advances due orders before listing them", async () => {
    await dueOrder("CONFIRMED");

    const res = await request(app)
      .get("/api/orders/me")
      .set("Cookie", getAuthCookie())
      .expect(200);

    expect(res.body.orders[0].status).not.toBe("CONFIRMED");
  });

  it("returns the timeline the buyer needs to render tracking", async () => {
    const order = await dueOrder("CONFIRMED");

    const res = await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    expect(res.body.order.timeline.length).toBeGreaterThan(0);
    expect(res.body.order.timeline[0]).toMatchObject({ status: "PACKED" });
  });

  it("still serves the order when the sweep cannot run", async () => {
    const order = await dueOrder("CONFIRMED");
    const boom = jest
      .spyOn(fulfilment, "advanceDueOrders")
      .mockRejectedValue(new Error("mongo is having a moment"));

    await request(app)
      .get(`/api/orders/${order._id}`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    boom.mockRestore();
  });
});

describe("cancelling against a moving order", () => {
  it("lets the buyer cancel while it is only packed", async () => {
    const order = await dueOrder("PACKED", { nextTransitionAt: null });

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(200);
  });

  it("refuses once it is out for delivery", async () => {
    const order = await dueOrder("OUT_FOR_DELIVERY", {
      nextTransitionAt: null,
    });

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(409);
  });

  it("takes a cancelled order off the schedule so nothing revives it", async () => {
    const order = await dueOrder("CONFIRMED", { nextTransitionAt: null });

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    await fulfilment.advanceDueOrders();

    const updated = await orderModel.findById(order._id);
    expect(updated.status).toBe("CANCELLED");
    expect(updated.nextTransitionAt ?? null).toBeNull();
  });

  it("writes the cancellation onto the timeline", async () => {
    const order = await dueOrder("CONFIRMED", { nextTransitionAt: null });

    await request(app)
      .post(`/api/orders/${order._id}/cancel`)
      .set("Cookie", getAuthCookie())
      .expect(200);

    const updated = await orderModel.findById(order._id);
    expect(updated.timeline.at(-1).status).toBe("CANCELLED");
  });
});
