import { TRACKED_STATUSES, isInFlight, stageIndex } from "../tracking";
import { orderStatusLabels } from "../orderStatus";
import type { Order } from "@/types";

/**
 * A one-line read on how far an order has got, for rows in a list where the
 * full tracker would be far too much.
 *
 * A cancelled order still shows the segments it completed, greyed, so the row
 * says where it stopped rather than pretending it never started.
 */
export function OrderProgress({
  order,
  className = "",
}: {
  order: Pick<Order, "status" | "timeline">;
  className?: string;
}) {
  const cancelled = order.status === "CANCELLED";
  const current = stageIndex(order);
  const moving = isInFlight(order.status);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div
        className="flex items-center gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TRACKED_STATUSES.length - 1}
        aria-valuenow={current}
        aria-label={`Order status: ${orderStatusLabels[order.status]}`}
      >
        {TRACKED_STATUSES.map((status, index) => (
          <span
            key={status}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index > current
                ? "bg-line"
                : cancelled
                  ? "bg-line-strong"
                  : "bg-accent"
            }`}
          />
        ))}
      </div>

      <span
        className={`text-[12px] ${cancelled ? "text-ink-subtle" : "text-ink-muted"}`}
      >
        {orderStatusLabels[order.status]}
        {moving && " · in progress"}
      </span>
    </div>
  );
}
