import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  idType: { type: String, enum: ['aadhaar', 'passport', 'dl', 'voterId'] },
  idNumber: { type: String },
  address: {
    line1: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  specialRequests: { type: String, maxlength: 500 },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  paidAt: { type: Date },
  refundId: { type: String },
  refundAmount: { type: Number },
  refundedAt: { type: Date },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  guest: { type: guestSchema, required: true },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required'],
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required'],
  },
  nights: { type: Number, required: true },
  adults: { type: Number, required: true, min: 1 },
  children: { type: Number, default: 0 },
  pricing: {
    roomRate: { type: Number, required: true },
    totalRoomCharge: { type: Number, required: true },
    taxes: { type: Number, default: 0 },
    extraBedCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
  },
  payment: { type: paymentSchema, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending',
  },
  // FIX: track when a pending booking was created so we can expire stale ones
  pendingExpiresAt: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from creation
    },
  },
  source: {
    type: String,
    enum: ['website', 'whatsapp', 'phone', 'walkin', 'ota'],
    default: 'website',
  },
  addons: [{
    name: String,
    price: Number,
    quantity: Number,
  }],
  notes: { type: String },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  emailSent: { type: Boolean, default: false },
  whatsappSent: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: full guest name
bookingSchema.virtual('guestName').get(function () {
  return `${this.guest.firstName} ${this.guest.lastName}`;
});

// Auto-generate bookingId: SKH-YYYYMM-XXXX
bookingSchema.pre('validate', function (next) {
  if (!this.bookingId) {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingId = `SKH-${ym}-${rand}`;
  }
  next();
});

// Validate checkOut > checkIn
bookingSchema.pre('save', function (next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  this.nights = Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
  // Clear pendingExpiresAt once booking is confirmed/cancelled - no longer needed
  if (this.status !== 'pending') {
    this.pendingExpiresAt = undefined;
  }
  next();
});

bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ 'guest.email': 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });
// TTL index: MongoDB auto-deletes expired pending booking documents
// Only applies when pendingExpiresAt is set (i.e. status=pending)
// Confirmed bookings clear this field so they're never deleted
bookingSchema.index({ pendingExpiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
