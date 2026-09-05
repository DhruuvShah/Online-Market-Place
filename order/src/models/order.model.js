const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
});

// Items snapshot the product as it was when the order was placed. A seller can
// rename a product, drop its price or delete it outright; none of that may
// rewrite history on an order somebody already paid for.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: String,
    image: String,
    seller: mongoose.Schema.Types.ObjectId,
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Unit price, not the line total. The line total is amount * quantity.
    price: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        required: true,
        enum: ["USD", "INR"],
      },
    },
  },
  { _id: true },
);

// One entry per stage the order has actually reached, written as it happens.
// The buyer sees this as a tracking history, so it keeps its own timestamps
// rather than being reconstructed from createdAt and a guess.
const trackingEventSchema = new mongoose.Schema(
  {
    status: String,
    at: Date,
    label: String,
    detail: String,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Snapshotted at checkout for the same reason the items are: fulfilment
    // emails are sent by a background ticker with no request to read a user
    // from, and the order service has no business calling auth to find one.
    userEmail: String,
    username: String,
    items: [orderItemSchema],
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
    },
    timeline: [trackingEventSchema],
    // When the fulfilment simulator should move this order to its next stage.
    // Null once the order is delivered or cancelled and nothing is due.
    nextTransitionAt: Date,
    totalPrice: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        required: true,
        enum: ["USD", "INR"],
      },
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });

// The fulfilment ticker sweeps for due orders on an interval, so the field it
// sweeps on is worth an index even at this size.
orderSchema.index({ nextTransitionAt: 1 });

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;
