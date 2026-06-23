import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendEmail } from '../services/email.service.js';
import { AppError } from '../utils/AppError.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post('/', limiter, async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) return next(new AppError('Name, email and message are required', 400));
    await sendEmail({
      to: process.env.SMTP_USER || 'reservations@silverkeyhotel.com',
      subject: `[Contact] ${subject || 'Enquiry'} — ${name}`,
      html: `<h3>Contact Form</h3><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p>${phone ? `<p><b>Phone:</b> ${phone}</p>` : ''}<p><b>Message:</b><br>${message}</p>`,
    });
    // Auto-reply
    sendEmail({
      to: email,
      subject: 'Thank you for contacting Silver Key Hotel',
      html: `<p>Dear ${name.split(' ')[0]},</p><p>We have received your message and will respond within 24 hours.</p><p><b>Silver Key Hotel — Guest Relations</b></p>`,
    }).catch(() => {});
    res.json({ success: true, message: 'Message sent. We will respond within 24 hours.' });
  } catch (err) { next(err); }
});

export default router;
