const express = require("express");
const applySecurity = require("./middleware/security.middleware");

const app = express();
applySecurity(app);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ai-buddy",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "AI Service is running" });
});

module.exports = app;
