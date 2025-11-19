const express = require('express');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// GET all products (public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

// GET single product (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ 
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

// POST create product (admin only)
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

// PUT update product (admin only)
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let imageUrl = product.image;
    let cloudinaryId = product.cloudinary_id;

    // If a new image is provided, upload it to Cloudinary
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryId);
        } catch (cloudinaryErr) {
          console.warn('Failed to delete old image from Cloudinary:', cloudinaryErr);
        }
      }

      // Convert buffer to data URI for Cloudinary upload
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload new image to Cloudinary
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        upload_preset: "pizza_unsigned",
        folder: "american_pizza",
        resource_type: "image"
      });

      if (!uploaded || !uploaded.secure_url) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      imageUrl = uploaded.secure_url;
      cloudinaryId = uploaded.public_id;
    }

    // Update product
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.category = req.body.category || product.category;
    product.price = req.body.price ? parseFloat(req.body.price) : product.price;
    product.image = imageUrl;
    product.cloudinary_id = cloudinaryId;
    product.featured = req.body.featured !== undefined ? req.body.featured === "true" : product.featured;

    await product.save();

    res.json(product);

  } catch (err) {
    console.error("Product Update Error:", err);
    const errorMessage = err.message || 'Failed to update product';
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

// DELETE product (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete image from Cloudinary if it exists
    if (product.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(product.cloudinary_id);
      } catch (cloudinaryErr) {
        console.warn('Failed to delete image from Cloudinary:', cloudinaryErr);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });

  } catch (err) {
    console.error("Product Deletion Error:", err);
    res.status(500).json({ 
      message: 'Failed to delete product',
      error: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

module.exports = router;
