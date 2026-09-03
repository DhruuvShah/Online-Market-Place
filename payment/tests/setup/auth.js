const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

function signToken({
  id = new mongoose.Types.ObjectId().toHexString(),
  role = "user",
  username = "buyer",
  email = "buyer@example.com",
} = {}) {
  return jwt.sign({ id, role, username, email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

module.exports = { signToken };
