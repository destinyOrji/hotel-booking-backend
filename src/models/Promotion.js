const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a promo code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Please specify discount type']
  },
  discountValue: {
    type: Number,
    required: [true, 'Please provide discount value'],
    min: [0, 'Discount value cannot be negative']
  },
  validFrom: {
    type: Date,
    required: [true, 'Please provide valid from date']
  },
  validTo: {
    type: Date,
    required: [true, 'Please provide valid to date']
  },
  applicableRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  usageLimit: {
    type: Number,
    min: 0,
    default: null // null means unlimited
  },
  usageCount: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'scheduled', 'expired'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update status based on dates
promotionSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (now < this.validFrom) {
    this.status = 'scheduled';
  } else if (now > this.validTo) {
    this.status = 'expired';
  } else if (this.usageLimit && this.usageCount >= this.usageLimit) {
    this.status = 'expired';
  } else {
    this.status = 'active';
  }
};

// Validate dates
promotionSchema.pre('save', function(next) {
  if (this.validTo <= this.validFrom) {
    next(new Error('Valid to date must be after valid from date'));
  }
  
  // Update status before saving
  this.updateStatus();
  next();
});

// Check if promotion is valid
promotionSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    now >= this.validFrom &&
    now <= this.validTo &&
    (!this.usageLimit || this.usageCount < this.usageLimit)
  );
};

module.exports = mongoose.model('Promotion', promotionSchema);
