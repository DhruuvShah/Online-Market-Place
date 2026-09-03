const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();

const secure =
  sameSite === "none" ||
  (process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production");

const cookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
};

const MAX_AGE = 24 * 60 * 60 * 1000;

module.exports = { cookieOptions, MAX_AGE };
