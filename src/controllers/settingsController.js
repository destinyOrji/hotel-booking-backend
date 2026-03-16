const Settings = require('../models/Settings');

// @desc    Get all settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();
    
    // Don't send sensitive email password to frontend
    const settingsObj = settings.toObject();
    if (settingsObj.emailSettings && settingsObj.emailSettings.auth) {
      settingsObj.emailSettings.auth.pass = settingsObj.emailSettings.auth.pass ? '********' : '';
    }
    
    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update hotel information
// @route   PUT /api/admin/settings/hotel
// @access  Private/Admin
exports.updateHotelInfo = async (req, res) => {
  try {
    const { name, address, phone, email, description } = req.body;
    
    const settings = await Settings.getInstance();
    
    // Update only provided fields
    if (name !== undefined) settings.hotelInfo.name = name;
    if (address !== undefined) settings.hotelInfo.address = address;
    if (phone !== undefined) settings.hotelInfo.phone = phone;
    if (email !== undefined) settings.hotelInfo.email = email;
    if (description !== undefined) settings.hotelInfo.description = description;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update email settings with validation
// @route   PUT /api/admin/settings/email
// @access  Private/Admin
exports.updateEmailSettings = async (req, res) => {
  try {
    const { host, port, secure, user, pass } = req.body;
    
    const settings = await Settings.getInstance();
    
    // Validate required fields for email configuration
    if (host || port || user) {
      if (!host || !port || !user) {
        return res.status(400).json({
          success: false,
          error: 'Host, port, and user are required for email configuration'
        });
      }
    }
    
    // Update email settings
    if (host !== undefined) settings.emailSettings.host = host;
    if (port !== undefined) settings.emailSettings.port = port;
    if (secure !== undefined) settings.emailSettings.secure = secure;
    if (user !== undefined) settings.emailSettings.auth.user = user;
    
    // Only update password if provided (not empty string)
    if (pass && pass !== '********') {
      settings.emailSettings.auth.pass = pass;
    }
    
    await settings.save();
    
    // Don't send password back
    const settingsObj = settings.toObject();
    if (settingsObj.emailSettings && settingsObj.emailSettings.auth) {
      settingsObj.emailSettings.auth.pass = settingsObj.emailSettings.auth.pass ? '********' : '';
    }
    
    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update payment settings
// @route   PUT /api/admin/settings/payment
// @access  Private/Admin
exports.updatePaymentSettings = async (req, res) => {
  try {
    const { currency, taxRate, acceptedMethods } = req.body;
    
    const settings = await Settings.getInstance();
    
    // Validate currency code
    if (currency !== undefined) {
      if (currency.length !== 3) {
        return res.status(400).json({
          success: false,
          error: 'Currency code must be 3 characters (e.g., USD, EUR, GBP)'
        });
      }
      settings.paymentSettings.currency = currency.toUpperCase();
    }
    
    // Validate tax rate
    if (taxRate !== undefined) {
      if (taxRate < 0 || taxRate > 100) {
        return res.status(400).json({
          success: false,
          error: 'Tax rate must be between 0 and 100'
        });
      }
      settings.paymentSettings.taxRate = taxRate;
    }
    
    // Validate accepted methods
    if (acceptedMethods !== undefined) {
      const validMethods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'];
      const invalidMethods = acceptedMethods.filter(method => !validMethods.includes(method));
      
      if (invalidMethods.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment methods: ${invalidMethods.join(', ')}. Valid methods are: ${validMethods.join(', ')}`
        });
      }
      
      settings.paymentSettings.acceptedMethods = acceptedMethods;
    }
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update policies (check-in/out times, cancellation, terms)
// @route   PUT /api/admin/settings/policies
// @access  Private/Admin
exports.updatePolicies = async (req, res) => {
  try {
    const { checkInTime, checkOutTime, cancellationPolicy, termsAndConditions } = req.body;
    
    const settings = await Settings.getInstance();
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (checkInTime !== undefined) {
      if (!timeRegex.test(checkInTime)) {
        return res.status(400).json({
          success: false,
          error: 'Check-in time must be in HH:MM format (e.g., 14:00)'
        });
      }
      settings.checkInTime = checkInTime;
    }
    
    if (checkOutTime !== undefined) {
      if (!timeRegex.test(checkOutTime)) {
        return res.status(400).json({
          success: false,
          error: 'Check-out time must be in HH:MM format (e.g., 11:00)'
        });
      }
      settings.checkOutTime = checkOutTime;
    }
    
    if (cancellationPolicy !== undefined) {
      settings.cancellationPolicy = cancellationPolicy;
    }
    
    if (termsAndConditions !== undefined) {
      settings.termsAndConditions = termsAndConditions;
    }
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
