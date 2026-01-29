require("dotenv").config();
const ImageKit = require("@imagekit/nodejs");
const { v4: uuidv4 } = require("uuid");

let imagekitInstance = null;

function getImageKit() {
  if (imagekitInstance) return imagekitInstance;

  const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY ? process.env.IMAGEKIT_PUBLIC_KEY.trim() : "";
  const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ? process.env.IMAGEKIT_PRIVATE_KEY.trim() : "";
  const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT ? process.env.IMAGEKIT_URL_ENDPOINT.trim() : "";

  // ✅ If ImageKit config is missing/invalid → DO NOT crash app
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    console.warn("ImageKit config missing. Running without image uploads.");
    return null;
  }

  try {
    imagekitInstance = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY,
      privateKey: IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    });
    console.log("✅ ImageKit initialized successfully");
    return imagekitInstance;
  } catch (err) {
    console.error("ImageKit init failed:", err.message);
    return null;
  }
}

async function uploadImage({ buffer, filename }) {
  console.log("Uploading image:", filename);
  const imagekit = getImageKit();

  // ✅ Fallback mode (dev / test / broken ImageKit)
  if (!imagekit) {
    return {
      id: `mock_${uuidv4()}`,
      url: "https://placehold.co/600x400?text=No+Image",
      thumbnail: "https://placehold.co/150x150?text=No+Image",
    };
  }

  // Convert buffer to base64 string for the new SDK
  const base64File = buffer.toString('base64');

  // New SDK uses client.files.upload() method
  const res = await imagekit.files.upload({
    file: base64File,
    fileName: filename || uuidv4(),
  });

  console.log("Upload successful:", res.fileId);
  return {
    id: res.fileId,
    url: res.url,
    thumbnail: res.thumbnailUrl || res.url,
  };
}

module.exports = { uploadImage };
