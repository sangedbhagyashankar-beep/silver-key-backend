import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// ─── transporter ─────────────────────────────────────────────────
var transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── base HTML wrapper ────────────────────────────────────────────
function emailBase(bodyHtml) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif}.wrap{max-width:620px;margin:32px auto;background:#fff;border:1px solid #e2d9c4;border-radius:2px}.header{background:#1a1a1a;padding:36px 40px 28px;text-align:center}.header h1{margin:0;color:#d4af37;font-size:26px;letter-spacing:5px;text-transform:uppercase;font-weight:400}.header p{margin:6px 0 0;color:#999;font-size:10px;letter-spacing:3px;text-transform:uppercase}.gold-strip{height:4px;background:linear-gradient(90deg,#c8a020,#d4af37,#c8a020)}.body{padding:40px;color:#333;line-height:1.8}.body h2{color:#1a1a1a;font-size:22px;margin-top:0;font-weight:400;border-bottom:1px solid #e2d9c4;padding-bottom:14px;margin-bottom:24px}.highlight{color:#d4af37;font-weight:bold}.divider{border:none;border-top:1px solid #e2d9c4;margin:28px 0}table.detail{width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2d9c4}table.detail td{padding:11px 16px;font-size:13.5px}table.detail tr:nth-child(odd) td{background:#faf7f0}table.detail td:first-child{color:#777;width:38%;border-right:1px solid #e2d9c4}table.detail td:last-child{color:#1a1a1a;font-weight:bold}.total-row td{background:#1a1a1a!important;color:#d4af37!important;font-size:15px;font-weight:bold}.badge{display:inline-block;background:#22c55e;color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px}.info-box{background:#faf7f0;border:1px solid #e2d9c4;border-left:4px solid #d4af37;padding:16px 20px;margin:20px 0;font-size:13px;color:#555;border-radius:0 2px 2px 0}.info-box ul{margin:8px 0 0;padding-left:18px}.info-box ul li{margin-bottom:4px}.footer{background:#1a1a1a;padding:28px 40px;text-align:center}.footer p{margin:4px 0;font-size:11px;color:#999;letter-spacing:1px;line-height:1.9}.footer a{color:#d4af37;text-decoration:none}.btn{display:inline-block;background:#d4af37;color:#1a1a1a;padding:13px 36px;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;border-radius:2px}</style></head><body><div class="wrap"><div class="header"><h1>Silver Key</h1><p>Hotel &amp; Resort &nbsp;·&nbsp; Mysuru &nbsp;·&nbsp; Karnataka &nbsp;·&nbsp; India</p></div><div class="gold-strip"></div><div class="body">' + bodyHtml + '</div><div class="footer"><p><strong style="color:#d4af37">Silver Key Hotel</strong></p><p>+91 93228 00100 &nbsp;·&nbsp; <a href="mailto:reservations@silverkeyhotel.com">reservations@silverkeyhotel.com</a></p><p>#12, Palace Road, Mysuru – 570001, Karnataka, India</p><p style="margin-top:14px;color:#555;font-size:10px">This is an automated message. Please do not reply directly to this email.</p></div></div></body></html>';
}

// ─── renderTemplate (for auth flows) ─────────────────────────────
function renderTemplate(template, data) {
  if (template === 'emailVerification') {
    return emailBase(
      '<h2>Welcome to Silver Key Hotel!</h2>' +
      '<p>Dear <span class="highlight">' + (data.name || 'Guest') + '</span>,</p>' +
      '<p>Thank you for creating an account with us. Please verify your email address to complete your registration and unlock your member benefits.</p>' +
      '<p style="text-align:center;margin:28px 0"><a class="btn" href="' + (data.verifyUrl || '#') + '">Verify Email Address</a></p>' +
      '<p style="font-size:12px;color:#aaa;">If you did not create this account, you can safely ignore this email.</p>'
    );
  }
  if (template === 'passwordReset') {
    return emailBase(
      '<h2>Password Reset Request</h2>' +
      '<p>Dear <span class="highlight">' + (data.name || 'Guest') + '</span>,</p>' +
      '<p>We received a request to reset your Silver Key Hotel account password. Click the button below — this link expires in <strong>' + (data.expiry || '1 hour') + '</strong>.</p>' +
      '<p style="text-align:center;margin:28px 0"><a class="btn" href="' + (data.resetUrl || '#') + '">Reset My Password</a></p>' +
      '<p style="font-size:12px;color:#aaa;">If you did not request this, no action is needed. Your password remains unchanged.</p>'
    );
  }
  return emailBase('<p>' + JSON.stringify(data) + '</p>');
}

// ─── sendEmail ────────────────────────────────────────────────────
export const sendEmail = async function(opts) {
  var to         = opts.to;
  var subject    = opts.subject;
  var html       = opts.html || (opts.template ? renderTemplate(opts.template, opts.data || {}) : '');
  var attachments = opts.attachments || [];

  if (!process.env.SMTP_USER) {
    logger.info('[Email DEMO] to=' + to + ' | subject=' + subject);
    return { demo: true };
  }

  try {
    await transporter.sendMail({
      from:        process.env.EMAIL_FROM || ('"Silver Key Hotel" <' + process.env.SMTP_USER + '>'),
      to:          to,
      subject:     subject,
      html:        html,
      attachments: attachments,
    });
    logger.info('[Email] Sent to ' + to + ' | ' + subject);
  } catch (err) {
    logger.error('[Email] Failed to ' + to + ': ' + err.message);
    // Never throw — email failure must not break booking flow
  }
};

