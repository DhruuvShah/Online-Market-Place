const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");

const EARNING_STATUSES = ["CONFIRMED", "SHIPPED", "DELIVERED"];
const SERIES_DAYS = 30;
const LOW_STOCK = 5;
const TOP_PRODUCTS = 5;

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

// Every bucket in the window exists, including the empty ones. A chart drawn
// from sparse data lies about the shape of the trend.
function emptySeries(days) {
  const series = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    series.push({ date: dayKey(cursor), revenue: 0, orders: 0, units: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return series;
}

async function sellerCatalog(sellerId) {
  const products = await productModel.find({ seller: sellerId });
  return {
    products,
    productIds: products.map((product) => product._id),
    owns: new Set(products.map((product) => String(product._id))),
  };
}

async function getMetrics(req, res) {
  try {
    const seller = req.user;
    const { products, productIds, owns } = await sellerCatalog(seller.id);

    const orders = await orderModel.find({
      "items.product": { $in: productIds },
      status: { $in: EARNING_STATUSES },
    });

    const series = emptySeries(SERIES_DAYS);
    const buckets = new Map(series.map((point) => [point.date, point]));

    let sales = 0;
    let revenue = 0;
    const perProduct = new Map();

    for (const order of orders) {
      const bucket = buckets.get(dayKey(order.createdAt));
      let orderRevenue = 0;
      let orderUnits = 0;

      for (const item of order.items) {
        if (!owns.has(String(item.product))) continue;

        // price.amount is the unit price; the line total needs the quantity.
        const lineTotal = item.price.amount * item.quantity;
        sales += item.quantity;
        revenue += lineTotal;
        orderRevenue += lineTotal;
        orderUnits += item.quantity;

        const key = String(item.product);
        const running = perProduct.get(key) ?? { sold: 0, revenue: 0 };
        running.sold += item.quantity;
        running.revenue += lineTotal;
        perProduct.set(key, running);
      }

      if (bucket && orderUnits > 0) {
        bucket.revenue += orderRevenue;
        bucket.units += orderUnits;
        bucket.orders += 1;
      }
    }

    const topProducts = [...perProduct.entries()]
      .sort((a, b) => b[1].sold - a[1].sold)
      .slice(0, TOP_PRODUCTS)
      .map(([productId, totals]) => {
        const product = products.find((candidate) =>
          candidate._id.equals(productId),
        );
        if (!product) return null;

        return {
          id: product._id,
          title: product.title,
          image: product.images?.[0]?.thumbnail || product.images?.[0]?.url,
          sold: totals.sold,
          revenue: totals.revenue,
        };
      })
      .filter(Boolean);

    const stockLevels = products
      .map((product) => ({
        id: product._id,
        title: product.title,
        stock: product.stock ?? 0,
      }))
      .sort((a, b) => b.stock - a.stock);

    const stockSummary = stockLevels.reduce(
      (summary, product) => {
        summary.units += product.stock;
        if (product.stock <= 0) summary.outOfStock += 1;
        else if (product.stock <= LOW_STOCK) summary.lowStock += 1;
        else summary.inStock += 1;
        return summary;
      },
      { inStock: 0, lowStock: 0, outOfStock: 0, units: 0 },
    );

    const paidOrders = series.reduce((count, point) => count + point.orders, 0);

    return res.json({
      sales,
      revenue,
      orders: orders.length,
      averageOrderValue: orders.length
        ? Math.round(revenue / orders.length)
        : 0,
      topProducts,
      revenueSeries: series,
      stockLevels,
      stockSummary,
      productCount: products.length,
      recentOrderCount: paidOrders,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function getOrders(req, res) {
  try {
    const seller = req.user;
    const { productIds, owns } = await sellerCatalog(seller.id);

    const orders = await orderModel
      .find({ "items.product": { $in: productIds } })
      .populate("user", "username email fullName")
      .sort({ createdAt: -1 });

    // A shared order can hold other sellers' items; strip them before it
    // leaves the service rather than trusting the client to hide them.
    const filteredOrders = orders
      .map((order) => ({
        ...order.toObject(),
        items: order.items.filter((item) => owns.has(String(item.product))),
      }))
      .filter((order) => order.items.length > 0);

    return res.json(filteredOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function getProducts(req, res) {
  try {
    const seller = req.user;
    const { q, stock } = req.query;

    const filter = { seller: seller.id };

    if (q && String(q).trim()) {
      // Escaped so a stray "(" in the search box cannot break the query.
      const needle = String(q)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(needle, "i");
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    if (stock === "out") filter.stock = { $lte: 0 };
    else if (stock === "low") filter.stock = { $gt: 0, $lte: LOW_STOCK };
    else if (stock === "in") filter.stock = { $gt: LOW_STOCK };

    const products = await productModel.find(filter).sort({ createdAt: -1 });

    return res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  getMetrics,
  getOrders,
  getProducts,
};
