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
    console.log('POST /api/products - Request received');
    console.log('Request body:', {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      featured: req.body.featured
    });
    console.log('File received:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary configuration missing!');
      return res.status(500).json({ 
        message: 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
      });
    }

    // Convert buffer to data URI for Cloudinary upload
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    console.log('Uploading to Cloudinary...');
    // Try unsigned preset first, fallback to signed upload if preset doesn't exist
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "pizza_unsigned";
    
    let uploaded;
    try {
      // First, try with upload preset (unsigned upload)
      if (uploadPreset) {
        console.log(`Attempting upload with preset: ${uploadPreset}`);
        uploaded = await cloudinary.uploader.upload(dataUri, {
          upload_preset: uploadPreset,
          folder: "american_pizza",
          resource_type: "image"
        });
      } else {
        throw new Error('No upload preset configured');
      }
    } catch (presetError) {
      // If preset fails (e.g., preset not found), try signed upload as fallback
      if (presetError.message && presetError.message.includes('preset')) {
        console.warn('Upload preset failed, trying signed upload as fallback...');
        console.warn('Preset error:', presetError.message);
        
        try {
          // Fallback: Use signed upload (requires API secret)
          uploaded = await cloudinary.uploader.upload(dataUri, {
            folder: "american_pizza",
            resource_type: "image",
            // Signed upload doesn't need upload_preset
          });
          console.log('✓ Signed upload successful (fallback)');
        } catch (signedError) {
          console.error('Both preset and signed upload failed:', signedError);
          return res.status(500).json({ 
            message: 'Failed to upload image to Cloudinary. Please create an upload preset named "' + uploadPreset + '" in your Cloudinary dashboard, or ensure your Cloudinary API credentials are correct.',
            error: process.env.NODE_ENV !== 'production' ? signedError.message : undefined
          });
        }
      } else {
        // Other errors (not preset-related)
        console.error('Cloudinary upload error:', presetError);
        return res.status(500).json({ 
          message: 'Failed to upload image to Cloudinary: ' + (presetError.message || 'Unknown error'),
          details: process.env.NODE_ENV !== 'production' ? presetError.message : undefined
        });
      }
    }

    if (!uploaded || !uploaded.secure_url) {
      throw new Error('Failed to upload image to Cloudinary - no secure URL returned');
    }

    console.log('Image uploaded successfully:', uploaded.secure_url);

    // Create product
    console.log('Creating product in database...');
    const product = await Product.create({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: parseFloat(req.body.price),
      image: uploaded.secure_url,
      cloudinary_id: uploaded.public_id,
      featured: req.body.featured === "true"
    });

    console.log('Product created successfully:', product._id);
    res.status(201).json(product);

  } catch (err) {
    console.error("Product Creation Error:", err);
    console.error("Error stack:", err.stack);
    
    // Provide more detailed error message
    let errorMessage = err.message || 'Failed to create product';
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      errorMessage = messages || 'Validation error';
      return res.status(400).json({ message: errorMessage });
    }

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
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "pizza_unsigned";
      let uploaded;
      
      try {
        // Try with preset first
        uploaded = await cloudinary.uploader.upload(dataUri, {
          upload_preset: uploadPreset,
          folder: "american_pizza",
          resource_type: "image"
        });
      } catch (presetError) {
        // Fallback to signed upload if preset fails
        if (presetError.message && presetError.message.includes('preset')) {
          console.warn('Upload preset failed, using signed upload fallback...');
          uploaded = await cloudinary.uploader.upload(dataUri, {
            folder: "american_pizza",
            resource_type: "image"
          });
        } else {
          throw presetError;
        }
      }

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
