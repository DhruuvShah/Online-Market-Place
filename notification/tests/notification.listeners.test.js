const mockHandlers = new Map();

jest.mock("../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async (queue, handler) => {
    mockHandlers.set(queue, handler);
    return true;
  }),
}));

jest.mock("../src/email", () => ({
  sendEmail: jest.fn(async () => undefined),
}));

const setListeners = require("../src/broker/listeners");
const { sendEmail } = require("../src/email");

beforeAll(() => {
  setListeners();
});

beforeEach(() => {
  jest.clearAllMocks();
});

function emit(queue, payload) {
  return mockHandlers.get(queue)(payload);
}

function lastEmail() {
  const [to, subject, text, html] = sendEmail.mock.calls.at(-1);
  return { to, subject, text, html };
}

describe("notification listeners", () => {
  it("subscribes to every event it is expected to handle", () => {
    expect([...mockHandlers.keys()].sort()).toEqual([
      "AUTH_NOTIFICATION.USER_CREATED",
      "ORDER_NOTIFICATION.ORDER_CANCELLED",
      "ORDER_NOTIFICATION.ORDER_DELIVERED",
      "ORDER_NOTIFICATION.ORDER_PLACED",
      "ORDER_NOTIFICATION.ORDER_SHIPPED",
      "ORDER_NOTIFICATION.SELLER_ORDER_RECEIVED",
      "PAYMENT_NOTIFICATION.PAYMENT_COMPLETED",
      "PAYMENT_NOTIFICATION.PAYMENT_FAILED",
      "PAYMENT_NOTIFICATION.PAYMENT_INITIATED",
      "PRODUCT_NOTIFICATION.PRODUCT_CREATED",
    ]);
  });

  it("sends a welcome email when a user registers", async () => {
    await emit("AUTH_NOTIFICATION.USER_CREATED", {
      email: "dhruv@example.com",
      fullName: { firstName: "Dhruv", lastName: "Shah" },
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, subject, html } = lastEmail();
    expect(to).toBe("dhruv@example.com");
    expect(subject).toBe("Welcome to HiveMind, Dhruv Shah");
    expect(html).toContain("Dhruv Shah");
  });

  it("handles a registration with no last name without printing undefined", async () => {
    await emit("AUTH_NOTIFICATION.USER_CREATED", {
      email: "solo@example.com",
      fullName: { firstName: "Solo" },
    });

    expect(lastEmail().html).not.toContain("undefined");
  });

  it("emails the buyer when a payment is initiated", async () => {
    await emit("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", {
      email: "buyer@example.com",
      username: "buyer",
      orderId: "order_1",
      amount: 500,
      currency: "INR",
    });

    const { to, subject, html } = lastEmail();
    expect(to).toBe("buyer@example.com");
    expect(subject).toContain("Payment started");
    expect(html).toContain("buyer");
    expect(html).toContain("order_1");
    expect(html).not.toContain("undefined");
  });

  it("emails the buyer when a payment completes", async () => {
    await emit("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
      email: "buyer@example.com",
      username: "buyer",
      orderId: "order_1",
      paymentId: "pay_1",
      amount: 500,
      currency: "INR",
    });

    const { to, subject, html } = lastEmail();
    expect(to).toBe("buyer@example.com");
    expect(subject).toContain("confirmed");
    expect(html).toContain("500");
    expect(html).not.toContain("undefined");
  });

  it("emails the buyer when a payment fails", async () => {
    await emit("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
      email: "buyer@example.com",
      username: "buyer",
      orderId: "order_1",
      paymentId: "pay_1",
    });

    const { to, subject, html } = lastEmail();
    expect(to).toBe("buyer@example.com");
    expect(subject).toContain("did not go through");
    expect(html).toContain("order_1");
    expect(html).not.toContain("undefined");
  });

  it("emails the seller when a product is created", async () => {
    await emit("PRODUCT_NOTIFICATION.PRODUCT_CREATED", {
      email: "seller@example.com",
      username: "seller",
      productId: "prod_1",
      sellerId: "seller_1",
    });

    const { to, subject, html } = lastEmail();
    expect(to).toBe("seller@example.com");
    expect(subject).toContain("Your listing is live");
    expect(html).toContain("seller");
    expect(html).not.toContain("undefined");
  });
});
