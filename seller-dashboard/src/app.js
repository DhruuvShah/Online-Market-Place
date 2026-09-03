const express = require("express");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middleware/security.middleware");
const sellerRoutes = require("./routes/seller.routes");

const app = express();

applySecurity(app);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "seller-dashboard",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Seller Dashboard Service is running" });
});

app.use("/api/seller/dashboard", sellerRoutes);

module.exports = app;
