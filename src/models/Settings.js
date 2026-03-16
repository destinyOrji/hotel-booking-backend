const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  hotelInfo: {
    name: {
      type: String,
      required: [true, 'Please provide hotel name'],
      trim: true,
      maxlength: [200, 'Hotel name cannot exceed 200 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    }
  },
  checkInTime: {
    type: String,
    default: '14:00',
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format']
  },
  checkOutTime: {
    type: String,
    default: '11:00',
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format']
  },
  cancellationPolicy: {
    type: String,
    maxlength: [5000, 'Cancellation policy cannot exceed 5000 characters']
  },
  termsAndConditions: {
    type: String,
    maxlength: [10000, 'Terms and conditions cannot exceed 10000 characters']
  },
  emailSettings: {
    host: {
      type: String,
      trim: true
    },
    port: {
      type: Number,
      min: [1, 'Port must be at least 1'],
      max: [65535, 'Port cannot exceed 65535']
    },
    secure: {
      type: Boolean,
      default: false
    },
    auth: {
      user: {
        type: String,
        trim: true
      },
      pass: {
        type: String
      }
    }
  },
  paymentSettings: {
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: [3, 'Currency code must be 3 characters']
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%']
    },
    acceptedMethods: [{
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash']
    }]
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      hotelInfo: {
        name: 'Hotel Management System'
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
