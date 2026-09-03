const express = require("express");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middlewares/security.middleware");
const paymentRoutes = require("./router/payment.routes");

const app = express();
applySecurity(app);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "payment",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Payment Service is running" });
});

app.use("/api/payments", paymentRoutes);

module.exports = app;
