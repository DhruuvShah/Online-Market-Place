require("dotenv").config();
const app = require("./src/app");
const http = require("http");

const { initSocketServer } = require("./src/sockets/socket.server");
const attachShutdown = require("./src/shutdown");

const httpServer = http.createServer(app);

initSocketServer(httpServer);

const server = httpServer.listen(process.env.PORT || 3005, () => {
  console.log(
    `AI-Buddy Service is running on port ${process.env.PORT || 3005}`,
  );
});

attachShutdown(server);
