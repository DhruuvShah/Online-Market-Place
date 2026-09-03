const express = require("express");
const cartRoutes = require("./routes/cart.routes");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middlewares/security.middleware");

const app = express();

applySecurity(app);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "cart",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Cart service is running",
  });
});

app.use("/api/cart", cartRoutes);

module.exports = app;
