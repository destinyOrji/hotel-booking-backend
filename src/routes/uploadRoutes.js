const express = require('express');
const { uploadRoomImages, deleteRoomImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

// Upload room images (multiple files)
router.post(
  '/room-images',
  protect,
  authorize('admin', 'staff'),
  upload.array('images', 10), // Allow up to 10 images
  uploadRoomImages
);

// Delete room image
router.delete(
  '/room-images',
  protect,
  authorize('admin', 'staff'),
  deleteRoomImage
);

module.exports = router;
