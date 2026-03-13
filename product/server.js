const dns = require("node:dns").promises;

// Safely forces the DNS only on your local machine, ignores it in production
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const { connect } = require("./src/broker/broker");

connectDB();
connect();

app.listen(3001, () => {
  console.log("Product service is listening on port 3001");
});
