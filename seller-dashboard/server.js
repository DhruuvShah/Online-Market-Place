require("dotenv").config(); // MUST BE AT THE VERY TOP
const dns = require("node:dns").promises;

// Safely forces the DNS only on your local machine, ignores it in production
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const app = require("./src/app");
const connectDB = require("./src/db/db");
const listener = require("./src/broker/listener");
const { connect } = require("./src/broker/broker");

connectDB();
connect().then(() => {
  listener();
});

app.listen(3007, () => {
  console.log("Seller dashboard server is running on port 3007");
});