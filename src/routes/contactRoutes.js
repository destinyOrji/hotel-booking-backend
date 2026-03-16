const express = require('express');
const {
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route - submit contact form
router.post('/', submitContact);

// Admin routes
router.get('/admin/stats', protect, authorize('admin', 'staff'), getContactStats);
router.get('/admin', protect, authorize('admin', 'staff'), getAllContacts);
router.get('/admin/:id', protect, authorize('admin', 'staff'), getContactById);
router.put('/admin/:id/status', protect, authorize('admin', 'staff'), updateContactStatus);
router.delete('/admin/:id', protect, authorize('admin'), deleteContact);

module.exports = router;
