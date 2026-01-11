const ImageKit = require("imagekit");
const { v4: uuidv4 } = require("uuid");

let imagekitInstance = null;

function getImageKit() {
  if (imagekitInstance) return imagekitInstance;

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } =
    process.env;

  // ✅ If ImageKit config is missing/invalid → DO NOT crash app
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    console.warn("ImageKit config missing. Running without image uploads.");
    return null;
  }

  try {
    imagekitInstance = new ImageKit({
      publicKey: IMAGEKIT_PUBLIC_KEY.trim(),
      privateKey: IMAGEKIT_PRIVATE_KEY.trim(),
      urlEndpoint: IMAGEKIT_URL_ENDPOINT.trim(),
    });
    return imagekitInstance;
  } catch (err) {
    console.error("ImageKit init failed:", err.message);
    return null;
  }
}

async function uploadImage({ buffer, filename }) {
  const imagekit = getImageKit();

  // ✅ Fallback mode (dev / test / broken ImageKit)
  if (!imagekit) {
    return {
      id: `mock_${uuidv4()}`,
      url: "https://placehold.co/600x400?text=No+Image",
      thumbnail: "https://placehold.co/150x150?text=No+Image",
    };
  }

  const res = await imagekit.upload({
    file: buffer,
    fileName: filename || uuidv4(),
  });

  return {
    id: res.fileId,
    url: res.url,
    thumbnail: res.thumbnailUrl || res.url,
  };
}

module.exports = { uploadImage };
