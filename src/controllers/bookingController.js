const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Promotion = require('../models/Promotion');

// @desc    Get all bookings (for regular users - their own bookings)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    const { status, startDate, endDate, roomType } = req.query;
    
    let query = {};
    
    // If not admin, only show user's own bookings
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      query.user = req.user.id;
    }
    
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.checkIn = {};
      if (startDate) query.checkIn.$gte = new Date(startDate);
      if (endDate) query.checkIn.$lte = new Date(endDate);
    }
    
    let bookings = await Booking.find(query)
      .populate('room')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    // Filter by room type if specified
    if (roomType) {
      bookings = bookings.filter(booking => booking.room.type === roomType);
    }
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all bookings with filtering and pagination (Admin)
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      roomType, 
      search,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.checkIn = {};
      if (startDate) query.checkIn.$gte = new Date(startDate);
      if (endDate) query.checkIn.$lte = new Date(endDate);
    }
    
    // Search by guest name, email, or booking reference
    if (search) {
      query.$or = [
        { bookingReference: { $regex: search, $options: 'i' } },
        { 'guestInfo.name': { $regex: search, $options: 'i' } },
        { 'guestInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    let bookings = await Booking.find(query)
      .populate('room')
      .populate('user', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);
    
    // Filter by room type if specified (after population)
    if (roomType) {
      bookings = bookings.filter(booking => booking.room && booking.room.type === roomType);
    }
    
    // Get total count for pagination
    const total = await Booking.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single booking by ID with full details
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room')
      .populate('user', 'name email phone');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user owns this booking or is admin
    if (booking.user._id.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this booking'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single booking by ID (Admin version with full details)
// @route   GET /api/admin/bookings/:id
// @access  Private/Admin
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room')
      .populate('user', 'name email phone')
      .populate('notes.createdBy', 'name email');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guests, guestInfo, specialRequests, promoCode } = req.body;
    
    // Validate required fields
    if (!roomId || !checkIn || !checkOut || !guestInfo) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Get room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // Check room availability
    const overlappingBookings = await Booking.find({
      room: roomId,
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
      $or: [
        { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
        { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
        { checkIn: { $lte: new Date(checkIn) }, checkOut: { $gte: new Date(checkOut) } }
      ]
    });
    
    if (overlappingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Room is not available for selected dates'
      });
    }
    
    // Calculate pricing
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    let basePrice = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      basePrice += room.getPriceForDate(currentDate);
    }
    
    const taxes = basePrice * 0.1; // 10% tax
    const fees = 20; // Fixed service fee
    let discount = 0;
    
    // Apply promo code if provided
    if (promoCode) {
      const promotion = await Promotion.findOne({ code: promoCode.toUpperCase() });
      
      if (promotion && promotion.isValid()) {
        // Check if promotion applies to this room
        if (promotion.applicableRooms.length === 0 || 
            promotion.applicableRooms.includes(roomId)) {
          if (promotion.discountType === 'percentage') {
            discount = basePrice * (promotion.discountValue / 100);
          } else {
            discount = promotion.discountValue;
          }
          
          // Increment usage count
          promotion.usageCount += 1;
          await promotion.save();
        }
      }
    }
    
    const total = basePrice + taxes + fees - discount;
    
    // Create booking
    const booking = await Booking.create({
      room: roomId,
      user: req.user.id,
      guestInfo,
      checkIn,
      checkOut,
      guests: {
        adults: guests?.adults || 1,
        children: guests?.children || 0
      },
      specialRequests: specialRequests || '',
      pricing: {
        basePrice,
        taxes,
        fees,
        discount,
        total
      },
      promoCode: promoCode || '',
      status: 'pending'
    });
    
    const populatedBooking = await Booking.findById(booking._id)
      .populate('room')
      .populate('user', 'name email');
    
    res.status(201).json({
      success: true,
      data: populatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update booking status with validation
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide status'
      });
    }
    
    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Validate status transitions
    const currentStatus = booking.status;
    
    // Cannot change status of cancelled bookings
    if (currentStatus === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot change status of cancelled booking'
      });
    }
    
    // Cannot change status of checked-out bookings
    if (currentStatus === 'checked-out' && status !== 'checked-out') {
      return res.status(400).json({
        success: false,
        error: 'Cannot change status of checked-out booking'
      });
    }
    
    // Validate logical status progression
    if (currentStatus === 'checked-in' && status === 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot move checked-in booking back to pending'
      });
    }
    
    if (currentStatus === 'checked-in' && status === 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot move checked-in booking back to confirmed'
      });
    }
    
    booking.status = status;
    await booking.save();
    
    const updatedBooking = await Booking.findById(booking._id)
      .populate('room')
      .populate('user', 'name email');
    
    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add note to booking
// @route   POST /api/bookings/:id/notes
// @access  Private/Admin
exports.addBookingNote = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Please provide note text'
      });
    }
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    booking.notes.push({
      text,
      createdBy: req.user.id
    });
    
    await booking.save();
    
    const updatedBooking = await Booking.findById(booking._id)
      .populate('room')
      .populate('user', 'name email')
      .populate('notes.createdBy', 'name');
    
    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user owns this booking or is admin
    if (booking.user.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this booking'
      });
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already cancelled'
      });
    }
    
    if (booking.status === 'checked-out') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed booking'
      });
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    const updatedBooking = await Booking.findById(booking._id)
      .populate('room')
      .populate('user', 'name email');
    
    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get booking statistics for dashboard
// @route   GET /api/admin/bookings/stats
// @access  Private/Admin
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get total bookings count
    const totalBookings = await Booking.countDocuments(dateFilter);
    
    // Get bookings by status
    const bookingsByStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object for easier access
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      'checked-in': 0,
      'checked-out': 0,
      cancelled: 0
    };
    
    bookingsByStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });
    
    // Calculate total revenue
    const revenueData = await Booking.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          averageBookingValue: { $avg: '$pricing.total' }
        }
      }
    ]);
    
    const revenue = revenueData.length > 0 ? revenueData[0] : { totalRevenue: 0, averageBookingValue: 0 };
    
    // Get recent bookings
    const recentBookings = await Booking.find(dateFilter)
      .populate('room', 'name type')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Calculate occupancy rate (bookings with active status)
    const activeBookings = statusCounts.confirmed + statusCounts['checked-in'];
    
    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        statusCounts,
        revenue: {
          total: revenue.totalRevenue,
          average: revenue.averageBookingValue
        },
        activeBookings,
        recentBookings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
