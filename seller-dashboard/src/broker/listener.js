const { subscribeToQueue, publishToQueue } = require("../broker/broker");
const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");

function replicate(model) {
  return async (doc) => {
    await model.findOneAndUpdate({ _id: doc._id }, doc, { upsert: true });
  };
}

// Items snapshot their seller at checkout. Older orders predate that, so fall
// back to the replicated catalog rather than dropping the item on the floor.
async function sellerFor(item) {
  if (item.seller) return String(item.seller);

  const product = await productModel.findById(item.product).select("seller");
  return product ? String(product.seller) : null;
}

async function groupBySeller(items) {
  const groups = new Map();

  for (const item of items) {
    const sellerId = await sellerFor(item);
    if (!sellerId) continue;

    const existing = groups.get(sellerId) ?? [];
    existing.push(item);
    groups.set(sellerId, existing);
  }

  return groups;
}

/**
 * This service is the only one holding both the order and the seller's contact
 * details, so it is where a seller notification can be assembled. One email per
 * seller, carrying only that seller's own lines.
 */
async function notifySellers(order) {
  const groups = await groupBySeller(order.items ?? []);
  if (groups.size === 0) return;

  const [sellers, buyer] = await Promise.all([
    userModel.find({ _id: { $in: [...groups.keys()] } }),
    order.user ? userModel.findById(order.user) : null,
  ]);

  const buyerName = buyer
    ? [buyer.fullName?.firstName, buyer.fullName?.lastName]
        .filter(Boolean)
        .join(" ") || buyer.username
    : null;

  await Promise.all(
    sellers.map((seller) => {
      const items = groups.get(String(seller._id)) ?? [];
      const subtotal = items.reduce(
        (sum, item) => sum + item.price.amount * item.quantity,
        0,
      );

      return publishToQueue("ORDER_NOTIFICATION.SELLER_ORDER_RECEIVED", {
        email: seller.email,
        username: seller.username,
        sellerName: seller.fullName?.firstName || seller.username,
        orderId: String(order._id),
        status: order.status,
        placedAt: order.createdAt,
        currency: order.totalPrice?.currency || "INR",
        subtotal,
        items: items.map((item) => ({
          title: item.title,
          image: item.image,
          quantity: item.quantity,
          amount: item.price.amount,
          currency: item.price.currency,
        })),
        buyer: {
          name: buyerName,
          email: buyer?.email ?? null,
        },
        shippingAddress: order.shippingAddress ?? null,
      });
    }),
  );
}

module.exports = async function () {
  subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", replicate(userModel));

  subscribeToQueue(
    "PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED",
    replicate(productModel),
  );

  // Same upsert as a create: the payload is the whole product either way, so a
  // rename, a price change or a new photo lands as a full replacement.
  subscribeToQueue(
    "PRODUCT_SELLER_DASHBOARD.PRODUCT_UPDATED",
    replicate(productModel),
  );

  subscribeToQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_DELETED", async (doc) => {
    await productModel.deleteOne({ _id: doc._id });
  });

  subscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (doc) => {
    await replicate(orderModel)(doc);

    // The projection is the job; the email is a courtesy. Letting a failed
    // notification throw would nack an order that replicated perfectly well.
    try {
      await notifySellers(doc);
    } catch (error) {
      console.error("Failed to notify sellers of an order:", error.message);
    }
  });

  subscribeToQueue(
    "PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED",
    replicate(paymentModel),
  );

  subscribeToQueue(
    "PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATED",
    replicate(paymentModel),
  );
};

module.exports.notifySellers = notifySellers;
