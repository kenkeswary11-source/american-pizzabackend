const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Convert buffer to data URI for Cloudinary upload
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary using UNSIGNED preset (no signature required)
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      upload_preset: "pizza_unsigned",   // <<< MUST MATCH CLOUDINARY PRESET NAME
      folder: "american_pizza",
      resource_type: "image"
    });

    if (!uploaded || !uploaded.secure_url) {
      throw new Error('Failed to upload image to Cloudinary');
    }

    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: parseFloat(req.body.price),
      image: uploaded.secure_url,
      cloudinary_id: uploaded.public_id,
      featured: req.body.featured === "true"
    });

    res.status(201).json(product);

  } catch (err) {
    console.error("Product Creation Error:", err);
    // Provide more detailed error message
    const errorMessage = err.message || 'Failed to create product';
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});


module.exports = router;
