const axios = require("axios");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";

function toStockItems(items) {
  return items.map((item) => ({
    productId: item.product,
    quantity: item.quantity,
  }));
}

function changeStock(action, items) {
  return axios.post(
    `${PRODUCT_SERVICE_URL}/api/products/internal/stock/${action}`,
    { items: toStockItems(items) },
    { headers: { "x-internal-key": process.env.INTERNAL_API_KEY } },
  );
}

module.exports = { changeStock };
