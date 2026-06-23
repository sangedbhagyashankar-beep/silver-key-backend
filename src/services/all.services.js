// Consolidated imports for all services
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import axios from 'axios';
import logger from '../utils/logger.js';

// ── payment.service.js ────────────────────────────────────────────
let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

export const createRazorpayOrder = async ({ amount, currency = 'INR', notes = {} }) => {
  const rp = getRazorpay();
  if (!rp) return { id: `demo_order_${Date.now()}`, amount, currency };
  return rp.orders.create({ amount, currency, notes, receipt: `SKH-${Date.now()}` });
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) return true;
  const sign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return sign === signature;
};

// ── email.service.js ──────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const emailTemplates = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed — ${booking.bookingId} | Silver Key Hotel`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2>Booking Confirmed!</h2><p>Dear ${booking.guest?.firstName},</p><p>Your booking <strong>${booking.bookingId}</strong> is confirmed.</p><p>Check-in: ${new Date(booking.checkIn).toDateString()}</p><p>Check-out: ${new Date(booking.checkOut).toDateString()}</p><p>Total: ₹${booking.pricing?.grandTotal?.toLocaleString('en-IN')}</p></div>`,
  }),
  emailVerification: (data) => ({
    subject: 'Verify your Silver Key Hotel account',
    html: `<p>Hi ${data.name}, <a href="${data.verifyUrl}">Click here to verify your email</a>. Link expires in 24 hours.</p>`,
  }),
  passwordReset: (data) => ({
    subject: 'Reset your Silver Key Hotel password',
    html: `<p>Hi ${data.name}, <a href="${data.resetUrl}">Click here to reset your password</a>. Link expires in ${data.expiry}.</p>`,
  }),
};

export const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    if (!process.env.SMTP_USER) {
      logger.info(`[Email DEMO] To: ${to} — ${subject || template}`);
      return;
    }
    const templateContent = template && emailTemplates[template] ? emailTemplates[template](data) : {};
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: subject || templateContent.subject,
      html: html || templateContent.html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error(`Email failed: ${err.message}`);
  }
};

export const sendBookingConfirmationEmail = (booking) =>
  sendEmail({ to: booking.guest.email, template: 'bookingConfirmation', data: booking });

// ── whatsapp.service.js ───────────────────────────────────────────
export const sendWhatsAppMessage = async (to, message) => {
  try {
    if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      logger.info(`[WhatsApp DEMO] To: ${to} — ${message.slice(0, 80)}...`);
      return;
    }
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error(`WhatsApp send failed: ${err.message}`);
  }
};

export const sendWhatsAppConfirmation = (booking) =>
  sendWhatsAppMessage(
    `91${booking.guest.phone}`,
    `🏨 *Silver Key Hotel — Booking Confirmed!*\n\nDear ${booking.guest.firstName},\n\n✅ Booking ID: *${booking.bookingId}*\n📅 Check-in: ${new Date(booking.checkIn).toDateString()}\n📅 Check-out: ${new Date(booking.checkOut).toDateString()}\n💰 Total: ₹${booking.pricing.grandTotal.toLocaleString('en-IN')}\n\nWe look forward to hosting you! 🌟`
  );

export default { createRazorpayOrder, verifyRazorpaySignature, sendEmail, sendBookingConfirmationEmail, sendWhatsAppMessage, sendWhatsAppConfirmation };
