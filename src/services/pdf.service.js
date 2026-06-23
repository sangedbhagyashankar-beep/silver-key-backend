// PDF Ticket Generator — Server-side (PDFKit)
// Generates a professional A4 PDF for email attachments

import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

/**
 * Generate a booking confirmation ticket as a Buffer.
 * @param {Object} booking  — Mongoose Booking doc (populated with room)
 * @returns {Promise<Buffer>}
 */
export async function generateTicketBuffer(booking) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    const pass = new PassThrough();

    pass.on('data', (chunk) => chunks.push(chunk));
    pass.on('end',  () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);
    doc.pipe(pass);

    const W = doc.page.width;   // 595.28
    const H = doc.page.height;  // 841.89
    const GOLD   = '#d4af37';
    const DARK   = '#1a1a1a';
    const CREAM  = '#f5f0e8';
    const GRAY   = '#666666';
    const WHITE  = '#ffffff';
    const GREEN  = '#22c55e';

    // ── Background ────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill(CREAM);

    // ── Header ────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 110).fill(DARK);
    doc.rect(0, 110, W, 5).fill(GOLD);

    // Hotel name
    doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(32)
       .text('SILVER KEY', 0, 28, { align: 'center', width: W });

    doc.fillColor('#b8a060').font('Helvetica').fontSize(11)
       .text('H  O  T  E  L   &   R  E  S  O  R  T', 0, 66, { align: 'center', width: W });

    doc.fillColor('#999999').fontSize(9)
       .text('BOOKING CONFIRMATION TICKET', 0, 86, { align: 'center', width: W });

    // ── Booking ID badge ──────────────────────────────────────────────
    const badgeX = W / 2 - 110;
    doc.roundedRect(badgeX, 128, 220, 38, 6).fill(WHITE);
    doc.roundedRect(badgeX, 128, 220, 38, 6).stroke(GOLD);

    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18)
       .text(booking.bookingId || 'SKH-XXXXXX', 0, 141, { align: 'center', width: W });

    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
       .text('BOOKING REFERENCE', 0, 170, { align: 'center', width: W });

    // Status pill
    const status = (booking.status || 'confirmed').toUpperCase();
    doc.roundedRect(W / 2 - 45, 182, 90, 18, 4).fill(GREEN);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
       .text(`✓  ${status}`, 0, 187, { align: 'center', width: W });

    // Dashed divider
    doc.save().dash(4, { space: 4 })
       .moveTo(40, 212).lineTo(W - 40, 212)
       .stroke('#c8b994').restore();

    // ── Content ───────────────────────────────────────────────────────
    let y = 228;
    const LX = 45;   // left column x
    const VX = 210;  // value column x

    function sectionHeader(title, yPos) {
      doc.rect(LX, yPos, 5, 18).fill(GOLD);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5)
         .text(title, LX + 12, yPos + 4);
      return yPos + 26;
    }

    function row(label, value, yPos) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(9)
         .text(label, LX, yPos, { width: 150 });
      const val = String(value || '—');
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
         .text(val.length > 55 ? val.substring(0, 55) + '…' : val, VX, yPos, { width: W - VX - 45 });
      return yPos + 16;
    }

    // Guest Information
    y = sectionHeader('GUEST INFORMATION', y);
    const guestName = `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim();
    y = row('Guest Name', guestName, y);
    y = row('Email Address', booking.guest?.email, y);
    y = row('Phone Number', booking.guest?.phone, y);
    if (booking.guest?.idType && booking.guest?.idNumber) {
      y = row('ID Proof', `${booking.guest.idType.toUpperCase()} — ${booking.guest.idNumber}`, y);
    }
    y += 10;

    // Stay Details
    y = sectionHeader('STAY DETAILS', y);
    const roomName = booking.room?.name || booking.roomName || 'Deluxe Room';
    const roomType = booking.room?.type || '';
    y = row('Room', roomName + (roomType ? ` (${roomType})` : ''), y);

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
    y = row('Check-in Date', fmtDate(booking.checkIn), y);
    y = row('Check-in Time', '2:00 PM (14:00 hrs)', y);
    y = row('Check-out Date', fmtDate(booking.checkOut), y);
    y = row('Check-out Time', '12:00 PM (12:00 hrs)', y);
    y = row('Duration', `${booking.nights} Night${booking.nights !== 1 ? 's' : ''}`, y);
    y = row(
      'Guests',
      `${booking.adults} Adult${booking.adults !== 1 ? 's' : ''}${
        booking.children ? ` + ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : ''
      }`,
      y
    );
    if (booking.guest?.specialRequests) {
      y = row('Special Requests', booking.guest.specialRequests, y);
    }
    y += 10;

    // Payment Summary
    y = sectionHeader('PAYMENT SUMMARY', y);
    if (booking.pricing) {
      const p = booking.pricing;
      y = row('Room Rate (per night)', `Rs.${(p.roomRate || 0).toLocaleString('en-IN')}`, y);
      y = row(`Total Room Charge (${booking.nights} nights)`, `Rs.${(p.totalRoomCharge || 0).toLocaleString('en-IN')}`, y);
      if (p.discount > 0) {
        y = row('Discount Applied', `Rs.${p.discount.toLocaleString('en-IN')}`, y);
      }
      y = row('Taxes & GST', `Rs.${(p.taxes || 0).toLocaleString('en-IN')}`, y);

      // Grand total box
      y += 6;
      doc.rect(LX, y, W - LX * 2, 30).fill(DARK);
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(12)
         .text('TOTAL PAID', LX + 12, y + 9);
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(13)
         .text(`Rs.${(p.grandTotal || 0).toLocaleString('en-IN')}`, 0, y + 8, { align: 'right', width: W - LX - 10 });
      y += 42;
    }

    if (booking.payment?.razorpayPaymentId) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
         .text(`Transaction ID: ${booking.payment.razorpayPaymentId}`, LX, y);
      y += 14;
    }
    y += 8;

    // Important Notes
    if (y < H - 130) {
      y = sectionHeader('IMPORTANT NOTES', y);
      const notes = [
        'Carry this ticket and a valid government-issued photo ID at check-in.',
        'Early check-in and late check-out are subject to availability.',
        'This is a non-smoking property — designated areas available.',
        'For assistance, call +91 93228 00100 (24x7 Reception)',
      ];
      doc.fillColor(GRAY).font('Helvetica').fontSize(8.5);
      notes.forEach((note) => {
        doc.text(`•  ${note}`, LX, y, { width: W - LX * 2 });
        y += 14;
      });
    }

    // ── Footer ────────────────────────────────────────────────────────
    doc.rect(0, H - 52, W, 52).fill(DARK);
    doc.rect(0, H - 52, W, 3).fill(GOLD);

    doc.fillColor('#b8a060').font('Helvetica').fontSize(8)
       .text('#12, Palace Road, Mysuru – 570001, Karnataka, India', 0, H - 40, { align: 'center', width: W });
    doc.fillColor('#999').fontSize(8)
       .text('+91 93228 00100  |  reservations@silverkeyhotel.com  |  www.silverkeyhotel.com', 0, H - 28, { align: 'center', width: W });

    const genOn = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.fillColor('#555').fontSize(7)
       .text(`Generated on ${genOn} — Silver Key Hotel, All rights reserved`, 0, H - 16, { align: 'center', width: W });

    doc.end();
  });
}

export default { generateTicketBuffer };
