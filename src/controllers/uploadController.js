// @desc    Upload room images
// @route   POST /api/upload/room-images
// @access  Private/Admin
exports.uploadRoomImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least one image'
      });
    }

    // Generate URLs for uploaded files
    const imageUrls = req.files.map(file => {
      return `/uploads/rooms/${file.filename}`;
    });

    res.status(200).json({
      success: true,
      data: imageUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete room image
// @route   DELETE /api/upload/room-images
// @access  Private/Admin
exports.deleteRoomImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please provide image URL'
      });
    }

    // Extract filename from URL
    const filename = imageUrl.split('/').pop();
    const filePath = path.join(__dirname, '../../uploads/rooms', filename);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const path = require('path');
const fs = require('fs');
