import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
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
  guestName: { type: String, required: true },
  guestLocation: { type: String },
  platform: {
    type: String,
    enum: ['website', 'google', 'tripadvisor', 'booking.com', 'makemytrip'],
    default: 'website',
  },
  ratings: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    location: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    amenities: { type: Number, min: 1, max: 5 },
  },
  title: { type: String, maxlength: 150 },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },
  images: [{ url: String, publicId: String }],
  response: {
    text: String,
    respondedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  isVerified: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
  stayDate: { type: Date },
}, {
  timestamps: true,
});

// One booking → one review
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ room: 1, isPublished: 1 });
reviewSchema.index({ 'ratings.overall': -1 });

// Update room average rating after save/remove
const updateRoomRating = async (roomId) => {
  const Room = mongoose.model('Room');
  const stats = await reviewSchema.base.model('Review').aggregate([
    { $match: { room: roomId, isPublished: true } },
    { $group: { _id: null, avgRating: { $avg: '$ratings.overall' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Room.findByIdAndUpdate(roomId, {
      'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
      'ratings.count': stats[0].count,
    });
  }
};

reviewSchema.post('save', function () {
  updateRoomRating(this.room);
});
reviewSchema.post('remove', function () {
  updateRoomRating(this.room);
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
