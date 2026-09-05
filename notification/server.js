const dns = require("node:dns");

// smtp.gmail.com publishes both A and AAAA records. Node 22 hands back
// whatever order the OS gives, which is usually IPv6 first, and most container
// networks have no IPv6 route out — so the send dies with ENETUNREACH before
// TLS is even negotiated. Preferring IPv4 is what makes mail leave the box.
dns.setDefaultResultOrder("ipv4first");

// Every other service already does this. Nodemailer resolves the SMTP host
// itself, so a local resolver that is not listening breaks sending outright.
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

require("dotenv").config();
const app = require("./src/app");
const attachShutdown = require("./src/shutdown");

const server = app.listen(process.env.PORT || 3006, () => {
  console.log(
    `Notification service is running on port ${process.env.PORT || 3006}`,
  );
});

attachShutdown(server);
