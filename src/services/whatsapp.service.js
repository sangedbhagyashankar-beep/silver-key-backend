import axios from 'axios';
import logger from '../utils/logger.js';

// ─── sendWhatsAppMessage (plain text) ────────────────────────────
export const sendWhatsAppMessage = async function(to, message) {
  try {
    if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      logger.info('[WhatsApp DEMO] ' + to + ': ' + message.slice(0, 80));
      return { demo: true };
    }
    await axios.post(
      'https://graph.facebook.com/v19.0/' + process.env.WHATSAPP_PHONE_NUMBER_ID + '/messages',
      {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.WHATSAPP_API_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info('[WhatsApp] Sent to ' + to);
    return { sent: true };
  } catch (err) {
    logger.error('[WhatsApp] Failed to ' + to + ': ' + err.message);
    return { error: err.message };
  }
};

// ─── sendWhatsAppConfirmation — rich booking confirmation ────────
export const sendWhatsAppConfirmation = function(booking) {
  var checkIn  = new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  var checkOut = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  var total    = (booking.pricing.grandTotal || 0).toLocaleString('en-IN');
  var roomName = booking.room && booking.room.name ? booking.room.name : 'Your Room';
  var nights   = booking.nights;

  var message =
    '🏨 *Silver Key Hotel — Booking Confirmed!*\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '📋 *Booking ID:* ' + booking.bookingId + '\n' +
    '👤 *Guest:* ' + booking.guest.firstName + ' ' + booking.guest.lastName + '\n' +
    '🛏️ *Room:* ' + roomName + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '📅 *Check-in:* ' + checkIn + ' (2:00 PM)\n' +
    '📅 *Check-out:* ' + checkOut + ' (12:00 PM)\n' +
    '🌙 *Duration:* ' + nights + ' Night' + (nights !== 1 ? 's' : '') + '\n' +
    '👥 *Guests:* ' + booking.adults + ' Adult' + (booking.adults !== 1 ? 's' : '') +
      (booking.children ? ' + ' + booking.children + ' Child' : '') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '💰 *Total Paid:* ₹' + total + '\n' +
    '✅ *Payment:* Confirmed\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📍 *Location:* #12, Palace Road, Mysuru – 570001\n' +
    '📞 *Reception (24x7):* +91 93228 00100\n\n' +
    '_Please carry a valid photo ID at check-in._\n' +
    '_Your PDF ticket has been emailed to you._\n\n' +
    '🌟 *We look forward to welcoming you!*\n' +
    '_— Silver Key Hotel Team_';

  return sendWhatsAppMessage('91' + booking.guest.phone, message);
};

// ─── sendWhatsAppCancellation ─────────────────────────────────────
export const sendWhatsAppCancellation = function(booking) {
  var message =
    '❌ *Silver Key Hotel — Booking Cancelled*\n\n' +
    '📋 *Booking ID:* ' + booking.bookingId + '\n' +
    '👤 *Guest:* ' + booking.guest.firstName + ' ' + booking.guest.lastName + '\n\n' +
    'Your booking has been cancelled. If you did not request this or need assistance, please contact us:\n\n' +
    '📞 *Phone:* +91 93228 00100\n' +
    '💬 *WhatsApp:* +91 93228 00100\n\n' +
    '_We hope to welcome you again soon._\n' +
    '_— Silver Key Hotel Team_';

  return sendWhatsAppMessage('91' + booking.guest.phone, message);
};

export default { sendWhatsAppMessage, sendWhatsAppConfirmation, sendWhatsAppCancellation };
