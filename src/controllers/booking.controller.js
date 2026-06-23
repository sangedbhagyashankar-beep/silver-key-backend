import Booking from '../models/Booking.model.js';
import Room from '../models/Room.model.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/payment.service.js';
import { sendBookingConfirmationEmail } from '../services/email.service.js';
import { sendWhatsAppConfirmation } from '../services/whatsapp.service.js';
import { generateTicketBuffer } from '../services/pdf.service.js';
import { AppError } from '../utils/AppError.js';
import { calculatePricing } from '../utils/pricing.js';

// ─── helpers ──────────────────────────────────────────────────────
function hasConflict(roomId, checkInDate, checkOutDate, excludeBookingId) {
  var filter = {
    room: roomId,
    status: { $in: ['confirmed', 'checked_in'] },
    checkIn:  { $lt: checkOutDate },
    checkOut: { $gt: checkInDate },
  };
  if (excludeBookingId) filter._id = { $ne: excludeBookingId };
  return Booking.findOne(filter).lean();
}

// ─── checkAvailability ────────────────────────────────────────────
export const checkAvailability = async function(req, res, next) {
  try {
    var roomId   = req.query.roomId;
    var checkIn  = req.query.checkIn;
    var checkOut = req.query.checkOut;

    if (!roomId || !checkIn || !checkOut)
      return next(new AppError('roomId, checkIn and checkOut are required', 400));

    var checkInDate  = new Date(checkIn);
    var checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate) || isNaN(checkOutDate))
      return next(new AppError('Invalid date format', 400));
    if (checkInDate >= checkOutDate)
      return next(new AppError('Check-out must be after check-in', 400));

    var room = await Room.findById(roomId);
    if (!room) return next(new AppError('Room not found', 404));

    var conflict = await hasConflict(roomId, checkInDate, checkOutDate);
    if (conflict) {
      return res.json({ success: true, available: false, message: 'Room not available for selected dates' });
    }

    var nights  = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    var pricing = calculatePricing(room, nights, checkInDate, checkOutDate);

    res.json({
      success: true,
      available: true,
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        primaryImage: room.primaryImage,
      },
      nights: nights,
      pricing: pricing,
    });
  } catch (err) { next(err); }
};

// ─── createBooking ────────────────────────────────────────────────
export const createBooking = async function(req, res, next) {
  try {
    var roomId   = req.body.roomId;
    var checkIn  = req.body.checkIn;
    var checkOut = req.body.checkOut;
    var adults   = req.body.adults;
    var children = req.body.children || 0;
    var guest    = req.body.guest;

    if (!roomId || !checkIn || !checkOut || !adults || !guest)
      return next(new AppError('roomId, checkIn, checkOut, adults and guest are required', 400));

    if (guest.email) guest.email = guest.email.toLowerCase().trim();

    var room = await Room.findById(roomId);
    if (!room) return next(new AppError('Room not found', 404));

    var checkInDate  = new Date(checkIn);
    var checkOutDate = new Date(checkOut);
    var nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    if (nights < 1) return next(new AppError('Minimum 1 night stay required', 400));

    await Booking.updateMany(
      { room: roomId, status: 'pending', pendingExpiresAt: { $lt: new Date() } },
      { $set: { status: 'cancelled', cancellationReason: 'Auto-expired: payment not completed' } }
    );

    var conflict = await hasConflict(roomId, checkInDate, checkOutDate);
    if (conflict)
      return next(new AppError('Room just got booked for those dates. Please try different dates.', 409));

    var pricing      = calculatePricing(room, nights, checkInDate, checkOutDate);
    var razorpayOrder = await createRazorpayOrder({
      amount:   Math.round(pricing.grandTotal * 100),
      currency: 'INR',
      notes:    { roomId: roomId, guestEmail: guest.email },
    });

    var booking = await Booking.create({
      room:  roomId,
      user:  req.user ? req.user._id : undefined,
      guest: guest,
      checkIn:  checkInDate,
      checkOut: checkOutDate,
      nights:   nights,
      adults:   Number(adults),
      children: Number(children),
      pricing: {
        roomRate:        room.price.base,
        totalRoomCharge: pricing.totalRoomCharge,
        taxes:           pricing.taxes,
        extraBedCharge:  0,
        discount:        pricing.discount || 0,
        grandTotal:      pricing.grandTotal,
      },
      payment: {
        razorpayOrderId: razorpayOrder.id,
        amount:          pricing.grandTotal,
        status:          'pending',
      },
    });

    res.status(201).json({
      success: true,
      booking: {
        id:              booking._id,
        bookingId:       booking.bookingId,
        razorpayOrderId: razorpayOrder.id,
        amount:          pricing.grandTotal,
        currency:        'INR',
        isDemoMode:      !process.env.RAZORPAY_KEY_ID || razorpayOrder.id.startsWith('demo_'),
      },
    });
  } catch (err) { next(err); }
};

