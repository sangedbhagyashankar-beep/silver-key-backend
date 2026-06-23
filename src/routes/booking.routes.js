import express from 'express';
import {
  checkAvailability, createBooking, confirmBooking,
  getAllBookings, getMyBookings, cancelBooking, getBookingById,
  resendConfirmation, downloadTicket,
} from '../controllers/booking.controller.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware.js';

var router = express.Router();

// Specific routes BEFORE param routes
router.get('/availability', checkAvailability);
router.get('/my', protect, getMyBookings);
router.get('/', protect, authorize('admin', 'superadmin', 'staff'), getAllBookings);
router.post('/', optionalAuth, createBooking);
router.post('/confirm', confirmBooking);
router.get('/:bookingId', optionalAuth, getBookingById);
router.patch('/:bookingId/cancel', optionalAuth, cancelBooking);
router.post('/:bookingId/resend', optionalAuth, resendConfirmation);
router.get('/:bookingId/ticket', optionalAuth, downloadTicket);

export default router;
