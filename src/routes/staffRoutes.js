const express = require('express');
const {
  getAllStaff,
  createStaff,
  updateStaff,
  updateStaffRole,
  toggleStaffStatus
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Staff management routes
router.route('/')
  .get(getAllStaff)
  .post(createStaff);

router.route('/:id')
  .put(updateStaff);

router.route('/:id/role')
  .put(updateStaffRole);

router.route('/:id/status')
  .put(toggleStaffStatus);

module.exports = router;
