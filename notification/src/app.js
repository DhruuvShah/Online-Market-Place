const express = require("express");
const { connect } = require("./broker/broker");
const setListeners = require("./broker/listeners");
const applySecurity = require("./middleware/security.middleware");

const app = express();
applySecurity(app);

connect().then(() => {
  setListeners();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "notification",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Notification Service is running" });
});

module.exports = app;
