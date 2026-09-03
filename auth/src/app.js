const express = require("express");
const cookieParser = require("cookie-parser");
const applySecurity = require("./middleware/security.middleware");

const app = express();
applySecurity(app);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "auth",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Auth Service is running" });
});

const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

module.exports = app;
