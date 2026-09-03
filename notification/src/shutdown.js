const mongoose = require("mongoose");

const FORCE_EXIT_AFTER = 10000;

function attachShutdown(server) {
  function shutdown(signal) {
    console.log(`${signal} received, closing server`);

    server.close(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
      }
      process.exit(0);
    });

    setTimeout(() => process.exit(1), FORCE_EXIT_AFTER).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = attachShutdown;
