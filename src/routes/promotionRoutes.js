const express = require('express');
const {
  getPromotions,
  getPromotion,
  validatePromoCode,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionUsage
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', validatePromoCode);

router.route('/')
  .get(protect, authorize('admin', 'staff'), getPromotions)
  .post(protect, authorize('admin'), createPromotion);

router.route('/:id')
  .get(protect, authorize('admin', 'staff'), getPromotion)
  .put(protect, authorize('admin'), updatePromotion)
  .delete(protect, authorize('admin'), deletePromotion);

router.get('/:id/usage', protect, authorize('admin', 'staff'), getPromotionUsage);

module.exports = router;
