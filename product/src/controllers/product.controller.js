const productModel = require("../models/product.model");
const { uploadImage, deleteImage } = require("../services/imagekit.service");
const { publishToOutbox } = require("../broker/outbox");
const mongoose = require("mongoose");

// Accepts multipart/form-data with fields: title, description, priceAmount, priceCurrency, images[] (files)
async function createProduct(req, res) {
  try {
    const {
      title,
      description,
      priceAmount,
      priceCurrency = "INR",
      stock,
    } = req.body;
    const seller = req.user.id; // Extract seller from authenticated user

    const price = {
      amount: Number(priceAmount),
      currency: priceCurrency,
    };

    let images = [];

    if (req.files?.length) {
      images = await Promise.all(
        req.files.map(async (file) => {
          try {
            return await uploadImage({
              buffer: file.buffer,
              filename: file.originalname,
            });
          } catch (err) {
            console.error("Image upload failed:", err.message);
            return null;
          }
        }),
      );

      images = images.filter(Boolean);
    }

    const product = await productModel.create({
      title,
      description,
      price,
      seller,
      images,
      stock: stock === undefined ? 0 : Number(stock),
    });

    await publishToOutbox("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", product);
    await publishToOutbox("PRODUCT_NOTIFICATION.PRODUCT_CREATED", {
      email: req.user.email,
      username: req.user.username,
      productId: product._id,
      sellerId: seller,
    });

    return res.status(201).json({
      message: "Product created",
      data: product,
    });
  } catch (err) {
    console.error("Create product error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getProducts(req, res) {
  const { q, minprice, maxprice, ids, skip = 0, limit = 20 } = req.query;

  const filter = {};

  const requestedIds = ids
    ? ids.split(",").filter((id) => mongoose.Types.ObjectId.isValid(id))
    : null;

  if (requestedIds) {
    if (!requestedIds.length) {
      return res.status(200).json({ data: [] });
    }
    filter._id = { $in: requestedIds };
  }

  if (q) {
    filter.$text = { $search: q };
  }

  if (minprice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $gte: Number(minprice),
    };
  }

  if (maxprice) {
    filter["price.amount"] = {
      ...filter["price.amount"],
      $lte: Number(maxprice),
    };
  }

  const products = await productModel
    .find(filter)
    .skip(Number(skip))
    .limit(requestedIds ? requestedIds.length : Math.min(Number(limit), 20));

  return res.status(200).json({ data: products });
}

async function getProductById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await productModel.findById(id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.status(200).json({ data: product });
}

async function updateProduct(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  // FIX 1: Find by ID only. Do not filter by seller here.
  const product = await productModel.findOne({
    _id: id,
  });

  // FIX 2: Check if product exists
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // FIX 3: Now check if the current user owns it
  if (product.seller.toString() !== req.user.id) {
    return res
      .status(403)
      .json({ message: "Forbidden: You can only update your own products" });
  }

  // Validations passed. Proceed with updates.
  const allowedUpdates = ["title", "description", "price", "stock"];

  for (const key of Object.keys(req.body)) {
    if (allowedUpdates.includes(key)) {
      if (key === "price" && typeof req.body.price === "object") {
        if (req.body.price.amount !== undefined) {
          product.price.amount = Number(req.body.price.amount);
        }
        if (req.body.price.currency !== undefined) {
          product.price.currency = req.body.price.currency;
        }
      } else if (key === "stock") {
        product.stock = Number(req.body.stock);
      } else {
        product[key] = req.body[key];
      }
    }
  }

  await product.save();
  return res.status(200).json({ message: "Product updated", product });
}

async function deleteProduct(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const product = await productModel.findOne({
    _id: id,
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.seller.toString() !== req.user.id) {
    return res
      .status(403)
      .json({ message: "Forbidden: You can only delete your own products" });
  }

  await Promise.all(product.images.map((image) => deleteImage(image.id)));

  await productModel.findOneAndDelete({ _id: id });
  return res.status(200).json({ message: "Product deleted" });
}

async function getProductsBySeller(req, res) {
  const seller = req.user;

  const { skip = 0, limit = 20 } = req.query;

  const products = await productModel
    .find({ seller: seller.id })
    .skip(skip)
    .limit(Math.min(limit, 20));

  return res.status(200).json({ data: products });
}

async function reserveStock(req, res) {
  const { items } = req.body;

  const reserved = [];

  try {
    for (const item of items) {
      const updated = await productModel.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );

      if (!updated) {
        return await rollbackReservation(reserved, res, item.productId);
      }

      reserved.push(item);
    }

    return res.status(200).json({ message: "Stock reserved" });
  } catch (err) {
    console.error("Reserve stock error", err);
    return await rollbackReservation(reserved, res);
  }
}

async function rollbackReservation(reserved, res, productId) {
  await Promise.all(
    reserved.map((item) =>
      productModel.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } },
      ),
    ),
  );

  return res.status(409).json({
    message: "Insufficient stock",
    productId,
  });
}

async function releaseStock(req, res) {
  const { items } = req.body;

  await Promise.all(
    items.map((item) =>
      productModel.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } },
      ),
    ),
  );

  return res.status(200).json({ message: "Stock released" });
}

const MAX_IMAGES = 5;

async function findOwnedProduct(id, sellerId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: { status: 400, message: "Invalid product id" } };
  }

  const product = await productModel.findById(id);

  if (!product) {
    return { error: { status: 404, message: "Product not found" } };
  }

  if (product.seller.toString() !== sellerId) {
    return {
      error: {
        status: 403,
        message: "Forbidden: You can only change your own products",
      },
    };
  }

  return { product };
}

async function addProductImages(req, res) {
  const { product, error } = await findOwnedProduct(req.params.id, req.user.id);

  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  if (!req.files?.length) {
    return res.status(400).json({ message: "No images provided" });
  }

  const remaining = MAX_IMAGES - product.images.length;

  if (remaining <= 0) {
    return res
      .status(409)
      .json({ message: `A product can have at most ${MAX_IMAGES} images` });
  }

  const uploaded = await Promise.all(
    req.files.slice(0, remaining).map(async (file) => {
      try {
        return await uploadImage({
          buffer: file.buffer,
          filename: file.originalname,
        });
      } catch (err) {
        console.error("Image upload failed:", err.message);
        return null;
      }
    }),
  );

  const images = uploaded.filter(Boolean);

  if (!images.length) {
    return res.status(502).json({ message: "Image upload failed" });
  }

  product.images.push(...images);
  await product.save();

  return res.status(201).json({ message: "Images added", product });
}

async function deleteProductImage(req, res) {
  const { product, error } = await findOwnedProduct(req.params.id, req.user.id);

  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  const { imageId } = req.params;
  const image = product.images.find((item) => item.id === imageId);

  if (!image) {
    return res.status(404).json({ message: "Image not found" });
  }

  await deleteImage(image.id);

  product.images = product.images.filter((item) => item.id !== imageId);
  await product.save();

  return res.status(200).json({ message: "Image deleted", product });
}

module.exports = {
  createProduct,
  addProductImages,
  deleteProductImage,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  reserveStock,
  releaseStock,
};
