const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, required: true },
    paymentId: { type: String },
    razorpayOrderId: { type: String, required: true },
    signature: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    userEmail: { type: String },
    username: { type: String },
    price: {
      amount: { type: Number, required: true },
      currency: {
        type: String,
        required: true,
        default: "INR",
        enum: ["INR", "USD"],
      },
    },
  },
  { timestamps: true },
);

paymentSchema.index({ razorpayOrderId: 1 });

const paymentModel = mongoose.model("payment", paymentSchema);

module.exports = paymentModel;
