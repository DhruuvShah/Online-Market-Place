const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        // Snapshot of the product at purchase time, replicated from the order
        // service so the dashboard never has to join back to the catalog.
        title: String,
        image: String,
        seller: mongoose.Schema.Types.ObjectId,
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        // Unit price. Line total is amount * quantity.
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
    ],
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
    // Replicated from the order service so a seller sees the same fulfilment
    // history the buyer does, without the dashboard having to ask for it.
    timeline: [
      {
        _id: false,
        status: String,
        at: Date,
        label: String,
        detail: String,
      },
    ],
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

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;
