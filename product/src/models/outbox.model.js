const mongoose = require("mongoose");

const outboxSchema = new mongoose.Schema(
  {
    queue: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

outboxSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model("outbox", outboxSchema);
