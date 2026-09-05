import type { Order, OrderStatus, TrackingEvent } from "@/types";

/**
 * The route every order walks, in order. CANCELLED is deliberately absent: it
 * is not a stage on the way to anywhere, it is where the route stops.
 */
export const TRACKED_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

export type TrackedStatus = (typeof TRACKED_STATUSES)[number];

/** Statuses the order is still moving through, so the page should keep polling. */
const MOVING: OrderStatus[] = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
];

export const isInFlight = (status: OrderStatus) => MOVING.includes(status);

export const isTracked = (status: OrderStatus): status is TrackedStatus =>
  (TRACKED_STATUSES as readonly OrderStatus[]).includes(status);

/**
 * How far along the route the order is, as an index into TRACKED_STATUSES.
 * A cancelled order reports the last stage it actually reached, so the tracker
 * can show where it stopped rather than collapsing to nothing.
 */
export function stageIndex(order: Pick<Order, "status" | "timeline">) {
  if (isTracked(order.status)) return TRACKED_STATUSES.indexOf(order.status);

  const reached = (order.timeline ?? [])
    .map((event) => TRACKED_STATUSES.indexOf(event.status as TrackedStatus))
    .filter((index) => index >= 0);

  return reached.length ? Math.max(...reached) : 0;
}

/** 0–1, for a progress bar. */
export function progressOf(order: Pick<Order, "status" | "timeline">) {
  return stageIndex(order) / (TRACKED_STATUSES.length - 1);
}

/**
 * The timeline as the server recorded it, indexed by status.
 *
 * PENDING is backfilled from createdAt: orders placed before the timeline
 * existed have none at all, and an order that has been paid for should still
 * show when it was placed.
 */
export function eventsByStatus(order: Order) {
  const byStatus = new Map<OrderStatus, TrackingEvent>();

  for (const event of order.timeline ?? []) {
    if (!byStatus.has(event.status)) byStatus.set(event.status, event);
  }

  if (!byStatus.has("PENDING")) {
    byStatus.set("PENDING", {
      status: "PENDING",
      at: order.createdAt,
      label: "Order placed",
    });
  }

  return byStatus;
}

/** Copy for stages the order has not reached yet, where there is no event. */
export const stageCopy: Record<TrackedStatus, { label: string; detail: string }> =
  {
    PENDING: {
      label: "Order placed",
      detail: "We have your order and are waiting for payment to clear.",
    },
    CONFIRMED: {
      label: "Payment confirmed",
      detail: "Payment cleared and the seller has been notified.",
    },
    PACKED: {
      label: "Packed",
      detail: "The seller packs your order and prints the shipping label.",
    },
    SHIPPED: {
      label: "Shipped",
      detail: "Collected by the courier and moving towards your city.",
    },
    OUT_FOR_DELIVERY: {
      label: "Out for delivery",
      detail: "With the delivery partner for the last leg.",
    },
    DELIVERED: {
      label: "Delivered",
      detail: "Handed over at your shipping address.",
    },
  };

/** Milliseconds until the next stage, or null when nothing is scheduled. */
export function msUntilNext(order: Order, now: number) {
  if (!order.nextTransitionAt || !isInFlight(order.status)) return null;

  return Math.max(0, new Date(order.nextTransitionAt).getTime() - now);
}

/** "1:04" / "12s" — short enough to sit inside a line of text. */
export function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  if (total < 60) return `${total}s`;

  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
