const { subscribeToQueue } = require("./broker");
const orderModel = require("../models/order.model");
const { changeStock } = require("../services/product.service");

module.exports = async function () {
  subscribeToQueue("PAYMENT_ORDER.PAYMENT_COMPLETED", async (data) => {
    await orderModel.findOneAndUpdate(
      { _id: data.orderId, status: "PENDING" },
      { status: "CONFIRMED" },
    );
  });

  subscribeToQueue("PAYMENT_ORDER.PAYMENT_FAILED", async (data) => {
    const order = await orderModel.findOneAndUpdate(
      { _id: data.orderId, status: "PENDING" },
      { status: "CANCELLED" },
      { new: true },
    );

    if (!order) return;

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
