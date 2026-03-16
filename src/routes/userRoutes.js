const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  searchUsers
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin', 'staff'));

// Search users (must be before /:id to avoid conflict)
router.get('/search', searchUsers);

// Get all users with pagination
router.get('/', getAllUsers);

// Get user by ID with booking history
router.get('/:id', getUserById);

// Update user information
router.put('/:id', authorize('admin'), updateUser);

// Toggle user active status
router.put('/:id/status', authorize('admin'), toggleUserStatus);

module.exports = router;
