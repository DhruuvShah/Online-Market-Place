const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("node:crypto");

const isTest = process.env.NODE_ENV === "test";

morgan.token("id", (req) => req.id);

function attachRequestId(req, res, next) {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}

function applySecurity(app) {
  app.set("trust proxy", 1);

  app.use(helmet());

  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
      credentials: true,
    }),
  );

  app.use(attachRequestId);

  if (!isTest) {
    app.use(morgan(":id :method :url :status :response-time ms"));
  }

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX || 1000),
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => isTest,
    }),
  );
}

module.exports = applySecurity;
