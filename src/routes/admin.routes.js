import express from 'express';
import { getDashboardStats, getRevenueChart, getOccupancyReport } from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin', 'superadmin'));

router.get('/dashboard', getDashboardStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/occupancy', getOccupancyReport);

export default router;
