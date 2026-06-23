import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const notFound = function(req, res, next) {
  next(new AppError('Route ' + req.originalUrl + ' not found', 404));
};

export const errorHandler = function(err, req, res, next) {
  var statusCode = err.statusCode || 500;
  var message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(function(e) { return e.message; }).join('. ');
  }
  if (err.code === 11000) {
    statusCode = 409;
    var field = Object.keys(err.keyValue)[0];
    message = field + ' already exists';
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ' + err.path + ': ' + err.value;
  }

  if (process.env.NODE_ENV !== 'production') logger.error(message);

  res.status(statusCode).json({ success: false, message: message });
};
