const axios = require("axios");
const cartModel = require("../models/cart.model");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";

function getToken(req) {
  return req.cookies?.token || req.headers?.authorization?.split(" ")[1];
}

async function fetchProducts(productIds, token) {
  if (!productIds.length) return new Map();

  try {
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/products`, {
      params: { ids: productIds.join(",") },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return new Map(
      (response.data?.data || []).map((product) => [
        String(product._id),
        product,
      ]),
    );
  } catch (err) {
    console.error("Failed to price cart from product service:", err.message);
    return new Map();
  }
}

async function buildCartResponse(cart, req) {
  const productIds = cart.items.map((item) => String(item.productId));
  const products = await fetchProducts(productIds, getToken(req));

  let subtotal = 0;
  let currency = "INR";

  const items = cart.items.map((item) => {
    const product = products.get(String(item.productId));
    const amount = product?.price?.amount;
    const lineTotal = amount === undefined ? null : amount * item.quantity;

    if (lineTotal !== null) {
      subtotal += lineTotal;
      currency = product.price.currency || currency;
    }

    return {
      productId: String(item.productId),
      quantity: item.quantity,
      title: product?.title ?? null,
      image: product?.images?.[0]?.url ?? null,
      stock: product?.stock ?? null,
      price: amount === undefined ? null : { amount, currency },
      lineTotal,
    };
  });

  return {
    cart: {
      _id: cart._id,
      user: cart.user,
      items,
    },
    totals: {
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      currency,
    },
  };
}

async function getCart(req, res) {
  const user = req.user;

  let cart = await cartModel.findOne({ user: user.id });

  if (!cart) {
    cart = new cartModel({ user: user.id, items: [] });
    await cart.save();
  }

  res.status(200).json(await buildCartResponse(cart, req));
}

async function addItemToCart(req, res) {
  const { productId, qty } = req.body;

  const user = req.user;

  let cart = await cartModel.findOne({ user: user.id });

  if (!cart) {
    cart = new cartModel({ user: user.id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId,
  );

  if (existingItemIndex >= 0) {
    cart.items[existingItemIndex].quantity += qty;
  } else {
    cart.items.push({ productId, quantity: qty });
  }

  await cart.save();

  res.status(200).json({
    message: "Item added to cart",
    ...(await buildCartResponse(cart, req)),
  });
}

async function updateItemQuantity(req, res) {
  const { productId } = req.params;
  const { qty } = req.body;
  const user = req.user;
  const cart = await cartModel.findOne({ user: user.id });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId,
  );
  if (existingItemIndex < 0) {
    return res.status(404).json({ message: "Item not found" });
  }
  cart.items[existingItemIndex].quantity = qty;
  await cart.save();
  res.status(200).json({
    message: "Item updated",
    ...(await buildCartResponse(cart, req)),
  });
}

async function removeItemFromCart(req, res) {
  const { productId } = req.params;
  const user = req.user;

  const cart = await cartModel.findOne({ user: user.id });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId,
  );

  if (existingItemIndex < 0) {
    return res.status(404).json({ message: "Item not found" });
  }

  cart.items.splice(existingItemIndex, 1);
  await cart.save();

  res.status(200).json({
    message: "Item removed from cart",
    ...(await buildCartResponse(cart, req)),
  });
}

async function clearCart(req, res) {
  const user = req.user;

  let cart = await cartModel.findOne({ user: user.id });

  if (!cart) {
    cart = new cartModel({ user: user.id, items: [] });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    message: "Cart cleared",
    ...(await buildCartResponse(cart, req)),
  });
}

module.exports = {
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  getCart,
};
