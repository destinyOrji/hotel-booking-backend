const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    unique: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Please provide a room']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user']
  },
  guestInfo: {
    name: {
      type: String,
      required: [true, 'Please provide guest name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide guest email'],
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide guest phone']
    }
  },
  checkIn: {
    type: Date,
    required: [true, 'Please provide check-in date']
  },
  checkOut: {
    type: Date,
    required: [true, 'Please provide check-out date']
  },
  guests: {
    adults: {
      type: Number,
      min: 1,
      default: 1
    },
    children: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    default: ''
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    taxes: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    fees: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  promoCode: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  },
  notes: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Generate unique booking reference before saving
bookingSchema.pre('save', async function(next) {
  if (!this.bookingReference) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingReference = `BK${timestamp}${random}`;
  }
  next();
});

// Validate check-out is after check-in
bookingSchema.pre('save', function(next) {
  if (this.checkOut <= this.checkIn) {
    next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
