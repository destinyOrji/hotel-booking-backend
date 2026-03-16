const express = require('express');
const {
  register,
  registerAdmin,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  resendVerification
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/resend-verification', resendVerification);
router.get('/me', protect, getMe);

module.exports = router;
