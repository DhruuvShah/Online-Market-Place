const orderModel = require("../models/order.model");
const { publishToOutbox } = require("../broker/outbox");
const { notificationPayload } = require("./notification.payload");

/**
 * Nothing here physically ships. HiveMind has no courier integration and no
 * warehouse, so an order that was paid for would otherwise sit at CONFIRMED
 * for ever — the buyer never sees it progress and the seller never sees a sale
 * complete.
 *
 * This simulates fulfilment instead: each stage lands a fixed interval after
 * the one before it, and the order walks itself to DELIVERED. Every step is a
 * real status write that publishes the same events a real one would, so the
 * seller dashboard, the metrics and the emails all behave exactly as they will
 * the day a courier is wired in. Only the trigger is synthetic.
 */

const DEFAULT_STEP_SECONDS = 45;
const TICK_INTERVAL = 20000;

// Guards the catch-up loop. An order woken after a long sleep may be several
// stages overdue, but no order has more stages than this.
const MAX_STEPS_PER_SWEEP = 200;

const COPY = {
  PENDING: {
    label: "Order placed",
    detail: "We have your order and are waiting for the payment to clear.",
  },
  CONFIRMED: {
    label: "Payment confirmed",
    detail: "Payment cleared. The seller has been notified.",
  },
  PACKED: {
    label: "Packed",
    detail: "The seller packed your order and printed the shipping label.",
  },
  SHIPPED: {
    label: "Shipped",
    detail: "Collected by the courier and moving towards your city.",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    detail: "With the delivery partner now. It should arrive today.",
  },
  DELIVERED: {
    label: "Delivered",
    detail: "Handed over at your shipping address. Enjoy it.",
  },
  CANCELLED: {
    label: "Cancelled",
    detail: "This order was cancelled and its stock returned to the catalog.",
  },
};

// `steps` is a multiple of the configured step, so one env var slows or speeds
// the whole pipeline while keeping the stages proportionate to each other.
const STAGES = [
  { status: "PACKED", steps: 1 },
  { status: "SHIPPED", steps: 2, notify: "ORDER_NOTIFICATION.ORDER_SHIPPED" },
  { status: "OUT_FOR_DELIVERY", steps: 2 },
  {
    status: "DELIVERED",
    steps: 1,
    notify: "ORDER_NOTIFICATION.ORDER_DELIVERED",
  },
];

/** A buyer may still pull out until it is handed to the courier. */
const CANCELLABLE = ["PENDING", "CONFIRMED", "PACKED"];

function stepSeconds() {
  const configured = Number(process.env.FULFILMENT_STEP_SECONDS);
  return configured > 0 ? configured : DEFAULT_STEP_SECONDS;
}

/** Set FULFILMENT_SIMULATION=off to freeze orders where they are. */
function isEnabled() {
  return process.env.FULFILMENT_SIMULATION !== "off";
}

function stageAfter(status) {
  if (status === "CONFIRMED") return STAGES[0];

  const index = STAGES.findIndex((stage) => stage.status === status);
  if (index === -1) return null;

  return STAGES[index + 1] ?? null;
}

/** When the stage following `status` becomes due, or null if there is none. */
function nextTransitionAt(status, from = new Date()) {
  const stage = stageAfter(status);
  if (!stage || !isEnabled()) return null;

  return new Date(from.getTime() + stage.steps * stepSeconds() * 1000);
}

function trackingEvent(status, at = new Date()) {
  const copy = COPY[status] ?? { label: status, detail: "" };
  return { status, at, label: copy.label, detail: copy.detail };
}

/**
 * Moves a single due order on by one stage.
 *
 * The new stage is timed from when the last one was *due* rather than from
 * now, so a service that slept through several stages replays the schedule it
 * promised instead of restarting the clock on every wake.
 */
async function advanceOne(filter = {}) {
  for (let guard = 0; guard < MAX_STEPS_PER_SWEEP; guard += 1) {
    const due = await orderModel.findOne({
      ...filter,
      nextTransitionAt: { $ne: null, $lte: new Date() },
    });

    if (!due) return null;

    const stage = stageAfter(due.status);

    if (!stage) {
      // Delivered, cancelled, or never paid for. Whatever put a due time on it,
      // clearing it stops the order being picked up by every future sweep.
      await orderModel.updateOne(
        { _id: due._id },
        { $unset: { nextTransitionAt: "" } },
      );
      continue;
    }

    const at = due.nextTransitionAt;

    // Compare-and-swap on the status we read. Two service instances, or a
    // ticker racing a request catching the same order up, cannot both apply it.
    const order = await orderModel.findOneAndUpdate(
      { _id: due._id, status: due.status },
      {
        status: stage.status,
        nextTransitionAt: nextTransitionAt(stage.status, at),
        $push: { timeline: trackingEvent(stage.status, at) },
      },
      { new: true },
    );

    // Somebody else applied this stage between the read and the write.
    if (!order) continue;

    await publishToOutbox("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", order);

    if (stage.notify) {
      await publishToOutbox(stage.notify, notificationPayload(order));
    }

    return order;
  }

  return null;
}

/**
 * Advances every order matching `filter` that is due, and keeps going until
 * none is.
 *
 * Called both on a timer and from the read paths. The timer covers the seller,
 * who needs an order to progress whether or not the buyer is watching; the
 * read path covers a service that has been asleep, where the timer has not run
 * for hours and the buyer would otherwise refresh into a stale timeline.
 */
async function advanceDueOrders(filter = {}, max = MAX_STEPS_PER_SWEEP) {
  if (!isEnabled()) return 0;

  let advanced = 0;

  while (advanced < max) {
    const order = await advanceOne(filter);
    if (!order) break;
    advanced += 1;
  }

  return advanced;
}

/** Never let a background sweep take down the process. */
function sweepInBackground() {
  advanceDueOrders().catch((err) =>
    console.error("Fulfilment sweep failed:", err.message),
  );
}

function startFulfilmentTicker(intervalMs = TICK_INTERVAL) {
  if (!isEnabled()) {
    console.log("Fulfilment simulation is off");
    return null;
  }

  const timer = setInterval(sweepInBackground, intervalMs);
  timer.unref();
  sweepInBackground();

  return timer;
}

module.exports = {
  CANCELLABLE,
  advanceDueOrders,
  advanceOne,
  isEnabled,
  nextTransitionAt,
  stageAfter,
  startFulfilmentTicker,
  stepSeconds,
  trackingEvent,
};
