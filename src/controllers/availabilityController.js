const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const Booking = require('../models/Booking');

// @desc    Get room availability for calendar view
// @route   GET /api/admin/availability
// @access  Private/Admin
exports.getAvailability = async (req, res) => {
  try {
    const { startDate, endDate, roomId } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    // Build query for rooms
    const roomQuery = roomId ? { _id: roomId } : {};
    const rooms = await Room.find(roomQuery).select('name type status');

    // Get all bookings in the date range
    const bookings = await Booking.find({
      $or: [
        { checkIn: { $lte: end }, checkOut: { $gte: start } }
      ],
      status: { $in: ['pending', 'confirmed', 'checked-in'] }
    }).select('room checkIn checkOut status');

    // Get all blocked dates in the range
    const blocks = await RoomBlock.find({
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    }).populate('createdBy', 'name email');

    // Build availability data for each room
    const availability = rooms.map(room => {
      const roomBookings = bookings.filter(
        booking => booking.room.toString() === room._id.toString()
      );
      
      const roomBlocks = blocks.filter(
        block => block.room.toString() === room._id.toString()
      );

      return {
        room: {
          id: room._id,
          name: room.name,
          type: room.type,
          status: room.status
        },
        bookings: roomBookings.map(booking => ({
          id: booking._id,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status
        })),
        blocks: roomBlocks.map(block => ({
          id: block._id,
          startDate: block.startDate,
          endDate: block.endDate,
          reason: block.reason,
          createdBy: block.createdBy
        }))
      };
    });

    res.status(200).json({
      success: true,
      count: availability.length,
      data: availability
    });
  } catch (error) {
    console.error('Error in getAvailability:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching availability'
    });
  }
};

// @desc    Block room for specific dates
// @route   POST /api/admin/availability/block
// @access  Private/Admin
exports.blockRoom = async (req, res) => {
  try {
    const { roomId, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!roomId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Please provide roomId, startDate, endDate, and reason'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check for conflicts with existing confirmed bookings
    const conflictingBookings = await Booking.find({
      room: roomId,
      $or: [
        { checkIn: { $lte: end }, checkOut: { $gte: start } }
      ],
      status: { $in: ['confirmed', 'checked-in'] }
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot block room - conflicts with existing confirmed bookings',
        conflicts: conflictingBookings.map(booking => ({
          id: booking._id,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          status: booking.status
        }))
      });
    }

    // Check for conflicts with existing blocks
    const conflictingBlocks = await RoomBlock.find({
      room: roomId,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (conflictingBlocks.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot block room - conflicts with existing blocks',
        conflicts: conflictingBlocks.map(block => ({
          id: block._id,
          startDate: block.startDate,
          endDate: block.endDate,
          reason: block.reason
        }))
      });
    }

    // Create the room block
    const roomBlock = await RoomBlock.create({
      room: roomId,
      startDate: start,
      endDate: end,
      reason,
      createdBy: req.user._id
    });

    const populatedBlock = await RoomBlock.findById(roomBlock._id)
      .populate('room', 'name type')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedBlock
    });
  } catch (error) {
    console.error('Error in blockRoom:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while blocking room'
    });
  }
};

// @desc    Unblock room
// @route   DELETE /api/admin/availability/block/:id
// @access  Private/Admin
exports.unblockRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const roomBlock = await RoomBlock.findById(id);

    if (!roomBlock) {
      return res.status(404).json({
        success: false,
        error: 'Room block not found'
      });
    }

    await roomBlock.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Room block removed successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error in unblockRoom:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while unblocking room'
    });
  }
};

// @desc    Get all blocked dates
// @route   GET /api/admin/availability/blocked
// @access  Private/Admin
exports.getBlockedDates = async (req, res) => {
  try {
    const { roomId, startDate, endDate } = req.query;

    // Build query
    const query = {};
    
    if (roomId) {
      query.room = roomId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }

      query.$or = [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ];
    }

    const blocks = await RoomBlock.find(query)
      .populate('room', 'name type')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      count: blocks.length,
      data: blocks
    });
  } catch (error) {
    console.error('Error in getBlockedDates:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching blocked dates'
    });
  }
};
