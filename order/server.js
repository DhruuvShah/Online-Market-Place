const dns = require("node:dns").promises;

// Safely forces the DNS only on your local machine, ignores it in production
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const { connect } = require("./src/broker/broker");
const { startOutboxDrain } = require("./src/broker/outbox");
const listener = require("./src/broker/listener");
const { startFulfilmentTicker } = require("./src/services/fulfilment");
const attachShutdown = require("./src/shutdown");

connectDB();
connect().then(() => {
  listener();
});
startOutboxDrain();
startFulfilmentTicker();

const server = app.listen(process.env.PORT || 3003, () => {
  console.log(`Order service is running on port ${process.env.PORT || 3003}`);
});

attachShutdown(server);
