const express = require('express');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  addBookingNote,
  cancelBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

router.route('/:id')
  .get(protect, getBooking);

router.put('/:id/status', protect, authorize('admin', 'staff'), updateBookingStatus);
router.post('/:id/notes', protect, authorize('admin', 'staff'), addBookingNote);
router.put('/:id/cancel', protect, cancelBooking);

module.exports = router;
