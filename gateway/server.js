require("dotenv").config();
const http = require("http");
const { app, socketProxy } = require("./src/app");
const attachShutdown = require("./src/shutdown");

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

server.on("upgrade", socketProxy.upgrade);

server.listen(PORT, () => {
  console.log(`Gateway is listening on port ${PORT}`);
});

attachShutdown(server);
