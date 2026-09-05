import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderStatus, TrackingEvent } from "@/types";
import { OrderTracker } from "./OrderTracker";
import { OrderProgress } from "./OrderProgress";

const NOW = new Date("2026-03-01T12:00:00.000Z");

const event = (status: OrderStatus, minute: number): TrackingEvent => ({
  status,
  at: new Date(NOW.getTime() - minute * 60_000).toISOString(),
  label: `${status} label`,
  detail: `${status} detail`,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  _id: "o1",
  user: "u1",
  items: [],
  status: "CONFIRMED",
  timeline: [event("PENDING", 10), event("CONFIRMED", 9)],
  totalPrice: { amount: 1000, currency: "INR" },
  shippingAddress: {
    street: "12 Linking Road",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400050",
    country: "India",
  },
  createdAt: new Date(NOW.getTime() - 10 * 60_000).toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OrderTracker", () => {
  it("lays out the whole route, not just the part already travelled", () => {
    render(<OrderTracker order={order()} />);

    // A buyer two stages in should still see what is coming.
    expect(screen.getByText("Out for delivery")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("uses the server's wording for a stage that has happened", () => {
    render(<OrderTracker order={order()} />);

    expect(screen.getByText("CONFIRMED label")).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED detail")).toBeInTheDocument();
  });

  it("describes what is still to come for a stage that has not", () => {
    render(<OrderTracker order={order()} />);

    expect(screen.getByText(/collected by the courier/i)).toBeInTheDocument();
  });

  it("timestamps the stages it has reached", () => {
    render(<OrderTracker order={order()} />);

    // Two events recorded, so two timestamps and no more.
    expect(screen.getAllByText(/1 Mar/)).toHaveLength(2);
  });

  it("counts down to the next stage while the order is moving", () => {
    render(
      <OrderTracker
        order={order({
          nextTransitionAt: new Date(NOW.getTime() + 45_000).toISOString(),
        })}
      />,
    );

    expect(screen.getByText(/next update in/i)).toBeInTheDocument();
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("ticks the countdown down as time passes", async () => {
    render(
      <OrderTracker
        order={order({
          nextTransitionAt: new Date(NOW.getTime() + 45_000).toISOString(),
        })}
      />,
    );

    // The clock inside the tracker updates state, so the ticks need wrapping.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText("40s")).toBeInTheDocument();
  });

  it("says it is updating once the stage is overdue", () => {
    render(
      <OrderTracker
        order={order({
          nextTransitionAt: new Date(NOW.getTime() - 5000).toISOString(),
        })}
      />,
    );

    expect(screen.getByText("Updating…")).toBeInTheDocument();
  });

  it("counts down to nothing once the order has been delivered", () => {
    render(
      <OrderTracker
        order={order({
          status: "DELIVERED",
          timeline: [
            event("PENDING", 10),
            event("CONFIRMED", 9),
            event("PACKED", 8),
            event("SHIPPED", 7),
            event("OUT_FOR_DELIVERY", 6),
            event("DELIVERED", 5),
          ],
          nextTransitionAt: null,
        })}
      />,
    );

    expect(screen.queryByText(/next update in/i)).not.toBeInTheDocument();
  });

  it("says plainly where a cancelled order stopped", () => {
    render(
      <OrderTracker
        order={order({
          status: "CANCELLED",
          timeline: [event("PENDING", 10), event("CONFIRMED", 9)],
        })}
      />,
    );

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText(/returned to the catalog/i)).toBeInTheDocument();
    expect(screen.queryByText(/next update in/i)).not.toBeInTheDocument();
  });

  it("renders an order placed before timelines existed", () => {
    render(<OrderTracker order={order({ timeline: undefined })} />);

    // The placed stage is backfilled from createdAt, so the route still reads.
    expect(screen.getByText("Order placed")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });
});

describe("OrderProgress", () => {
  it("announces the current status to assistive technology", () => {
    render(<OrderProgress order={order({ status: "SHIPPED" })} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
    expect(bar).toHaveAccessibleName("Order status: Shipped");
  });

  it("marks an order that is still on the move", () => {
    render(<OrderProgress order={order({ status: "PACKED" })} />);

    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it("does not claim a delivered order is still in progress", () => {
    render(<OrderProgress order={order({ status: "DELIVERED" })} />);

    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("shows a cancelled order at the stage it reached", () => {
    render(
      <OrderProgress
        order={{
          status: "CANCELLED",
          timeline: [event("PENDING", 10), event("CONFIRMED", 9)],
        }}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });
});
