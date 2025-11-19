const cloudinary = require("cloudinary").v2;

// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('⚠️  Cloudinary configuration incomplete!');
  console.warn('Missing:', {
    cloud_name: !cloudName,
    api_key: !apiKey,
    api_secret: !apiSecret
  });
  console.warn('Image uploads will fail. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
} else {
  console.log('✓ Cloudinary configured');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = cloudinary;
