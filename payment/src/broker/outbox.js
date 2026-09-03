const { connect, publishToQueue } = require("./broker");
const outboxModel = require("../models/outbox.model");

const MAX_ATTEMPTS = 10;
const DRAIN_INTERVAL = 10000;
const STUCK_AFTER = 60000;

async function claimNextEvent() {
  const stuckBefore = new Date(Date.now() - STUCK_AFTER);

  return outboxModel.findOneAndUpdate(
    {
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { status: "PENDING" },
        { status: "SENDING", updatedAt: { $lt: stuckBefore } },
      ],
    },
    { status: "SENDING", $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } },
  );
}

async function drainOutbox() {
  if (!(await connect())) return;

  let event = await claimNextEvent();

  while (event) {
    const delivered = await publishToQueue(event.queue, event.payload);

    if (delivered) {
      event.status = "SENT";
      event.sentAt = new Date();
      event.lastError = undefined;
    } else {
      event.status = event.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING";
      event.lastError = "Broker unavailable";
    }

    await event.save();

    if (!delivered) return;

    event = await claimNextEvent();
  }
}

function drainInBackground() {
  drainOutbox().catch((err) =>
    console.error("Outbox drain failed:", err.message),
  );
}

async function publishToOutbox(queue, payload = {}) {
  await outboxModel.create({ queue, payload });
  drainInBackground();
}

function startOutboxDrain(intervalMs = DRAIN_INTERVAL) {
  const timer = setInterval(drainInBackground, intervalMs);
  timer.unref();
  drainInBackground();
}

module.exports = {
  publishToOutbox,
  drainOutbox,
  startOutboxDrain,
};
