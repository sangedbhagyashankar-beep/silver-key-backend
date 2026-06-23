import Room from '../models/Room.model.js';
import { AppError } from '../utils/AppError.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';
import mongoose from 'mongoose';

export const getRooms = async function(req, res, next) {
  try {
    var q = req.query;
    var filter = { isAvailable: true };
    if (q.type) filter.type = q.type;
    if (q.acType) filter.acType = q.acType;
    if (q.view) filter.view = q.view;
    if (q.isFeatured) filter.isFeatured = q.isFeatured === 'true';
    if (q.adults) filter['capacity.adults'] = { $gte: Number(q.adults) };
    if (q.minPrice || q.maxPrice) {
      filter['price.base'] = {};
      if (q.minPrice) filter['price.base'].$gte = Number(q.minPrice);
      if (q.maxPrice) filter['price.base'].$lte = Number(q.maxPrice);
    }
    var page = Number(q.page) || 1;
    var limit = Number(q.limit) || 12;
    var sort = q.sort || '-isFeatured';
    var total = await Room.countDocuments(filter);
    var rooms = await Room.find(filter).select('-__v').sort(sort).skip((page - 1) * limit).limit(limit);
    res.json({ success: true, total: total, page: page, pages: Math.ceil(total / limit), rooms: rooms });
  } catch (err) { next(err); }
};

export const getRoom = async function(req, res, next) {
  try {
    var id = req.params.id;
    var room = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      room = await Room.findById(id);
    }
    if (!room) {
      room = await Room.findOne({ slug: id });
    }
    if (!room) return next(new AppError('Room not found', 404));
    res.json({ success: true, room: room });
  } catch (err) { next(err); }
};

export const getFeaturedRooms = async function(req, res, next) {
  try {
    var rooms = await Room.find({ isFeatured: true, isAvailable: true })
      .select('name slug type price capacity images ratings acType bedType size shortDescription')
      .limit(6);
    res.json({ success: true, rooms: rooms });
  } catch (err) { next(err); }
};

export const createRoom = async function(req, res, next) {
  try {
    var roomData = Object.assign({}, req.body);
    if (req.files && req.files.length > 0) {
      var uploads = await Promise.all(req.files.map(function(file, i) {
        return uploadToCloudinary(file.buffer, 'silver-key/rooms').then(function(result) {
          return { url: result.secure_url, publicId: result.public_id, alt: roomData.name + ' image ' + (i+1), isPrimary: i === 0 };
        });
      }));
      roomData.images = uploads;
    }
    var room = await Room.create(roomData);
    res.status(201).json({ success: true, room: room });
  } catch (err) { next(err); }
};

export const updateRoom = async function(req, res, next) {
  try {
    var room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return next(new AppError('Room not found', 404));
    res.json({ success: true, room: room });
  } catch (err) { next(err); }
};

export const deleteRoom = async function(req, res, next) {
  try {
    var room = await Room.findById(req.params.id);
    if (!room) return next(new AppError('Room not found', 404));
    await Promise.all(room.images.filter(function(img) { return img.publicId; }).map(function(img) { return deleteFromCloudinary(img.publicId); }));
    await room.deleteOne();
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) { next(err); }
};

export const getRoomStats = async function(req, res, next) {
  try {
    var stats = await Room.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, avgPrice: { $avg: '$price.base' }, avgRating: { $avg: '$ratings.average' } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, stats: stats });
  } catch (err) { next(err); }
};
