require("dotenv").config();
const app = require("./src/app");
const attachShutdown = require("./src/shutdown");

const server = app.listen(process.env.PORT || 3006, () => {
  console.log(
    `Notification service is running on port ${process.env.PORT || 3006}`,
  );
});

attachShutdown(server);
