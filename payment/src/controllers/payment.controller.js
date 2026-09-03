const paymentModel = require("../models/payment.model");
const axios = require("axios");
const { publishToOutbox } = require("../broker/outbox");

require("dotenv").config();
const Razorpay = require("razorpay");
const {
  validatePaymentVerification,
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || "http://localhost:3003";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function toSmallestUnit(amount) {
  return Math.round(amount * 100);
}

async function createaPayment(req, res) {
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    const orderId = req.params.orderId;
    const orderResponse = await axios.get(
      `${ORDER_SERVICE_URL}/api/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const price = orderResponse.data.order.totalPrice;

    const order = await razorpay.orders.create({
      amount: toSmallestUnit(price.amount),
      currency: price.currency,
      receipt: `order_${orderId}`,
    });

    const payment = await paymentModel.create({
      order: orderId,
      razorpayOrderId: order.id,
      user: req.user.id,
      userEmail: req.user.email,
      username: req.user.username,
      price: {
        amount: price.amount,
        currency: price.currency,
      },
    });

    await publishToOutbox("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", payment);
    await publishToOutbox("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", {
      email: req.user.email,
      orderId: orderId,
      amount: price.amount,
      currency: price.currency,
      username: req.user.username,
    });

    return res.status(201).json({
      message: "Payment Initiated",
      payment,
    });
  } catch (error) {
    console.error(
      "createaPayment error:",
      error.response?.data || error.message || error,
    );
    const status = error.response?.status || 500;
    const body = error.response?.data || { message: "Internal Server Error" };
    return res.status(status).json(body);
  }
}

async function verifyPayment(req, res) {
  const { razorpayOrderId, paymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const isValid = validatePaymentVerification(
      {
        order_id: razorpayOrderId,
        payment_id: paymentId,
      },
      signature,
      secret,
    );

    if (!isValid) {
      return res.status(400).json({
        message: "Invalid signature",
      });
    }

    const payment = await paymentModel.findOne({
      razorpayOrderId,
      status: "PENDING",
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.status = "COMPLETED";

    await payment.save({ validateBeforeSave: false });

    await publishToOutbox("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
      email: req.user.email,
      orderId: payment.order,
      paymentId: payment.paymentId,
      amount: payment.price.amount,
      currency: payment.price.currency,
      username: req.user.username,
    });

    await publishToOutbox("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", payment);

    await publishToOutbox("PAYMENT_ORDER.PAYMENT_COMPLETED", {
      orderId: payment.order,
    });

    res.status(200).json({
      message: "Payment verified successfully",
      payment,
    });
  } catch (error) {
    console.log(error);
    await publishToOutbox("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
      email: req.user.email,
      paymentId: paymentId,
      orderId: razorpayOrderId,
      username: req.user.username,
    });
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function markPaymentCompleted(payment, razorpayPaymentId) {
  payment.paymentId = razorpayPaymentId;
  payment.status = "COMPLETED";
  await payment.save({ validateBeforeSave: false });

  await publishToOutbox("PAYMENT_ORDER.PAYMENT_COMPLETED", {
    orderId: payment.order,
  });

  await publishToOutbox("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", payment);

  await publishToOutbox("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
    email: payment.userEmail,
    username: payment.username,
    orderId: payment.order,
    paymentId: payment.paymentId,
    amount: payment.price.amount,
    currency: payment.price.currency,
  });
}

async function markPaymentFailed(payment, razorpayPaymentId) {
  payment.paymentId = razorpayPaymentId;
  payment.status = "FAILED";
  await payment.save({ validateBeforeSave: false });

  await publishToOutbox("PAYMENT_ORDER.PAYMENT_FAILED", {
    orderId: payment.order,
  });

  await publishToOutbox("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED", payment);

  await publishToOutbox("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
    email: payment.userEmail,
    username: payment.username,
    orderId: payment.order,
    paymentId: payment.paymentId,
  });
}

async function handleWebhook(req, res) {
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature || !req.rawBody) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  let isValid = false;

  try {
    isValid = validateWebhookSignature(
      req.rawBody.toString(),
      signature,
      secret,
    );
  } catch (error) {
    isValid = false;
  }

  if (!isValid) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  try {
    const event = req.body.event;
    const entity = req.body.payload?.payment?.entity;

    if (!entity?.order_id) {
      return res.status(200).json({ message: "Event ignored" });
    }

    const payment = await paymentModel.findOne({
      razorpayOrderId: entity.order_id,
    });

    if (!payment) {
      return res.status(200).json({ message: "Unknown payment" });
    }

    if (event === "payment.captured" && payment.status === "PENDING") {
      await markPaymentCompleted(payment, entity.id);
    }

    if (event === "payment.failed" && payment.status === "PENDING") {
      await markPaymentFailed(payment, entity.id);
    }

    return res.status(200).json({ message: "Processed" });
  } catch (error) {
    console.error("Webhook handling failed:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createaPayment,
  verifyPayment,
  handleWebhook,
};
