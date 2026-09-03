const dns = require("node:dns").promises;

// Safely forces the DNS only on your local machine, ignores it in production
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require("dotenv").config();
const app = require("./src/app");

const connectDB = require("./src/db/db");
const attachShutdown = require("./src/shutdown");

connectDB();

const server = app.listen(process.env.PORT || 3002, () => {
  console.log(`Cart service is running on port ${process.env.PORT || 3002}`);
});

attachShutdown(server);
