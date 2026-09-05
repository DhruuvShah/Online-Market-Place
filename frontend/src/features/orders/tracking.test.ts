import { describe, expect, it } from "vitest";
import type { Order, OrderStatus, TrackingEvent } from "@/types";
import {
  TRACKED_STATUSES,
  eventsByStatus,
  formatCountdown,
  isInFlight,
  msUntilNext,
  progressOf,
  stageIndex,
} from "./tracking";

const PLACED_AT = "2026-03-01T09:00:00.000Z";

const event = (status: OrderStatus, at: string): TrackingEvent => ({
  status,
  at,
  label: status,
  detail: `${status} happened`,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  _id: "o1",
  user: "u1",
  items: [],
  status: "CONFIRMED",
  totalPrice: { amount: 1000, currency: "INR" },
  shippingAddress: {
    street: "12 Linking Road",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400050",
    country: "India",
  },
  createdAt: PLACED_AT,
  updatedAt: PLACED_AT,
  ...overrides,
});

describe("the tracked route", () => {
  it("runs from placed to delivered", () => {
    expect(TRACKED_STATUSES[0]).toBe("PENDING");
    expect(TRACKED_STATUSES.at(-1)).toBe("DELIVERED");
  });

  it("leaves cancelled off the route entirely", () => {
    // Cancelled is where an order stops, not a stage on the way anywhere.
    expect(TRACKED_STATUSES).not.toContain("CANCELLED");
  });
});

describe("isInFlight", () => {
  it.each(["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"] as const)(
    "treats %s as still moving",
    (status) => {
      expect(isInFlight(status)).toBe(true);
    },
  );

  it.each(["PENDING", "DELIVERED", "CANCELLED"] as const)(
    "treats %s as settled",
    (status) => {
      expect(isInFlight(status)).toBe(false);
    },
  );
});

describe("stageIndex", () => {
  it("reports how far along a tracked status is", () => {
    expect(stageIndex({ status: "PENDING", timeline: [] })).toBe(0);
    expect(stageIndex({ status: "SHIPPED", timeline: [] })).toBe(3);
    expect(stageIndex({ status: "DELIVERED", timeline: [] })).toBe(5);
  });

  it("reports where a cancelled order actually got to", () => {
    const index = stageIndex({
      status: "CANCELLED",
      timeline: [event("CONFIRMED", PLACED_AT), event("PACKED", PLACED_AT)],
    });

    expect(index).toBe(TRACKED_STATUSES.indexOf("PACKED"));
  });

  it("falls back to the start for a cancelled order with no history", () => {
    expect(stageIndex({ status: "CANCELLED", timeline: [] })).toBe(0);
  });

  it("survives an order with no timeline field at all", () => {
    expect(stageIndex({ status: "CANCELLED" })).toBe(0);
  });
});

describe("progressOf", () => {
  it("is zero at the start and one at the end", () => {
    expect(progressOf({ status: "PENDING", timeline: [] })).toBe(0);
    expect(progressOf({ status: "DELIVERED", timeline: [] })).toBe(1);
  });

  it("is halfway across in the middle", () => {
    expect(progressOf({ status: "SHIPPED", timeline: [] })).toBeCloseTo(0.6);
  });
});

describe("eventsByStatus", () => {
  it("indexes the timeline the server recorded", () => {
    const map = eventsByStatus(
      order({ timeline: [event("CONFIRMED", "2026-03-01T09:01:00.000Z")] }),
    );

    expect(map.get("CONFIRMED")?.detail).toBe("CONFIRMED happened");
  });

  it("backfills the placed stage for an order recorded before timelines", () => {
    const map = eventsByStatus(order({ timeline: [] }));

    expect(map.get("PENDING")?.at).toBe(PLACED_AT);
  });

  it("does not overwrite a placed event the server did record", () => {
    const map = eventsByStatus(
      order({ timeline: [event("PENDING", "2026-03-02T00:00:00.000Z")] }),
    );

    expect(map.get("PENDING")?.at).toBe("2026-03-02T00:00:00.000Z");
  });

  it("keeps the first of a duplicated stage", () => {
    const map = eventsByStatus(
      order({
        timeline: [
          event("PACKED", "2026-03-01T09:01:00.000Z"),
          event("PACKED", "2026-03-01T09:09:00.000Z"),
        ],
      }),
    );

    expect(map.get("PACKED")?.at).toBe("2026-03-01T09:01:00.000Z");
  });
});

describe("msUntilNext", () => {
  const now = new Date("2026-03-01T09:00:00.000Z").getTime();

  it("counts down to the scheduled stage", () => {
    const next = new Date(now + 30_000).toISOString();

    expect(msUntilNext(order({ nextTransitionAt: next }), now)).toBe(30_000);
  });

  it("never goes negative once the stage is overdue", () => {
    const next = new Date(now - 90_000).toISOString();

    expect(msUntilNext(order({ nextTransitionAt: next }), now)).toBe(0);
  });

  it("has nothing to count for an order that is not moving", () => {
    const next = new Date(now + 30_000).toISOString();

    expect(
      msUntilNext(order({ status: "DELIVERED", nextTransitionAt: next }), now),
    ).toBeNull();
  });

  it("has nothing to count when no stage is scheduled", () => {
    expect(msUntilNext(order({ nextTransitionAt: null }), now)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("counts seconds under a minute", () => {
    expect(formatCountdown(42_000)).toBe("42s");
  });

  it("rounds a part-second up so it never shows 0s while waiting", () => {
    expect(formatCountdown(1)).toBe("1s");
  });

  it("switches to minutes and seconds above a minute", () => {
    expect(formatCountdown(64_000)).toBe("1:04");
  });

  it("pads the seconds", () => {
    expect(formatCountdown(125_000)).toBe("2:05");
  });
});
