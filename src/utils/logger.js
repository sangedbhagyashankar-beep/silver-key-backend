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
  ],
});

export default logger;
