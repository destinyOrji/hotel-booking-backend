const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getRevenueReport,
  getOccupancyReport,
  getBookingTrends,
  exportReport
} = require('../controllers/reportController');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Report routes
router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/trends', getBookingTrends);
router.get('/export', exportReport);

module.exports = router;
