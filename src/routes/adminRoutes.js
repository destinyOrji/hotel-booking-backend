const express = require('express');
const {
  getDashboardMetrics,
  getAnalytics,
  getUsers,
  updateUserRole,
  deleteUser
} = require('../controllers/adminController');
const {
  getAllBookings,
  getBookingById,
  getBookingStats,
  updateBookingStatus,
  cancelBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin or staff role
router.use(protect);
router.use(authorize('admin', 'staff'));

// Dashboard routes
router.get('/dashboard', getDashboardMetrics);
router.get('/analytics', getAnalytics);

// User management routes (basic - detailed routes in userRoutes.js)
router.get('/users', getUsers);
router.put('/users/:id/role', authorize('admin'), updateUserRole);
router.delete('/users/:id', authorize('admin'), deleteUser);

// Booking management routes
router.get('/bookings/stats', getBookingStats);
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.put('/bookings/:id/status', authorize('admin', 'staff'), updateBookingStatus);
router.delete('/bookings/:id', authorize('admin'), cancelBooking);

module.exports = router;
