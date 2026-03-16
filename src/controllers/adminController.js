const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

// @desc    Get dashboard metrics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get today's check-ins and check-outs
    const todayCheckIns = await Booking.countDocuments({
      checkIn: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked-in'] }
    });
    
    const todayCheckOuts = await Booking.countDocuments({
      checkOut: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
    });
    
    // Get current occupancy
    const totalRooms = await Room.countDocuments({ status: 'available' });
    const occupiedRooms = await Booking.countDocuments({
      checkIn: { $lte: today },
      checkOut: { $gt: today },
      status: { $in: ['confirmed', 'checked-in'] }
    });
    
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    
    // Get revenue for today
    const todayRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' }
        }
      }
    ]);
    
    // Get revenue for current month
    const monthRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' }
        }
      }
    ]);
    
    // Get upcoming bookings (next 7 days)
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    
    const upcomingBookings = await Booking.find({
      checkIn: { $gte: today, $lte: next7Days },
      status: { $in: ['pending', 'confirmed'] }
    })
      .populate('room', 'name type')
      .populate('user', 'name email')
      .sort({ checkIn: 1 })
      .limit(10);
    
    // Check for low availability alerts (next 30 days)
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);
    
    const lowAvailabilityDates = [];
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const bookedRooms = await Booking.countDocuments({
        checkIn: { $lte: checkDate },
        checkOut: { $gt: checkDate },
        status: { $in: ['confirmed', 'checked-in'] }
      });
      
      const availabilityPercent = totalRooms > 0 ? ((totalRooms - bookedRooms) / totalRooms) * 100 : 100;
      
      if (availabilityPercent < 20) {
        lowAvailabilityDates.push({
          date: checkDate,
          availabilityPercent: Math.round(availabilityPercent)
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        todayCheckIns,
        todayCheckOuts,
        todayRevenue: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
        monthRevenue: monthRevenue.length > 0 ? monthRevenue[0].total : 0,
        upcomingBookings,
        lowAvailabilityAlerts: lowAvailabilityDates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get analytics/reports
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Revenue trends
    const revenueTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // Occupancy trends
    const totalRooms = await Room.countDocuments({ status: 'available' });
    
    // Popular rooms
    const popularRooms = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$room',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Populate room details
    const populatedPopularRooms = await Room.populate(popularRooms, {
      path: '_id',
      select: 'name type basePrice'
    });
    
    // Booking sources (would need to track this in booking model)
    const totalBookings = await Booking.countDocuments({
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    });
    
    res.status(200).json({
      success: true,
      data: {
        revenueTrends,
        popularRooms: populatedPopularRooms,
        totalBookings,
        totalRooms
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['user', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid role'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has active bookings
    const activeBookings = await Booking.find({
      user: req.params.id,
      status: { $in: ['pending', 'confirmed', 'checked-in'] }
    });
    
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete user with active bookings'
      });
    }
    
    await user.deleteOne();
    
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
