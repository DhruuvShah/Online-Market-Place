const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { randomUUID } = require("node:crypto");

const routes = [
  ["/api/auth", process.env.AUTH_SERVICE_URL || "http://localhost:3000"],
  ["/api/products", process.env.PRODUCT_SERVICE_URL || "http://localhost:3001"],
  ["/api/cart", process.env.CART_SERVICE_URL || "http://localhost:3002"],
  ["/api/orders", process.env.ORDER_SERVICE_URL || "http://localhost:3003"],
  ["/api/payments", process.env.PAYMENT_SERVICE_URL || "http://localhost:3004"],
  [
    "/api/seller/dashboard",
    process.env.SELLER_DASHBOARD_SERVICE_URL || "http://localhost:3007",
  ],
];

const AI_BUDDY_URL =
  process.env.AI_BUDDY_SERVICE_URL || "http://localhost:3005";

morgan.token("id", (req) => req.id);

function attachRequestId(req, res, next) {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(attachRequestId);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(":id :method :url :status :response-time ms"));
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 2000),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "gateway",
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Gateway is running",
    routes: Object.fromEntries([
      ...routes,
      ["/api/socket", AI_BUDDY_URL],
    ]),
  });
});

const socketProxy = createProxyMiddleware({
  pathFilter: "/api/socket",
  target: AI_BUDDY_URL,
  changeOrigin: true,
  ws: true,
});

app.use(socketProxy);

for (const [prefix, target] of routes) {
  app.use(
    createProxyMiddleware({
      pathFilter: prefix,
      target,
      changeOrigin: true,
      on: {
        error: (err, req, res) => {
          console.error(`Proxy error for ${prefix}:`, err.message);
          if (res.writeHead && !res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
          }
          if (res.end) {
            res.end(
              JSON.stringify({ message: `Upstream service unavailable` }),
            );
          }
        },
      },
    }),
  );
}

module.exports = { app, socketProxy };
