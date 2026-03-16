const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all staff members
// @route   GET /api/admin/staff
// @access  Private/Admin
exports.getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;

    // Build query
    const query = {
      role: { $in: ['staff', 'admin'] }
    };

    // Filter by specific role if provided
    if (role && ['staff', 'admin'].includes(role)) {
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

    // Execute query with pagination
    const staff = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: staff.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: staff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create staff account
// @route   POST /api/admin/staff
// @access  Private/Admin
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password'
      });
    }

    // Validate role
    if (!role || !['staff', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either staff or admin'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Validate permissions if provided
    const validPermissions = [
      'manage_rooms',
      'manage_bookings',
      'manage_users',
      'view_reports',
      'manage_promotions',
      'manage_staff',
      'manage_settings'
    ];

    let staffPermissions = [];
    if (permissions && Array.isArray(permissions)) {
      staffPermissions = permissions.filter(p => validPermissions.includes(p));
    }

    // Create staff user
    const staff = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role,
      permissions: staffPermissions,
      isActive: true,
      isEmailVerified: true // Staff accounts are pre-verified
    });

    // Remove password from response
    const staffData = staff.toObject();
    delete staffData.password;

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: staffData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update staff details
// @route   PUT /api/admin/staff/:id
// @access  Private/Admin
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Find staff member
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Check if staff member (not regular user)
    if (!['staff', 'admin'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        error: 'User is not a staff member'
      });
    }

    // Prevent admin from updating their own account through this endpoint
    if (staff._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update your own account through this endpoint'
      });
    }

    // Update fields
    if (name) staff.name = name;
    if (email) {
      // Check if email is already taken
      const emailExists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
      staff.email = email;
    }
    if (phone !== undefined) staff.phone = phone;
    
    // Update password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters'
        });
      }
      staff.password = password;
    }

    await staff.save();

    // Remove sensitive fields from response
    const staffData = staff.toObject();
    delete staffData.password;
    delete staffData.emailVerificationToken;
    delete staffData.resetPasswordToken;

    res.status(200).json({
      success: true,
      message: 'Staff details updated successfully',
      data: staffData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update staff role and permissions
// @route   PUT /api/admin/staff/:id/role
// @access  Private/Admin
exports.updateStaffRole = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    // Find staff member
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Check if staff member (not regular user)
    if (!['staff', 'admin'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        error: 'User is not a staff member'
      });
    }

    // Prevent admin from changing their own role
    if (staff._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role'
      });
    }

    // Validate role if provided
    if (role) {
      if (!['staff', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Role must be either staff or admin'
        });
      }
      staff.role = role;
    }

    // Validate and update permissions if provided
    if (permissions && Array.isArray(permissions)) {
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

      staff.permissions = permissions;
    }

    await staff.save();

    // Remove sensitive fields from response
    const staffData = staff.toObject();
    delete staffData.password;
    delete staffData.emailVerificationToken;
    delete staffData.resetPasswordToken;

    res.status(200).json({
      success: true,
      message: 'Staff role and permissions updated successfully',
      data: staffData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Toggle staff status (activate/deactivate)
// @route   PUT /api/admin/staff/:id/status
// @access  Private/Admin
exports.toggleStaffStatus = async (req, res) => {
  try {
    // Find staff member
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    // Check if staff member (not regular user)
    if (!['staff', 'admin'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        error: 'User is not a staff member'
      });
    }

    // Prevent admin from deactivating their own account
    if (staff._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    // Toggle status
    staff.isActive = !staff.isActive;
    await staff.save();

    // Remove sensitive fields from response
    const staffData = staff.toObject();
    delete staffData.password;
    delete staffData.emailVerificationToken;
    delete staffData.resetPasswordToken;

    res.status(200).json({
      success: true,
      message: `Staff account ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      data: staffData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
