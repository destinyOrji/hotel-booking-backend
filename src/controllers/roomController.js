const Room = require('../models/Room');
const Booking = require('../models/Booking');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
exports.getRooms = async (req, res) => {
  try {
    const { type, minPrice, maxPrice, capacity, status } = req.query;
    
    // Build query
    let query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    else query.status = 'available'; // Default to available rooms
    
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }
    
    if (capacity) {
      query['capacity.adults'] = { $gte: Number(capacity) };
    }
    
    const rooms = await Room.find(query).sort({ basePrice: 1 });
    
    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Check room availability
// @route   POST /api/rooms/:id/availability
// @access  Public
exports.checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.body;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Please provide check-in and check-out dates'
      });
    }
    
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // Check if room is available (not blocked or in maintenance)
    if (room.status !== 'available') {
      return res.status(200).json({
        success: true,
        available: false,
        reason: `Room is currently ${room.status}`
      });
    }
    
    // Check for overlapping bookings
    const overlappingBookings = await Booking.find({
      room: req.params.id,
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
      $or: [
        { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
        { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
        { checkIn: { $lte: new Date(checkIn) }, checkOut: { $gte: new Date(checkOut) } }
      ]
    });
    
    const available = overlappingBookings.length === 0;
    
    res.status(200).json({
      success: true,
      available,
      reason: available ? null : 'Room is already booked for selected dates'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private/Admin
exports.createRoom = async (req, res) => {
  try {
    // Clean up images array - remove empty strings and invalid entries
    if (req.body.images) {
      if (typeof req.body.images === 'string') {
        // If images is a string, try to parse it
        try {
          req.body.images = JSON.parse(req.body.images);
        } catch (e) {
          req.body.images = [];
        }
      }
      
      // Filter out empty or invalid entries
      if (Array.isArray(req.body.images)) {
        req.body.images = req.body.images.filter(img => 
          typeof img === 'string' && img.trim().length > 0
        );
      } else {
        req.body.images = [];
      }
    } else {
      req.body.images = [];
    }
    
    const room = await Room.create(req.body);
    
    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res) => {
  try {
    // Clean up images array - remove empty strings and invalid entries
    if (req.body.images) {
      if (typeof req.body.images === 'string') {
        // If images is a string, try to parse it
        try {
          req.body.images = JSON.parse(req.body.images);
        } catch (e) {
          req.body.images = [];
        }
      }
      
      // Filter out empty or invalid entries
      if (Array.isArray(req.body.images)) {
        req.body.images = req.body.images.filter(img => 
          typeof img === 'string' && img.trim().length > 0
        );
      } else {
        req.body.images = [];
      }
    }
    
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // Check if room has active bookings
    const activeBookings = await Booking.find({
      room: req.params.id,
      status: { $in: ['pending', 'confirmed', 'checked-in'] }
    });
    
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete room with active bookings'
      });
    }
    
    await room.deleteOne();
    
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
