const { subscribeToQueue } = require("../broker/broker");
const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");

function replicate(model) {
  return async (doc) => {
    await model.findOneAndUpdate({ _id: doc._id }, doc, { upsert: true });
  };
}

module.exports = async function () {
  subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", replicate(userModel));

  subscribeToQueue(
    "PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED",
    replicate(productModel),
  );

  subscribeToQueue(
    "ORDER_SELLER_DASHBOARD.ORDER_CREATED",
    replicate(orderModel),
  );

  subscribeToQueue(
    "PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",
    replicate(paymentModel),
  );

  subscribeToQueue(
    "PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED",
    replicate(paymentModel),
  );
};
