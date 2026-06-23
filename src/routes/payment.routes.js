import express from 'express';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/payment.service.js';
import { AppError } from '../utils/AppError.js';

const router = express.Router();

router.post('/create-order', async (req, res, next) => {
  try {
    const { amount, currency = 'INR', notes = {} } = req.body;
    if (!amount) return next(new AppError('Amount is required', 400));
    const order = await createRazorpayOrder({ amount: Math.round(amount * 100), currency, notes });
    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

router.post('/verify', async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) return next(new AppError('Payment verification failed', 400));
    res.status(200).json({ success: true, message: 'Payment verified' });
  } catch (error) {
    next(error);
  }
});

export default router;
