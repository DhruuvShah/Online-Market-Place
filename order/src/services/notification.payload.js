// The notification service renders the whole receipt from this payload, so it
// carries everything an email needs and never calls back into another service.
//
// A request-driven event can pass the signed-in user; the fulfilment ticker has
// no request, so it falls back to the buyer snapshotted onto the order.
function notificationPayload(order, user) {
  return {
    email: user?.email ?? order.userEmail,
    username: user?.username ?? order.username,
    orderId: String(order._id),
    status: order.status,
    placedAt: order.createdAt,
    currency: order.totalPrice.currency,
    total: order.totalPrice.amount,
    items: order.items.map((item) => ({
      title: item.title,
      image: item.image,
      quantity: item.quantity,
      amount: item.price.amount,
      currency: item.price.currency,
    })),
    shippingAddress: order.shippingAddress
      ? {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zip: order.shippingAddress.zip,
          country: order.shippingAddress.country,
        }
      : null,
  };
}

module.exports = { notificationPayload };