// ─── sendBookingConfirmationEmail ─────────────────────────────────
export const sendBookingConfirmationEmail = async function(booking, pdfBuffer) {
  var checkInStr  = new Date(booking.checkIn).toLocaleDateString('en-IN',  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var checkOutStr = new Date(booking.checkOut).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var total       = (booking.pricing.grandTotal || 0).toLocaleString('en-IN');
  var nights      = booking.nights;
  var roomName    = booking.room && booking.room.name ? booking.room.name : 'Your Room';
  var guestName   = booking.guest.firstName;

  var rows =
    '<tr><td>Booking Reference</td><td class="highlight">' + booking.bookingId + '</td></tr>' +
    '<tr><td>Room</td><td>' + roomName + '</td></tr>' +
    '<tr><td>Check-in</td><td>' + checkInStr + ' &nbsp;·&nbsp; From 2:00 PM</td></tr>' +
    '<tr><td>Check-out</td><td>' + checkOutStr + ' &nbsp;·&nbsp; Before 12:00 PM</td></tr>' +
    '<tr><td>Duration</td><td>' + nights + ' Night' + (nights !== 1 ? 's' : '') + '</td></tr>' +
    '<tr><td>Guests</td><td>' + booking.adults + ' Adult' + (booking.adults !== 1 ? 's' : '') +
      (booking.children ? ', ' + booking.children + ' Child' + (booking.children !== 1 ? 'ren' : '') : '') + '</td></tr>' +
    (booking.pricing.discount > 0 ? '<tr><td>Discount</td><td style="color:#16a34a">−Rs.' + booking.pricing.discount.toLocaleString('en-IN') + '</td></tr>' : '') +
    '<tr class="total-row"><td>Total Paid</td><td>Rs.' + total + '</td></tr>';

  var specialNote = booking.guest.specialRequests
    ? '<div class="info-box"><strong>Your special request has been noted:</strong><br>' + booking.guest.specialRequests + '</div>'
    : '';

  var pdfNote = pdfBuffer
    ? '<p style="font-size:13px;color:#555;"><strong>📎 Your booking ticket is attached</strong> to this email as a PDF. Please carry it at check-in.</p>'
    : '<p style="font-size:13px;color:#555;">You can download your PDF ticket from <a href="' + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/my-bookings" style="color:#d4af37">My Bookings</a>.</p>';

  var body =
    '<div class="badge">✓ Booking Confirmed</div>' +
    '<h2>Your reservation is confirmed!</h2>' +
    '<p>Dear <span class="highlight">' + guestName + '</span>,</p>' +
    '<p>Thank you for choosing <strong>Silver Key Hotel</strong>. We have received your booking and look forward to welcoming you to our property. Your stay details are below.</p>' +
    '<table class="detail">' + rows + '</table>' +
    specialNote +
    pdfNote +
    '<div class="info-box"><strong>Before You Arrive</strong><ul>' +
    '<li>Carry a valid government-issued photo ID at check-in</li>' +
    '<li>Complimentary breakfast is included with your stay</li>' +
    '<li>Valet parking available — Rs.200/day</li>' +
    '<li>Contact us 24 hrs before for early/late check-in arrangements</li>' +
    '</ul></div>' +
    '<hr class="divider"/>' +
    '<p style="font-size:13px;color:#555;">For assistance, call us at <strong>+91 93228 00100</strong> or reply to this email.<br>We are available 24x7 for your convenience.</p>' +
    '<p style="font-size:13px;">With warm regards,<br><strong>Silver Key Hotel &middot; Reservations Team</strong></p>';

  var attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: 'Silver-Key-Ticket-' + booking.bookingId + '.pdf',
      content:  pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to:          booking.guest.email,
    subject:     '✓ Booking Confirmed — ' + booking.bookingId + ' | Silver Key Hotel',
    html:        emailBase(body),
    attachments: attachments,
  });
};

// ─── sendAvailabilityEmail ────────────────────────────────────────
export const sendAvailabilityEmail = function(opts) {
  var checkInStr  = new Date(opts.checkIn).toLocaleDateString('en-IN',  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var checkOutStr = new Date(opts.checkOut).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var total       = (opts.grandTotal || 0).toLocaleString('en-IN');

  var rows =
    '<tr><td>Room</td><td>' + opts.roomName + '</td></tr>' +
    '<tr><td>Check-in</td><td>' + checkInStr + '</td></tr>' +
    '<tr><td>Check-out</td><td>' + checkOutStr + '</td></tr>' +
    '<tr><td>Duration</td><td>' + opts.nights + ' Night' + (opts.nights !== 1 ? 's' : '') + '</td></tr>' +
    '<tr class="total-row"><td>Estimated Total</td><td>Rs.' + total + '</td></tr>';

  var body =
    '<h2>Great news — your dates are available!</h2>' +
    '<p>Dear <span class="highlight">' + (opts.guestName || 'Guest') + '</span>,</p>' +
    '<p><strong>' + opts.roomName + '</strong> is available for your requested dates. Here is your pricing summary:</p>' +
    '<table class="detail">' + rows + '</table>' +
    '<p style="font-size:13px;color:#555;">Prices include applicable taxes and fees. To confirm your booking, click below. Please note availability cannot be guaranteed until payment is received.</p>' +
    '<p style="text-align:center;margin:28px 0"><a class="btn" href="' + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/booking">Complete Your Booking</a></p>' +
    '<p style="font-size:13px;">With warm regards,<br><strong>Silver Key Hotel &middot; Reservations Team</strong></p>';

  return sendEmail({
    to:      opts.to,
    subject: opts.roomName + ' is available for your dates | Silver Key Hotel',
    html:    emailBase(body),
  });
};

export default { sendEmail, sendBookingConfirmationEmail, sendAvailabilityEmail };
