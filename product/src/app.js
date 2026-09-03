const express = require("express");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middleware/security.middleware");
const productRoutes = require("./routes/product.routes");

const app = express();
applySecurity(app);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "product",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Product service is running",
  });
});

app.use("/api/products", productRoutes);

module.exports = app;
