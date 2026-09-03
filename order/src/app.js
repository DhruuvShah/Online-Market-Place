const express = require("express");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middlewares/security.middleware");

const orderRoutes = require("./routes/order.routes");

const app = express();
applySecurity(app);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "order",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Order service is running",
  });
});

app.use("/api/orders", orderRoutes);

module.exports = app;
