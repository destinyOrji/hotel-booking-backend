const Contact = require('../models/Contact');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, subject, and message'
      });
    }

    // Create contact
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
      userId: req.user ? req.user.id : null
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: contact
    });
  } catch (error) {
    console.error('Submit contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form'
    });
  }
};

// @desc    Get all contacts (Admin)
// @route   GET /api/admin/contacts
// @access  Private/Admin
exports.getAllContacts = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const contacts = await Contact.find(query)
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts'
    });
  }
};

// @desc    Get single contact (Admin)
// @route   GET /api/admin/contacts/:id
// @access  Private/Admin
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('resolvedBy', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact'
    });
  }
};

// @desc    Update contact status (Admin)
// @route   PUT /api/admin/contacts/:id/status
// @access  Private/Admin
exports.updateContactStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide status'
      });
    }

    const validStatuses = ['new', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Valid statuses: new, in-progress, resolved, closed'
      });
    }

    const updateData = { status };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedBy = req.user.id;
      updateData.resolvedAt = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('resolvedBy', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact status updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact status'
    });
  }
};

// @desc    Delete contact (Admin)
// @route   DELETE /api/admin/contacts/:id
// @access  Private/Admin
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
};

// @desc    Get contact statistics (Admin)
// @route   GET /api/admin/contacts/stats
// @access  Private/Admin
exports.getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Contact.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Contact.countDocuments({
      createdAt: { $gte: today }
    });

    const statusCounts = {
      new: 0,
      'in-progress': 0,
      resolved: 0,
      closed: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        todayCount,
        byStatus: statusCounts
      }
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact statistics'
    });
  }
};
