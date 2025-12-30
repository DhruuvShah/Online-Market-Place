const userModel = require("../models/user.model");

async function registerUser(req, res) {
  const {
    username,
    email,
    password,
    fullName: { firstName, lastName },
  } = req.body;
}