// ─── confirmBooking ───────────────────────────────────────────────
export const confirmBooking = async function(req, res, next) {
  try {
    var bookingId         = req.body.bookingId;
    var razorpayOrderId   = req.body.razorpayOrderId;
    var razorpayPaymentId = req.body.razorpayPaymentId;
    var razorpaySignature = req.body.razorpaySignature;

    if (!bookingId) return next(new AppError('bookingId is required', 400));

    if (
      razorpayOrderId && razorpayPaymentId && razorpaySignature &&
      !razorpayOrderId.startsWith('demo_') && process.env.RAZORPAY_KEY_SECRET
    ) {
      var isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isValid) return next(new AppError('Payment verification failed', 400));
    }

    var booking = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      {
        status: 'confirmed',
        $unset: { pendingExpiresAt: '' },
        'payment.razorpayPaymentId': razorpayPaymentId || ('demo_payment_' + Date.now()),
        'payment.status':            'paid',
        'payment.paidAt':            new Date(),
      },
      { new: true }
    ).populate('room', 'name type images price');

    if (!booking) return next(new AppError('Booking not found', 404));

    // Generate PDF ticket and send notifications
    generateTicketBuffer(booking)
      .then(function(pdfBuffer) {
        return Promise.allSettled([
          sendBookingConfirmationEmail(booking, pdfBuffer),
          sendWhatsAppConfirmation(booking),
        ]);
      })
      .then(function(results) {
        var emailResult = results[0];
        var waResult    = results[1];
        if (emailResult.status === 'fulfilled') {
          Booking.findByIdAndUpdate(booking._id, { emailSent: true }).catch(() => {});
        }
        if (waResult.status === 'fulfilled') {
          Booking.findByIdAndUpdate(booking._id, { whatsappSent: true }).catch(() => {});
        }
      })
      .catch(() => {}); // Non-blocking

    res.json({ success: true, booking: booking });
  } catch (err) { next(err); }
};

// ─── resendConfirmation ───────────────────────────────────────────
export const resendConfirmation = async function(req, res, next) {
  try {
    var bookingId = req.params.bookingId;
    var channel   = req.body.channel || 'email'; // 'email' | 'whatsapp' | 'both'

    var booking = await Booking.findOne({ bookingId: bookingId })
      .populate('room', 'name type images price');

    if (!booking) return next(new AppError('Booking not found', 404));

    // Auth check — only owner or admin
    if (req.user) {
      var isOwner = booking.user?.toString() === req.user._id.toString() ||
                    booking.guest?.email === req.user.email;
      var isAdmin = ['admin', 'superadmin', 'staff'].includes(req.user.role);
      if (!isOwner && !isAdmin) return next(new AppError('Not authorized', 403));
    }

    if (!['confirmed', 'checked_in'].includes(booking.status)) {
      return next(new AppError('Can only resend confirmation for confirmed bookings', 400));
    }

    var tasks = [];

    if (channel === 'email' || channel === 'both') {
      tasks.push(
        generateTicketBuffer(booking)
          .then(pdfBuffer => sendBookingConfirmationEmail(booking, pdfBuffer))
      );
    }

    if (channel === 'whatsapp' || channel === 'both') {
      tasks.push(sendWhatsAppConfirmation(booking));
    }

    await Promise.allSettled(tasks);

    res.json({ success: true, message: 'Confirmation resent via ' + channel });
  } catch (err) { next(err); }
};

// ─── getAllBookings (admin) ────────────────────────────────────────
export const getAllBookings = async function(req, res, next) {
  try {
    var page   = Number(req.query.page)  || 1;
    var limit  = Number(req.query.limit) || 20;
    var filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter['$or'] = [
        { bookingId:     { $regex: req.query.search, $options: 'i' } },
        { 'guest.email': { $regex: req.query.search, $options: 'i' } },
        { 'guest.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'guest.lastName':  { $regex: req.query.search, $options: 'i' } },
      ];
    }
    var total    = await Booking.countDocuments(filter);
    var bookings = await Booking.find(filter)
      .populate('room', 'name type')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, total, page, pages: Math.ceil(total / limit), bookings });
  } catch (err) { next(err); }
};

// ─── getMyBookings ────────────────────────────────────────────────
export const getMyBookings = async function(req, res, next) {
  try {
    var userEmail = (req.user.email || '').toLowerCase().trim();

    var filter = {
      $or: [
        { user: req.user._id },
        ...(userEmail ? [{ 'guest.email': userEmail }] : []),
      ],
    };

    var bookings = await Booking.find(filter)
      .populate('room', 'name type images price')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// ─── cancelBooking ────────────────────────────────────────────────
export const cancelBooking = async function(req, res, next) {
  try {
    var booking = await Booking.findOne({ bookingId: req.params.bookingId });
    if (!booking) return next(new AppError('Booking not found', 404));

    if (req.user) {
      var isOwner = booking.user?.toString() === req.user._id.toString() ||
                    booking.guest?.email === req.user.email;
      var isAdmin = ['admin', 'superadmin', 'staff'].includes(req.user.role);
      if (!isOwner && !isAdmin) return next(new AppError('Not authorized to cancel this booking', 403));
    }

    if (!['pending', 'confirmed'].includes(booking.status))
      return next(new AppError('Cannot cancel this booking', 400));

    booking.status             = 'cancelled';
    booking.cancelledAt        = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by guest';
    await booking.save();

    // Send cancellation WhatsApp non-blocking
    import('../services/whatsapp.service.js')
      .then(m => m.sendWhatsAppCancellation(booking))
      .catch(() => {});

    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (err) { next(err); }
};

// ─── getBookingById ───────────────────────────────────────────────
export const getBookingById = async function(req, res, next) {
  try {
    var booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('room', 'name type images price');
    if (!booking) return next(new AppError('Booking not found', 404));
    res.json({ success: true, booking });
  } catch (err) { next(err); }
};

// ─── downloadTicket (PDF download endpoint) ───────────────────────
export const downloadTicket = async function(req, res, next) {
  try {
    var booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('room', 'name type images price');
    if (!booking) return next(new AppError('Booking not found', 404));

    // Auth check
    if (req.user) {
      var isOwner = booking.user?.toString() === req.user._id.toString() ||
                    booking.guest?.email === req.user.email;
      var isAdmin = ['admin', 'superadmin', 'staff'].includes(req.user.role);
      if (!isOwner && !isAdmin) return next(new AppError('Not authorized', 403));
    }

    var pdfBuffer = await generateTicketBuffer(booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Silver-Key-Ticket-' + booking.bookingId + '.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) { next(err); }
};
