const express = require("express");
const createAuthMIddleware = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

router.post(
  "/create/:orderId",
  createAuthMIddleware(["user"]),
  paymentController.createaPayment,
);

router.post(
  "/verify",
  createAuthMIddleware(["user"]),
  paymentController.verifyPayment,
);

module.exports = router;
