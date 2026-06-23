// ── pricing.js ────────────────────────────────────────────────────
const GST_RATE = 0.12; // 12% GST on hotel rooms above ₹1000/night

export const calculatePricing = (room, nights, checkIn, checkOut) => {
  const baseRate = room.price.base;
  let totalRoomCharge = 0;

  // Calculate per night (weekend surcharge: Fri-Sat)
  const current = new Date(checkIn);
  let nightCount = 0;
  while (current < checkOut) {
    const day = current.getDay();
    const isWeekend = day === 5 || day === 6; // Fri, Sat
    const nightRate = isWeekend && room.price.weekend ? room.price.weekend : baseRate;
    totalRoomCharge += nightRate;
    nightCount++;
    current.setDate(current.getDate() + 1);
  }

  const taxes = totalRoomCharge > 1000 * nights ? totalRoomCharge * GST_RATE : 0;
  const grandTotal = Math.round(totalRoomCharge + taxes);

  return {
    roomRate: baseRate,
    totalRoomCharge: Math.round(totalRoomCharge),
    taxes: Math.round(taxes),
    discount: 0,
    grandTotal,
    breakdown: { nights: nightCount, taxRate: `${GST_RATE * 100}%` },
  };
};

// ── AppError.js ───────────────────────────────────────────────────
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── logger.js ─────────────────────────────────────────────────────
import winston from 'winston';
const { combine, timestamp, printf, colorize, errors } = winston.format;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ level, message, timestamp, stack }) =>
      `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), printf(({ level, message }) => `${level}: ${message}`)),
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});

export default logger;
