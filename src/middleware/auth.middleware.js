import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { AppError } from '../utils/AppError.js';

export const protect = async function(req, res, next) {
  try {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401));
    }
    var token = authHeader.split(' ')[1];
    var decoded = jwt.verify(token, process.env.JWT_SECRET);
    var user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) return next(new AppError('User not found', 401));
    if (!user.isActive) return next(new AppError('Account suspended', 403));
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401));
    return next(new AppError('Invalid token', 401));
  }
};

export const optionalAuth = async function(req, res, next) {
  var authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      var token = authHeader.split(' ')[1];
      var decoded = jwt.verify(token, process.env.JWT_SECRET);
      var user = await User.findById(decoded.id).select('-password');
      req.user = user || null;
    } catch (err) {
      req.user = null;
    }
  }
  next();
};

export const authorize = function() {
  var roles = Array.prototype.slice.call(arguments);
  return function(req, res, next) {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Access denied', 403));
    next();
  };
};
