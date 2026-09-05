const { subscribeToQueue } = require("./broker");
const { publishToOutbox } = require("./outbox");
const orderModel = require("../models/order.model");
const { changeStock } = require("../services/product.service");
const fulfilment = require("../services/fulfilment");

// The seller dashboard replicates orders. Without an update event every order
// stays at the status it was created with, so a paid order still reads as
// awaiting payment and never counts towards revenue.
function projectOrder(order) {
  return publishToOutbox("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", order);
}

module.exports = async function () {
  subscribeToQueue("PAYMENT_ORDER.PAYMENT_COMPLETED", async (data) => {
    const at = new Date();

    // Confirming is also what starts the fulfilment clock: from here the
    // simulator walks the order to DELIVERED on its own.
    const order = await orderModel.findOneAndUpdate(
      { _id: data.orderId, status: "PENDING" },
      {
        status: "CONFIRMED",
        nextTransitionAt: fulfilment.nextTransitionAt("CONFIRMED", at),
        $push: { timeline: fulfilment.trackingEvent("CONFIRMED", at) },
      },
      { new: true },
    );

    if (order) await projectOrder(order);
  });

  subscribeToQueue("PAYMENT_ORDER.PAYMENT_FAILED", async (data) => {
    const order = await orderModel.findOneAndUpdate(
      { _id: data.orderId, status: "PENDING" },
      {
        status: "CANCELLED",
        nextTransitionAt: null,
        $push: { timeline: fulfilment.trackingEvent("CANCELLED") },
      },
      { new: true },
    );

    if (!order) return;

    await projectOrder(order);

    try {
      await changeStock("release", order.items);
    } catch (err) {
      console.error(
        "Failed to release stock after payment failure:",
        err.message,
      );
    }
  });
};

module.exports.projectOrder = projectOrder;
