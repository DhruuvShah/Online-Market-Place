const orderModel = require("../models/order.model");
const axios = require("axios");
const { publishToOutbox } = require("../broker/outbox");
const { changeStock } = require("../services/product.service");
const { notificationPayload } = require("../services/notification.payload");
const fulfilment = require("../services/fulfilment");

const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL || "http://localhost:3002";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";

/**
 * Brings the caller's orders up to date before reading them.
 *
 * The ticker handles this while the service is awake, but a free deployment
 * sleeps: nobody sweeps for hours, and the buyer would refresh into a timeline
 * frozen where it stood when the last request came in. Catching up on the read
 * is scoped to what is about to be returned, so it stays cheap.
 */
async function catchUp(filter) {
  try {
    await fulfilment.advanceDueOrders(filter);
  } catch (err) {
    // A stale timeline is a better outcome than a failed page load.
    console.error("Could not advance fulfilment before read:", err.message);
  }
}

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

      priceAmount += product.price.amount * item.quantity;

      const image = product.images?.[0];

      return {
        product: item.productId,
        title: product.title,
        image: image?.thumbnail || image?.url,
        seller: product.seller,
        quantity: item.quantity,
        // Unit price. Consumers multiply by quantity for the line total.
        price: {
          amount: product.price.amount,
          currency: product.price.currency,
        },
      };
    });

    await changeStock("reserve", orderItems);

    const order = await orderModel.create({
      user: user.id,
      userEmail: user.email,
      username: user.username,
      items: orderItems,
      status: "PENDING",
      timeline: [fulfilment.trackingEvent("PENDING")],
      totalPrice: {
        amount: priceAmount,
        currency: "INR",
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
    await publishToOutbox(
      "ORDER_NOTIFICATION.ORDER_PLACED",
      notificationPayload(order, user),
    );

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
    await catchUp({ user: user.id });

    const orders = await orderModel
      .find({ user: user.id })
      .sort({ createdAt: -1 })
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
    await catchUp({ _id: orderId });

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

    // Cancellable right up until the courier has it — once an order ships
    // there is nothing left to call off.
    if (!fulfilment.CANCELLABLE.includes(order.status)) {
      return res
        .status(409)
        .json({ message: "Order cannot be cancelled at this stage" });
    }

    order.status = "CANCELLED";
    order.timeline.push(fulfilment.trackingEvent("CANCELLED"));
    // Stops the fulfilment ticker from marching a cancelled order onwards.
    order.nextTransitionAt = null;
    await order.save();

    try {
      await changeStock("release", order.items);
    } catch (err) {
      console.error("Failed to release stock on cancel:", err.message);
    }

    await publishToOutbox("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", order);
    await publishToOutbox(
      "ORDER_NOTIFICATION.ORDER_CANCELLED",
      notificationPayload(order, user),
    );

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

    // Correctable until it is handed to the courier, for the same reason a
    // cancel is: after that the parcel is already going somewhere.
    if (!fulfilment.CANCELLABLE.includes(order.status)) {
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
    await publishToOutbox("ORDER_SELLER_DASHBOARD.ORDER_UPDATED", order);

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
