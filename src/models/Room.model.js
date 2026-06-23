import mongoose from 'mongoose';

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String },
}, { _id: false });

const priceSchema = new mongoose.Schema({
  base: { type: Number, required: true },
  weekend: { type: Number },
  peak: { type: Number },
  currency: { type: String, default: 'INR' },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  type: {
    type: String,
    enum: ['single', 'double', 'suite', 'deluxe', 'family', 'presidential'],
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Room description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
  },
  price: { type: priceSchema, required: true },
  capacity: {
    adults: { type: Number, required: true, min: 1, max: 10 },
    children: { type: Number, default: 0 },
  },
  size: { type: Number, required: true }, // sq ft
  floor: { type: Number },
  bedType: {
    type: String,
    enum: ['single', 'double', 'queen', 'king', 'twin', 'sofa-bed'],
    required: true,
  },
  amenities: [amenitySchema],
  images: [{
    url: { type: String, required: true },
    publicId: { type: String }, // Cloudinary public ID
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
  }],
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  acType: {
    type: String,
    enum: ['ac', 'non-ac'],
    default: 'ac',
  },
  view: {
    type: String,
    enum: ['pool', 'garden', 'city', 'courtyard', 'none'],
    default: 'none',
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  policies: {
    checkIn: { type: String, default: '14:00' },
    checkOut: { type: String, default: '12:00' },
    cancellation: { type: String, default: 'Free cancellation up to 24 hours before check-in' },
    smoking: { type: Boolean, default: false },
    pets: { type: Boolean, default: false },
    extraBed: {
      allowed: { type: Boolean, default: false },
      charge: { type: Number, default: 0 },
    },
  },
  totalRooms: { type: Number, default: 1 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: primary image
roomSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : (this.images[0]?.url || null);
});

// Auto-generate slug
roomSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Index for search / filtering
roomSchema.index({ type: 1, isAvailable: 1 });
roomSchema.index({ 'price.base': 1 });
roomSchema.index({ isFeatured: 1 });
roomSchema.index({ slug: 1 });

const Room = mongoose.model('Room', roomSchema);
export default Room;
