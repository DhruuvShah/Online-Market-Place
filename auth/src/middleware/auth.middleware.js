const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

async function isTokenBlacklisted(token) {
  try {
    return (await redis.get(`blacklist:${token}`)) !== null;
  } catch (err) {
    console.error("Blacklist lookup failed:", err.message);
    return false;
  }
}

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = {
  authMiddleware,
};
