function internalAuthMiddleware(req, res, next) {
  const key = req.headers["x-internal-key"];

  if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({
      message: "Unauthorized: Invalid internal key",
    });
  }

  next();
}

module.exports = internalAuthMiddleware;
