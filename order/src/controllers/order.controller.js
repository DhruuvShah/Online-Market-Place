const orderModel = require("../models/order.model");
const axios = require("axios");
const { publishToOutbox } = require("../broker/outbox");
const { changeStock } = require("../services/product.service");

const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL || "http://localhost:3002";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";

async function createOrder(req, res) {
  const user = req.user;
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  try {
    // fetch user cart from cart service
    const cartResponse = await axios.get(`${CART_SERVICE_URL}/api/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const products = await Promise.all(
      cartResponse.data.cart.items.map(async (item) => {
        return (
          await axios.get(
            `${PRODUCT_SERVICE_URL}/api/products/${item.productId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          )
        ).data.data;
      }),
    );

    let priceAmount = 0;

    const orderItems = cartResponse.data.cart.items.map((item) => {
      const product = products.find((p) => p._id === item.productId);

      if (!product) {
        const error = new Error("Product is no longer available");
        error.statusCode = 409;
        throw error;
      }

      const itemTotal = product.price.amount * item.quantity;
      priceAmount += itemTotal;

      return {
        product: item.productId,
        quantity: item.quantity,
        price: {
          amount: itemTotal,
          currency: product.price.currency,
        },
      };
    });

    await changeStock("reserve", orderItems);

    const order = await orderModel.create({
      user: user.id,
      items: orderItems,
      status: "PENDING",
      totalPrice: {
        amount: priceAmount,
        currency: "INR", // assuming all products are in USD for simplicity
      },
      shippingAddress: {
        street: req.body.shippingAddress.street,
        city: req.body.shippingAddress.city,
        state: req.body.shippingAddress.state,
        zip: req.body.shippingAddress.pincode,
        country: req.body.shippingAddress.country,
      },
    });

    await publishToOutbox("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order);

    try {
      await axios.delete(`${CART_SERVICE_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to clear cart after order creation:", err.message);
    }

    res.status(201).json({ order });
  } catch (err) {
    if (err.statusCode === 409 || err.response?.status === 409) {
      return res.status(409).json({
        message: err.response?.data?.message || err.message,
        productId: err.response?.data?.productId,
      });
    }

    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
}

async function getMyOrders(req, res) {
  const user = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const orders = await orderModel
      .find({ user: user.id })
      .skip(skip)
      .limit(limit)
      .exec();
    const totalOrders = await orderModel.countDocuments({ user: user.id });

    res.status(200).json({
      orders,
      meta: {
        total: totalOrders,
        page,
        limit,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
}

async function getOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have access to this order" });
    }

    res.status(200).json({ order });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
}

async function cancelOrderById(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have access to this order" });
    }

    // only PENDING orders can be cancelled
    if (order.status !== "PENDING") {
      return res
        .status(409)
        .json({ message: "Order cannot be cancelled at this stage" });
    }

    order.status = "CANCELLED";
    await order.save();

    try {
      await changeStock("release", order.items);
    } catch (err) {
      console.error("Failed to release stock on cancel:", err.message);
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error(err);

    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
}

async function updateOrderAddress(req, res) {
  const user = req.user;
  const orderId = req.params.id;

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have access to this order" });
    }

    // only PENDING orders can have address updated
    if (order.status !== "PENDING") {
      return res
        .status(409)
        .json({ message: "Order address cannot be updated at this stage" });
    }

    order.shippingAddress = {
      street: req.body.shippingAddress.street,
      city: req.body.shippingAddress.city,
      state: req.body.shippingAddress.state,
      zip: req.body.shippingAddress.pincode,
      country: req.body.shippingAddress.country,
    };

    await order.save();

    res.status(200).json({ order });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrderById,
  updateOrderAddress,
};
