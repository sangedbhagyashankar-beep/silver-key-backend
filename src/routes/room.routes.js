import express from 'express';
import { getRooms, getRoom, getFeaturedRooms, createRoom, updateRoom, deleteRoom, getRoomStats } from '../controllers/room.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();

router.get('/', getRooms);
router.get('/featured', getFeaturedRooms);
router.get('/stats', protect, authorize('admin', 'superadmin'), getRoomStats);
router.get('/:id', getRoom);
router.post('/', protect, authorize('admin', 'superadmin'), upload.array('images', 10), createRoom);
router.put('/:id', protect, authorize('admin', 'superadmin'), updateRoom);
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteRoom);

export default router;
