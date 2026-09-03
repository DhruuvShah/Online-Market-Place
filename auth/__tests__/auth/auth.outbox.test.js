const request = require("supertest");
const app = require("../../src/app");
const outboxModel = require("../../src/models/outbox.model");
const { connect, publishToQueue } = require("../../src/broker/broker");
const { drainOutbox } = require("../../src/broker/outbox");

async function settleOutbox() {
  for (let i = 0; i < 100; i += 1) {
    if ((await outboxModel.countDocuments({ status: "SENDING" })) === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function registerPayload(suffix) {
  return {
    username: `outbox_${suffix}`,
    email: `outbox_${suffix}@example.com`,
    password: "Secret123!",
    fullName: { firstName: "Out", lastName: "Box" },
  };
}

describe("registration outbox", () => {
  beforeEach(() => {
    connect.mockReset();
    connect.mockResolvedValue({});
    publishToQueue.mockReset();
    publishToQueue.mockResolvedValue(true);
  });

  it("records both registration events durably", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("a"))
      .expect(201);

    const queues = (await outboxModel.find()).map((event) => event.queue);
    expect(queues).toContain("AUTH_NOTIFICATION.USER_CREATED");
    expect(queues).toContain("AUTH_SELLER_DASHBOARD.USER_CREATED");
  });

  it("still returns 201 and keeps the event when the broker is down", async () => {
    connect.mockResolvedValue(null);

    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("b"))
      .expect(201);

    await drainOutbox();
    await settleOutbox();

    const event = await outboxModel.findOne({
      queue: "AUTH_NOTIFICATION.USER_CREATED",
    });

    expect(event).not.toBeNull();
    expect(event.status).toBe("PENDING");
  });

  it("does not burn delivery attempts while the broker is unreachable", async () => {
    connect.mockResolvedValue(null);

    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("g"))
      .expect(201);

    await drainOutbox();
    await drainOutbox();
    await drainOutbox();
    await settleOutbox();

    const event = await outboxModel.findOne({
      queue: "AUTH_NOTIFICATION.USER_CREATED",
    });

    expect(event.status).toBe("PENDING");
    expect(event.attempts).toBe(0);
  });

  it("delivers the pending event once the broker comes back", async () => {
    connect.mockResolvedValue(null);

    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("c"))
      .expect(201);

    expect(
      await outboxModel.countDocuments({ status: "PENDING" }),
    ).toBeGreaterThan(0);

    connect.mockResolvedValue({});
    publishToQueue.mockResolvedValue(true);
    await drainOutbox();

    expect(await outboxModel.countDocuments({ status: "PENDING" })).toBe(0);
    expect(await outboxModel.countDocuments({ status: "SENT" })).toBe(2);

    const delivered = publishToQueue.mock.calls.map(([queue]) => queue);
    expect(delivered).toContain("AUTH_NOTIFICATION.USER_CREATED");
    expect(delivered).toContain("AUTH_SELLER_DASHBOARD.USER_CREATED");
  });

  it("marks an event SENT with a timestamp on success", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("d"))
      .expect(201);

    await drainOutbox();

    const event = await outboxModel.findOne({
      queue: "AUTH_NOTIFICATION.USER_CREATED",
    });

    expect(event.status).toBe("SENT");
    expect(event.sentAt).toBeInstanceOf(Date);
  });

  it("does not redeliver an event that was already sent", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("e"))
      .expect(201);

    await drainOutbox();
    const countAfterFirst = publishToQueue.mock.calls.length;

    await drainOutbox();

    expect(publishToQueue.mock.calls.length).toBe(countAfterFirst);
  });

  it("preserves the payload the consumer needs", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(registerPayload("f"))
      .expect(201);

    const event = await outboxModel.findOne({
      queue: "AUTH_NOTIFICATION.USER_CREATED",
    });

    expect(event.payload.email).toBe("outbox_f@example.com");
    expect(event.payload.fullName.firstName).toBe("Out");
  });
});
