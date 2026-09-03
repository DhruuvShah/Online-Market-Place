const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const userModel = require("../../src/models/user.model");
const productModel = require("../../src/models/product.model");
const orderModel = require("../../src/models/order.model");

function signToken({ id, role = "seller" } = {}) {
  return jwt.sign(
    { id: id || new mongoose.Types.ObjectId().toHexString(), role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

function createUser(overrides = {}) {
  return userModel.create({
    username: `buyer_${new mongoose.Types.ObjectId().toHexString().slice(-6)}`,
    email: `${new mongoose.Types.ObjectId().toHexString().slice(-6)}@example.com`,
    password: "hashed",
    fullName: { firstName: "Buy", lastName: "Er" },
    ...overrides,
  });
}

function createProduct(sellerId, overrides = {}) {
  return productModel.create({
    title: "Product",
    price: { amount: 100, currency: "INR" },
    seller: sellerId,
    stock: 10,
    ...overrides,
  });
}

function createOrder({ user, items, status = "CONFIRMED", total = 100 }) {
  return orderModel.create({
    user,
    items,
    status,
    totalPrice: { amount: total, currency: "INR" },
    shippingAddress: {
      street: "1 Test St",
      city: "Pune",
      state: "MH",
      zip: "411001",
      country: "IN",
    },
  });
}

module.exports = { signToken, createUser, createProduct, createOrder };
