const dns = require("node:dns").promises;

// Safely forces the DNS only on your local machine, ignores it in production
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const {connect} = require("./src/broker/broker")

connectDB();

app.listen(3000, () => {
  console.log("Auth service is listening on port 3000");
});
