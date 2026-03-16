const express = require('express');
const {
  getRooms,
  getRoom,
  checkAvailability,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getRooms)
  .post(protect, authorize('admin'), createRoom);

router.route('/:id')
  .get(getRoom)
  .put(protect, authorize('admin'), updateRoom)
  .delete(protect, authorize('admin'), deleteRoom);

router.post('/:id/availability', checkAvailability);

module.exports = router;
