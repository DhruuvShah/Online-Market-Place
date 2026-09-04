const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis");
const { publishToOutbox } = require("../broker/outbox");
const { cookieOptions, MAX_AGE } = require("../config/cookie");

async function registerUser(req, res) {
  try {
    const {
      username,
      email,
      password,
      fullName: { firstName, lastName },
      role,
    } = req.body;

    const isUserAlreadyExist = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserAlreadyExist) {
      return res
        .status(409)
        .json({ message: "User with given username or email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hash,
      fullName: { firstName, lastName },
      role: role || "user",
    });

    await Promise.all([
      publishToOutbox("AUTH_NOTIFICATION.USER_CREATED", {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      }),
      publishToOutbox("AUTH_SELLER_DASHBOARD.USER_CREATED", user),
    ]);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, { ...cookieOptions, maxAge: MAX_AGE });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function loginUser(req, res) {
  try {
    const { username, email, password } = req.body;

    const user = await userModel
      .findOne({ $or: [{ email }, { username }] })
      .select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, { ...cookieOptions, maxAge: MAX_AGE });

    return res.status(200).json({
      message: "Logged in successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getCurrentUser(req, res) {
  return res.status(200).json({
    message: "Current user fetched successfully",
    user: req.user,
  });
}

async function logoutUser(req, res) {
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (token) {
    try {
      await redis.set(`blacklist:${token}`, "true", "EX", 24 * 60 * 60); // expire in 1 day
    } catch (err) {
      console.error("Failed to blacklist token:", err.message);
    }
  }

  res.clearCookie("token", cookieOptions);

  return res.status(200).json({ message: "Logged out successfully" });
}

async function getUserAddresses(req, res) {
  const id = req.user.id;

  const user = await userModel.findById(id).select("addresses");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "User addresses fetched successfully",
    addresses: user.addresses,
  });
}

async function addUserAddress(req, res) {
  const id = req.user.id;

  const { street, city, state, pincode, country, isDefault } = req.body;

  const user = await userModel.findOneAndUpdate(
    { _id: id },
    {
      $push: {
        addresses: {
          street,
          city,
          state,
          zip: pincode,
          country,
          isDefault,
        },
      },
    },
    { new: true },
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(201).json({
    message: "Address added successfully",
    address: user.addresses[user.addresses.length - 1],
  });
}

async function deleteUserAddress(req, res) {
  const id = req.user.id;
  const { addressId } = req.params;

  const isAddressExists = await userModel.findOne({
    _id: id,
    "addresses._id": addressId,
  });

  if (!isAddressExists) {
    return res.status(404).json({ message: "Address not found" });
  }

  const user = await userModel.findOneAndUpdate(
    { _id: id },
    {
      $pull: {
        addresses: { _id: addressId },
      },
    },
    { new: true },
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const addressExists = user.addresses.some(
    (addr) => addr._id.toString() === addressId,
  );
  if (addressExists) {
    return res.status(500).json({ message: "Failed to delete address" });
  }

  return res.status(200).json({
    message: "Address deleted successfully",
    addresses: user.addresses,
  });
}

async function updateUserProfile(req, res) {
  const id = req.user.id;
  const { username, email, fullName } = req.body;

  const updates = {};

  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (fullName && fullName.firstName !== undefined) {
    updates["fullName.firstName"] = fullName.firstName;
  }
  if (fullName && fullName.lastName !== undefined) {
    updates["fullName.lastName"] = fullName.lastName;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No updatable fields provided" });
  }

  const conflictFilters = [];
  if (updates.username) conflictFilters.push({ username: updates.username });
  if (updates.email) conflictFilters.push({ email: updates.email });

  if (conflictFilters.length > 0) {
    const conflict = await userModel.findOne({
      _id: { $ne: id },
      $or: conflictFilters,
    });

    if (conflict) {
      return res
        .status(409)
        .json({ message: "Username or email is already in use" });
    }
  }

  const user = await userModel.findOneAndUpdate({ _id: id }, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Profile updated successfully",
    user,
  });
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  deleteUserAddress,
};
