const express = require("express");
const multer = require("multer");
const productController = require("../controllers/product.controller");
const createAuthMiddleware = require("../middleware/auth.middleware");
const internalAuthMiddleware = require("../middleware/internal.middleware");
const {
  createProductValidators,
  updateProductValidators,
  stockChangeValidators,
} = require("../validators/product.validators");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/internal/stock/reserve",
  internalAuthMiddleware,
  stockChangeValidators,
  productController.reserveStock,
);

router.post(
  "/internal/stock/release",
  internalAuthMiddleware,
  stockChangeValidators,
  productController.releaseStock,
);

// POST /api/products
router.post(
  "/",
  createAuthMiddleware(["admin", "seller"]),
  upload.array("images", 5),
  createProductValidators,
  productController.createProduct,
);

// GET /api/products
router.get("/", productController.getProducts);

router.patch(
  "/:id",
  createAuthMiddleware(["seller"]),
  updateProductValidators,
  productController.updateProduct,
);
router.delete(
  "/:id",
  createAuthMiddleware(["seller"]),
  productController.deleteProduct,
);

router.get(
  "/seller",
  createAuthMiddleware(["seller"]),
  productController.getProductsBySeller,
);

// GET /api/products/:id
router.get("/:id", productController.getProductById);

module.exports = router;
