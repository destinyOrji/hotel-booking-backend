const mongoose = require('mongoose');

const roomBlockSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Please provide a room']
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for blocking'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide the user who created this block']
  }
}, {
  timestamps: true
});

// Indexes for efficient date range queries
roomBlockSchema.index({ room: 1, startDate: 1, endDate: 1 });
roomBlockSchema.index({ startDate: 1, endDate: 1 });
roomBlockSchema.index({ room: 1 });

// Validate that end date is after start date
roomBlockSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('RoomBlock', roomBlockSchema);
