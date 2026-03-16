const Promotion = require('../models/Promotion');

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Private/Admin
exports.getPromotions = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const promotions = await Promotion.find(query)
      .populate('applicableRooms', 'name type')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single promotion
// @route   GET /api/promotions/:id
// @access  Private/Admin
exports.getPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('applicableRooms', 'name type');
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Validate promo code
// @route   POST /api/promotions/validate
// @access  Public
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, roomId } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Please provide promo code'
      });
    }
    
    const promotion = await Promotion.findOne({ code: code.toUpperCase() });
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Invalid promo code'
      });
    }
    
    // Check if promotion is valid
    if (!promotion.isValid()) {
      return res.status(200).json({
        success: true,
        valid: false,
        error: 'Promo code has expired or reached usage limit'
      });
    }
    
    // Check if promotion applies to the room
    if (roomId && promotion.applicableRooms.length > 0) {
      if (!promotion.applicableRooms.includes(roomId)) {
        return res.status(200).json({
          success: true,
          valid: false,
          error: 'Promo code is not applicable to this room'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      valid: true,
      data: {
        code: promotion.code,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create promotion
// @route   POST /api/promotions
// @access  Private/Admin
exports.createPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.create(req.body);
    
    const populatedPromotion = await Promotion.findById(promotion._id)
      .populate('applicableRooms', 'name type');
    
    res.status(201).json({
      success: true,
      data: populatedPromotion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
// @access  Private/Admin
exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('applicableRooms', 'name type');
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
// @access  Private/Admin
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }
    
    await promotion.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get promotion usage statistics
// @route   GET /api/promotions/:id/usage
// @access  Private/Admin
exports.getPromotionUsage = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('applicableRooms', 'name type');
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }
    
    // Calculate usage statistics
    const usagePercentage = promotion.usageLimit 
      ? Math.round((promotion.usageCount / promotion.usageLimit) * 100)
      : null;
    
    const remainingUses = promotion.usageLimit 
      ? Math.max(0, promotion.usageLimit - promotion.usageCount)
      : null;
    
    const isActive = promotion.isValid();
    
    res.status(200).json({
      success: true,
      data: {
        promotionId: promotion._id,
        code: promotion.code,
        description: promotion.description,
        usageCount: promotion.usageCount,
        usageLimit: promotion.usageLimit,
        remainingUses: remainingUses,
        usagePercentage: usagePercentage,
        status: promotion.status,
        isActive: isActive,
        validFrom: promotion.validFrom,
        validTo: promotion.validTo,
        applicableRooms: promotion.applicableRooms
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
