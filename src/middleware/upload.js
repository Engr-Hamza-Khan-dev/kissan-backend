const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

const uploadToCloudinary = async (file, folder = 'khaity') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: `khaity/${folder}`,
      resource_type: 'auto',
    });

    // Delete temp file
    fs.unlinkSync(file.tempFilePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    // Delete temp file if exists
    if (file && file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
    throw error;
  }
};

const uploadMultipleToCloudinary = async (files, folder = 'khaity') => {
  try {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const uploadedImages = [];

    // Handle single file or array of files
    const fileArray = Array.isArray(files) ? files : [files];

    for (const file of fileArray) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: `khaity/${folder}`,
        resource_type: 'auto',
      });

      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });

      // Delete temp file
      fs.unlinkSync(file.tempFilePath);
    }

    return uploadedImages;
  } catch (error) {
    // Clean up temp files
    const fileArray = Array.isArray(files) ? files : [files];
    for (const file of fileArray) {
      if (file && file.tempFilePath && fs.existsSync(file.tempFilePath)) {
        try {
          fs.unlinkSync(file.tempFilePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    throw error;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
};

