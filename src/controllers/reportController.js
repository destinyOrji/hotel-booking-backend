const Booking = require('../models/Booking');
const Room = require('../models/Room');

// Get revenue report for a specified period
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

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

    // Aggregate revenue data
    const revenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.total' },
          totalBasePrice: { $sum: '$pricing.basePrice' },
          totalTaxes: { $sum: '$pricing.taxes' },
          totalFees: { $sum: '$pricing.fees' },
          totalDiscounts: { $sum: '$pricing.discount' }
        }
      }
    ]);

    // Get revenue by status
    const revenueByStatus = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Get revenue by room type
    const revenueByRoomType = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomDetails'
        }
      },
      {
        $unwind: '$roomDetails'
      },
      {
        $group: {
          _id: '$roomDetails.type',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    const result = revenueData[0] || {
      totalRevenue: 0,
      totalBookings: 0,
      averageBookingValue: 0,
      totalBasePrice: 0,
      totalTaxes: 0,
      totalFees: 0,
      totalDiscounts: 0
    };

    res.status(200).json({
      success: true,
      data: {
        summary: result,
        byStatus: revenueByStatus,
        byRoomType: revenueByRoomType,
        period: {
          startDate: start,
          endDate: end
        }
      }
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate revenue report'
    });
  }
};

// Get occupancy report for a specified period
exports.getOccupancyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

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

    // Calculate total number of days in the period
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Get total number of rooms
    const totalRooms = await Room.countDocuments({ status: 'available' });

    // Get bookings that overlap with the period
    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
      $or: [
        { checkIn: { $gte: start, $lte: end } },
        { checkOut: { $gte: start, $lte: end } },
        { checkIn: { $lte: start }, checkOut: { $gte: end } }
      ]
    }).populate('room');

    // Calculate occupied room nights
    let totalOccupiedNights = 0;
    bookings.forEach(booking => {
      const bookingStart = booking.checkIn > start ? booking.checkIn : start;
      const bookingEnd = booking.checkOut < end ? booking.checkOut : end;
      const nights = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24));
      totalOccupiedNights += nights;
    });

    // Calculate occupancy rate
    const totalAvailableNights = totalRooms * totalDays;
    const occupancyRate = totalAvailableNights > 0 
      ? (totalOccupiedNights / totalAvailableNights) * 100 
      : 0;

    // Get occupancy by room type
    const occupancyByRoomType = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
          $or: [
            { checkIn: { $gte: start, $lte: end } },
            { checkOut: { $gte: start, $lte: end } },
            { checkIn: { $lte: start }, checkOut: { $gte: end } }
          ]
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomDetails'
        }
      },
      {
        $unwind: '$roomDetails'
      },
      {
        $group: {
          _id: '$roomDetails.type',
          bookings: { $sum: 1 }
        }
      }
    ]);

    // Get room counts by type
    const roomsByType = await Room.aggregate([
      {
        $match: { status: 'available' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate occupancy rate by room type
    const occupancyByType = roomsByType.map(roomType => {
      const bookingData = occupancyByRoomType.find(b => b._id === roomType._id);
      const bookings = bookingData ? bookingData.bookings : 0;
      const availableNights = roomType.count * totalDays;
      const rate = availableNights > 0 ? (bookings / availableNights) * 100 : 0;
      
      return {
        roomType: roomType._id,
        totalRooms: roomType.count,
        bookings,
        occupancyRate: rate.toFixed(2)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRooms,
          totalDays,
          totalAvailableNights,
          totalOccupiedNights,
          occupancyRate: occupancyRate.toFixed(2),
          totalBookings: bookings.length
        },
        byRoomType: occupancyByType,
        period: {
          startDate: start,
          endDate: end
        }
      }
    });
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate occupancy report'
    });
  }
};

// Get booking trends over time
exports.getBookingTrends = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide startDate and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

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

    // Determine date format based on groupBy parameter
    let dateFormat;
    switch (groupBy) {
      case 'month':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'week':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'day':
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
    }

    // Get booking trends
    const trends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: dateFormat,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: {
              $cond: [{ $in: ['$status', ['confirmed', 'checked-in', 'checked-out']] }, 1, 0]
            }
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['confirmed', 'checked-in', 'checked-out']] },
                '$pricing.total',
                0
              ]
            }
          },
          averageBookingValue: { $avg: '$pricing.total' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get trends by room type
    const trendsByRoomType = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomDetails'
        }
      },
      {
        $unwind: '$roomDetails'
      },
      {
        $group: {
          _id: {
            date: dateFormat,
            roomType: '$roomDetails.type'
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Calculate growth rate
    let growthRate = 0;
    if (trends.length >= 2) {
      const firstPeriod = trends[0].totalBookings;
      const lastPeriod = trends[trends.length - 1].totalBookings;
      if (firstPeriod > 0) {
        growthRate = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        trends,
        trendsByRoomType,
        summary: {
          totalPeriods: trends.length,
          growthRate: growthRate.toFixed(2),
          groupBy
        },
        period: {
          startDate: start,
          endDate: end
        }
      }
    });
  } catch (error) {
    console.error('Error generating booking trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate booking trends'
    });
  }
};

