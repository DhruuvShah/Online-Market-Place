const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: "Validation error", errors: errors.array() });
  }
  next();
}

const createProductValidators = [
  body("title").isString().trim().notEmpty().withMessage("title is required"),
  body("description")
    .optional()
    .isString()
    .withMessage("description must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("description max length is 500 characters"),
  body("priceAmount")
    .notEmpty()
    .withMessage("priceAmount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("priceAmount must be a number > 0"),
  body("priceCurrency")
    .optional()
    .isIn(["USD", "INR"])
    .withMessage("priceCurrency must be USD or INR"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("stock must be an integer >= 0"),
  handleValidationErrors,
];

const updateProductValidators = [
  body("title").optional().isString().trim().notEmpty(),
  body("description").optional().isString().trim().isLength({ max: 500 }),
  body("price.amount").optional().isFloat({ gt: 0 }),
  body("price.currency").optional().isIn(["USD", "INR"]),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("stock must be an integer >= 0"),
  handleValidationErrors,
];

const stockChangeValidators = [
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.productId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product id"),
  body("items.*.quantity")
    .isInt({ gt: 0 })
    .withMessage("quantity must be a positive integer"),
  handleValidationErrors,
];

module.exports = {
  createProductValidators,
  updateProductValidators,
  stockChangeValidators,
};
