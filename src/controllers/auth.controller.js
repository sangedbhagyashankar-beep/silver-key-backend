import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { sendEmail } from '../services/email.service.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const signAccessToken  = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const signRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

// Vercel (frontend) + Render (backend) = cross-origin → must use sameSite:'none' + secure:true
// For same-domain or local dev, lax/strict is fine
const cookieOpts = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000,
  path:     '/',
});

const sendTokens = async (user, statusCode, res) => {
  const accessToken  = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  res.cookie('refreshToken', refreshToken, cookieOpts());
  res.status(statusCode).json({ success: true, accessToken, user: user.toSafeJSON() });
};

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return next(new AppError('firstName, lastName, email and password are required', 400));
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return next(new AppError('Email already registered', 409));
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      firstName, lastName, phone, password,
      email: email.toLowerCase().trim(),
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
    });
    const verifyUrl = `${process.env.CLIENT_URL || process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    sendEmail({ to: user.email, subject: 'Welcome to Silver Key Hotel — Verify Your Email', template: 'emailVerification', data: { name: user.firstName, verifyUrl } }).catch(() => {});
    await sendTokens(user, 201, res);
  } catch (err) { next(err); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Email and password are required', 400));
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) return next(new AppError('Invalid email or password', 401));
    if (!user.isActive) return next(new AppError('Account suspended. Contact support.', 403));
    logger.info('Login: ' + user.email);
    await sendTokens(user, 200, res);
  } catch (err) { next(err); }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new AppError('No refresh token', 401));
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
    catch { return next(new AppError('Refresh token expired or invalid', 401)); }
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ _id: decoded.id, refreshToken: hashed, isActive: true });
    if (!user) return next(new AppError('Invalid refresh token', 401));
    res.json({ success: true, accessToken: signAccessToken(user._id) });
  } catch (err) { next(new AppError('Invalid refresh token', 401)); }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null }).catch(() => {});
      } catch {}
    }
  } catch {}
  res.clearCookie('refreshToken', { ...cookieOpts(), maxAge: 0 });
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
    if (!user) return next(new AppError('No account found with that email', 404));
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.CLIENT_URL || process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail({ to: user.email, subject: 'Silver Key Hotel — Password Reset', template: 'passwordReset', data: { name: user.firstName, resetUrl, expiry: '1 hour' } });
    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) { next(err); }
};

export const resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } });
    if (!user) return next(new AppError('Token invalid or expired', 400));
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    await sendTokens(user, 200, res);
  } catch (err) { next(err); }
};