// Export report as CSV
exports.exportReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Please provide reportType, startDate, and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    let csvData = '';
    let filename = '';

    switch (reportType) {
      case 'revenue':
        // Get revenue data
        const revenueBookings = await Booking.find({
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] }
        }).populate('room', 'name type').populate('user', 'name email');

        // Create CSV header
        csvData = 'Booking Reference,Guest Name,Room Name,Room Type,Check-In,Check-Out,Base Price,Taxes,Fees,Discount,Total,Status,Payment Status,Created At\n';

        // Add data rows
        revenueBookings.forEach(booking => {
          csvData += `"${booking.bookingReference}",`;
          csvData += `"${booking.guestInfo.name}",`;
          csvData += `"${booking.room?.name || 'N/A'}",`;
          csvData += `"${booking.room?.type || 'N/A'}",`;
          csvData += `"${booking.checkIn.toISOString().split('T')[0]}",`;
          csvData += `"${booking.checkOut.toISOString().split('T')[0]}",`;
          csvData += `${booking.pricing.basePrice},`;
          csvData += `${booking.pricing.taxes},`;
          csvData += `${booking.pricing.fees},`;
          csvData += `${booking.pricing.discount},`;
          csvData += `${booking.pricing.total},`;
          csvData += `"${booking.status}",`;
          csvData += `"${booking.paymentStatus}",`;
          csvData += `"${booking.createdAt.toISOString()}"\n`;
        });

        filename = `revenue-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
        break;

      case 'occupancy':
        // Get occupancy data
        const occupancyBookings = await Booking.find({
          status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
          $or: [
            { checkIn: { $gte: start, $lte: end } },
            { checkOut: { $gte: start, $lte: end } },
            { checkIn: { $lte: start }, checkOut: { $gte: end } }
          ]
        }).populate('room', 'name type');

        // Create CSV header
        csvData = 'Booking Reference,Room Name,Room Type,Check-In,Check-Out,Nights,Status\n';

        // Add data rows
        occupancyBookings.forEach(booking => {
          const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
          csvData += `"${booking.bookingReference}",`;
          csvData += `"${booking.room?.name || 'N/A'}",`;
          csvData += `"${booking.room?.type || 'N/A'}",`;
          csvData += `"${booking.checkIn.toISOString().split('T')[0]}",`;
          csvData += `"${booking.checkOut.toISOString().split('T')[0]}",`;
          csvData += `${nights},`;
          csvData += `"${booking.status}"\n`;
        });

        filename = `occupancy-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
        break;

      case 'bookings':
        // Get all bookings
        const allBookings = await Booking.find({
          createdAt: { $gte: start, $lte: end }
        }).populate('room', 'name type').populate('user', 'name email');

        // Create CSV header
        csvData = 'Booking Reference,Guest Name,Guest Email,Guest Phone,Room Name,Room Type,Check-In,Check-Out,Adults,Children,Total Price,Status,Payment Status,Promo Code,Created At\n';

        // Add data rows
        allBookings.forEach(booking => {
          csvData += `"${booking.bookingReference}",`;
          csvData += `"${booking.guestInfo.name}",`;
          csvData += `"${booking.guestInfo.email}",`;
          csvData += `"${booking.guestInfo.phone}",`;
          csvData += `"${booking.room?.name || 'N/A'}",`;
          csvData += `"${booking.room?.type || 'N/A'}",`;
          csvData += `"${booking.checkIn.toISOString().split('T')[0]}",`;
          csvData += `"${booking.checkOut.toISOString().split('T')[0]}",`;
          csvData += `${booking.guests.adults},`;
          csvData += `${booking.guests.children},`;
          csvData += `${booking.pricing.total},`;
          csvData += `"${booking.status}",`;
          csvData += `"${booking.paymentStatus}",`;
          csvData += `"${booking.promoCode || 'N/A'}",`;
          csvData += `"${booking.createdAt.toISOString()}"\n`;
        });

        filename = `bookings-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type. Valid types: revenue, occupancy, bookings'
        });
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
};
