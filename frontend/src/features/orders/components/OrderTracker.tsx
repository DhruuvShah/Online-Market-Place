import {
  Bike,
  ClipboardList,
  CreditCard,
  Home,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useNow } from "@/hooks/useNow";
import { formatDateTime } from "@/lib/format";
import {
  TRACKED_STATUSES,
  eventsByStatus,
  formatCountdown,
  isInFlight,
  msUntilNext,
  stageCopy,
  stageIndex,
  type TrackedStatus,
} from "../tracking";
import type { Order } from "@/types";

const icons: Record<TrackedStatus, typeof Truck> = {
  PENDING: ClipboardList,
  CONFIRMED: CreditCard,
  PACKED: PackageCheck,
  SHIPPED: Truck,
  OUT_FOR_DELIVERY: Bike,
  DELIVERED: Home,
};

function StageDot({
  status,
  state,
}: {
  status: TrackedStatus;
  state: "done" | "current" | "waiting";
}) {
  const Icon = icons[status];
  const reduced = useReducedMotion();

  const ring = {
    done: "border-accent bg-accent text-accent-contrast",
    current: "border-accent bg-canvas text-accent",
    waiting: "border-line bg-canvas text-ink-subtle",
  }[state];

  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      {/* A halo on the stage in progress, so a glance finds where it is. */}
      {state === "current" && !reduced && (
        <span className="border-accent absolute inset-0 animate-ping rounded-full border opacity-60" />
      )}
      <span
        className={`relative grid h-9 w-9 place-items-center rounded-full border transition-colors ${ring}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
    </span>
  );
}

/**
 * The buyer's view of where their order is.
 *
 * Reached stages carry the timestamp the order service recorded; stages ahead
 * carry a description of what happens next, so the list reads as a plan rather
 * than as a row of empty placeholders.
 */
export function OrderTracker({ order }: { order: Order }) {
  const cancelled = order.status === "CANCELLED";
  const inFlight = isInFlight(order.status);
  const now = useNow(inFlight);
  const reduced = useReducedMotion();

  const current = stageIndex(order);
  const events = eventsByStatus(order);
  const remaining = msUntilNext(order, now);

  return (
    <div>
      <ol className="flex flex-col">
        {TRACKED_STATUSES.map((status, index) => {
          const event = events.get(status);
          const reached = index <= current && !!event;
          const state = reached
            ? index === current
              ? cancelled
                ? "done"
                : "current"
              : "done"
            : "waiting";

          const copy = stageCopy[status];
          const last = index === TRACKED_STATUSES.length - 1;

          return (
            <li key={status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <StageDot status={status} state={state} />
                {!last && (
                  <span
                    className={`w-px flex-1 ${
                      index < current ? "bg-accent" : "bg-line"
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-7"} pt-1.5`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`text-[15px] ${
                      reached
                        ? "text-title font-medium"
                        : "text-ink-subtle"
                    }`}
                  >
                    {event?.label ?? copy.label}
                  </span>
                  {event && (
                    <span className="tnum text-ink-subtle text-[12px]">
                      {formatDateTime(event.at)}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 text-[13px] leading-relaxed ${
                    reached ? "text-ink-muted" : "text-ink-subtle"
                  }`}
                >
                  {event?.detail || copy.detail}
                </p>

                {/* Only the stage actually in progress gets a countdown. */}
                {state === "current" && inFlight && remaining !== null && (
                  <motion.p
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-accent mt-2 text-[12px]"
                  >
                    {remaining > 0 ? (
                      <>
                        Next update in{" "}
                        <span className="tnum">
                          {formatCountdown(remaining)}
                        </span>
                      </>
                    ) : (
                      "Updating…"
                    )}
                  </motion.p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {cancelled && (
        <div className="border-line mt-2 flex items-start gap-4 border-t pt-6">
          <span className="text-accent grid h-9 w-9 shrink-0 place-items-center">
            <XCircle className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-title text-[15px] font-medium">Cancelled</p>
            <p className="text-ink-muted mt-1 text-[13px] leading-relaxed">
              This order was cancelled and its stock returned to the catalog.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
