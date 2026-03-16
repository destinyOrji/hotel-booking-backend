const express = require('express');
const router = express.Router();
const {
  getAvailability,
  blockRoom,
  unblockRoom,
  getBlockedDates
} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// GET /api/admin/availability - Get room availability for calendar view
router.get('/', getAvailability);

// POST /api/admin/availability/block - Block room for specific dates
router.post('/block', blockRoom);

// DELETE /api/admin/availability/block/:id - Unblock room
router.delete('/block/:id', unblockRoom);

// GET /api/admin/availability/blocked - Get all blocked dates
router.get('/blocked', getBlockedDates);

module.exports = router;
