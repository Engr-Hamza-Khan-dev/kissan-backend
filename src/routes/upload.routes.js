const express = require('express');
const router = express.Router();
const { uploadToCloudinary, uploadMultipleToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const { authMiddleware } = require('../middleware/auth');

// Upload single image
router.post('/image', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const image = req.files.image;

    // Validate file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(image.mimetype)) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Upload to Cloudinary
    const uploadedImage = await uploadToCloudinary(image, 'products');

    res.json({
      success: true,
      image: uploadedImage,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.images) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const images = req.files.images;

    // Handle single file or multiple files
    const imageArray = Array.isArray(images) ? images : [images];

    // Validate files
    for (const img of imageArray) {
      if (img.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: `File ${img.name} exceeds 5MB limit` });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(img.mimetype)) {
        return res.status(400).json({ error: `File ${img.name} is not a valid image format` });
      }
    }

    // Upload to Cloudinary
    const uploadedImages = await uploadMultipleToCloudinary(imageArray, 'products');

    res.json({
      success: true,
      images: uploadedImages,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

// Delete image
router.post('/delete', authMiddleware, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    await deleteFromCloudinary(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete image' });
  }
});

module.exports = router;
