const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      role,
      isActive,
      search,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
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
    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get user by ID with booking history
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get user's booking history
    const bookings = await Booking.find({ user: req.params.id })
      .populate('room', 'name type')
      .sort({ createdAt: -1 });
    
    // Calculate booking statistics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'checked-out').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const totalSpent = bookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.pricing.total, 0);
    
    res.status(200).json({
      success: true,
      data: {
        user,
        bookingHistory: bookings,
        statistics: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          totalSpent
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user information
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, permissions } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role) {
      // Validate role
      const validRoles = ['user', 'staff', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      user.role = role;
    }
    if (permissions) {
      // Validate permissions
      const validPermissions = [
        'manage_rooms', 
        'manage_bookings', 
        'manage_users', 
        'view_reports', 
        'manage_promotions', 
        'manage_staff', 
        'manage_settings'
      ];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`
        });
      }
      user.permissions = permissions;
    }
    
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .select('-password -emailVerificationToken -resetPasswordToken');
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .select('-password -emailVerificationToken -resetPasswordToken');
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Search users by criteria
// @route   GET /api/admin/users/search
// @access  Private/Admin
exports.searchUsers = async (req, res) => {
  try {
    const { q, role, isActive, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Please provide search query'
      });
    }
    
    let query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    };
    
    // Additional filters
    if (role) {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .limit(parseInt(limit, 10))
      .sort({ name: 1 });
    
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
