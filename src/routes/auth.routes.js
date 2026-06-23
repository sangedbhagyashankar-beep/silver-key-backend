import express from 'express';
import { register, login, logout, getMe, refreshToken, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.post('/register',              register);
router.post('/login',                 login);
router.post('/logout',                logout);
router.post('/refresh',               refreshToken);
router.post('/forgot-password',       forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.get('/me',                     protect, getMe);
export default router;
