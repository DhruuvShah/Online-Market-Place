const { subscribeToQueue } = require("./broker");
const { sendEmail } = require("../email");
const {
  welcomeEmail,
  orderPlacedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  sellerOrderEmail,
  paymentInitiatedEmail,
  paymentCompletedEmail,
  paymentFailedEmail,
  productPublishedEmail,
} = require("../templates/emails");

const routes = [
  ["AUTH_NOTIFICATION.USER_CREATED", welcomeEmail],
  ["ORDER_NOTIFICATION.ORDER_PLACED", orderPlacedEmail],
  ["ORDER_NOTIFICATION.ORDER_SHIPPED", orderShippedEmail],
  ["ORDER_NOTIFICATION.ORDER_DELIVERED", orderDeliveredEmail],
  ["ORDER_NOTIFICATION.ORDER_CANCELLED", orderCancelledEmail],
  ["ORDER_NOTIFICATION.SELLER_ORDER_RECEIVED", sellerOrderEmail],
  ["PAYMENT_NOTIFICATION.PAYMENT_INITIATED", paymentInitiatedEmail],
  ["PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", paymentCompletedEmail],
  ["PAYMENT_NOTIFICATION.PAYMENT_FAILED", paymentFailedEmail],
  ["PRODUCT_NOTIFICATION.PRODUCT_CREATED", productPublishedEmail],
];

module.exports = function () {
  for (const [queue, build] of routes) {
    subscribeToQueue(queue, async (data) => {
      if (!data?.email) {
        console.warn(`${queue} arrived without an email address, skipping`);
        return;
      }

      const { subject, text, html } = build(data);
      await sendEmail(data.email, subject, text, html);
    });
  }
};
