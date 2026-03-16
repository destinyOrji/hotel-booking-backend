const express = require('express');
const {
  getSettings,
  updateHotelInfo,
  updateEmailSettings,
  updatePaymentSettings,
  updatePolicies
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Settings management routes
router.route('/')
  .get(getSettings);

router.route('/hotel')
  .put(updateHotelInfo);

router.route('/email')
  .put(updateEmailSettings);

router.route('/payment')
  .put(updatePaymentSettings);

router.route('/policies')
  .put(updatePolicies);

module.exports = router;
