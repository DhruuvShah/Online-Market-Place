const { subscribeToQueue } = require("../broker/broker");
const userModel = require("../models/user.model");

module.exports = async function () {
  subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (user) => {
    await userModel.create(user);
  });
};
