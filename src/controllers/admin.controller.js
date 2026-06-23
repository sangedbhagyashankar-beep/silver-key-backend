import Booking from '../models/Booking.model.js';
import Room from '../models/Room.model.js';
import User from '../models/User.model.js';
import Review from '../models/Review.model.js';
import { AppError } from '../utils/AppError.js';

// ─── Dashboard Overview ───────────────────────────────────────────
export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      todayCheckIns,
      todayCheckOuts,
      monthlyRevenue,
      yearlyRevenue,
      totalRooms,
      occupiedRooms,
      totalGuests,
      avgRating,
      recentBookings,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ checkIn: { $gte: startOfToday }, status: { $in: ['confirmed', 'checked_in'] } }),
      Booking.countDocuments({ checkOut: { $gte: startOfToday }, status: 'checked_in' }),
      Booking.aggregate([
        { $match: { status: 'confirmed', 'payment.paidAt': { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed', 'payment.paidAt': { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$pricing.grandTotal' } } },
      ]),
      Room.countDocuments(),
      Booking.distinct('room', { status: 'checked_in' }).then((r) => r.length),
      User.countDocuments({ role: 'guest' }),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: '$ratings.overall' } } },
      ]),
      Booking.find({ status: { $in: ['pending', 'confirmed'] } })
        .populate('room', 'name type')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    res.json({
      success: true,
      stats: {
        bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings },
        today: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
        revenue: {
          monthly: monthlyRevenue[0]?.total || 0,
          yearly: yearlyRevenue[0]?.total || 0,
        },
        rooms: { total: totalRooms, occupied: occupiedRooms, occupancyRate },
        guests: { total: totalGuests },
        avgRating: avgRating[0] ? Math.round(avgRating[0].avg * 10) / 10 : 0,
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Revenue Chart (monthly breakdown) ───────────────────────────
export const getRevenueChart = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const revenue = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          'payment.paidAt': {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$payment.paidAt' } },
          revenue: { $sum: '$pricing.grandTotal' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map((month, index) => {
      const found = revenue.find((r) => r._id.month === index + 1);
      return { month, revenue: found?.revenue || 0, bookings: found?.bookings || 0 };
    });

    res.json({ success: true, chartData });
  } catch (err) {
    next(err);
  }
};

// ─── Occupancy Report ─────────────────────────────────────────────
export const getOccupancyReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();

    const occupancyData = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
          checkIn: { $lte: end },
          checkOut: { $gte: start },
        },
      },
      {
        $group: {
          _id: '$room',
          bookings: { $sum: 1 },
          totalNights: { $sum: '$nights' },
          totalRevenue: { $sum: '$pricing.grandTotal' },
        },
      },
      {
        $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' },
      },
      { $unwind: '$room' },
      {
        $project: {
          roomName: '$room.name',
          roomType: '$room.type',
          bookings: 1,
          totalNights: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json({ success: true, occupancyData });
  } catch (err) {
    next(err);
  }
};
