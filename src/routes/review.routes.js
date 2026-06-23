import express from 'express';
import Review from '../models/Review.model.js';
import { AppError } from '../utils/AppError.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { roomId, page = 1, limit = 10 } = req.query;
    const filter = roomId ? { room: roomId } : {};
    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.status(200).json({ success: true, total, reviews });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

export default router;
