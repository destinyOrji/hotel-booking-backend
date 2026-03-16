const mongoose = require('mongoose');

const seasonalPricingSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Please provide a room type'],
    enum: ['single', 'double', 'suite', 'deluxe', 'family'],
    default: 'single'
  },
  description: {
    type: String,
    required: [true, 'Please provide a room description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  basePrice: {
    type: Number,
    required: [true, 'Please provide a base price'],
    min: [0, 'Price cannot be negative']
  },
  capacity: {
    adults: {
      type: Number,
      required: true,
      min: 1,
      default: 2
    },
    children: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr) {
        // Allow empty array or array of valid strings
        if (!Array.isArray(arr)) return false;
        return arr.every(item => typeof item === 'string' && item.trim().length > 0);
      },
      message: 'Images must be an array of valid URL strings'
    }
  },
  status: {
    type: String,
    enum: ['available', 'blocked', 'maintenance'],
    default: 'available'
  },
  seasonalPricing: [seasonalPricingSchema],
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

// Method to get price for a specific date
roomSchema.methods.getPriceForDate = function(date) {
  const checkDate = new Date(date);
  
  // Check if there's seasonal pricing for this date
  const seasonalPrice = this.seasonalPricing.find(pricing => {
    return checkDate >= pricing.startDate && checkDate <= pricing.endDate;
  });
  
  return seasonalPrice ? seasonalPrice.price : this.basePrice;
};

module.exports = mongoose.model('Room', roomSchema);
