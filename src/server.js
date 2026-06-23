import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

import authRoutes     from './routes/auth.routes.js';
import roomRoutes     from './routes/room.routes.js';
import bookingRoutes  from './routes/booking.routes.js';
import paymentRoutes  from './routes/payment.routes.js';
import reviewRoutes   from './routes/review.routes.js';
import galleryRoutes  from './routes/gallery.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import chatbotRoutes  from './routes/chatbot.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import contactRoutes  from './routes/contact.routes.js';

const app = express();

// ── Trust proxy (required for Render/Railway rate-limiting) ───────
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(mongoSanitize());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── CORS — accepts CLIENT_URL env var, falls back to any origin ──
const allowedOrigins = () => {
  const origins = [];
  if (process.env.CLIENT_URL)   origins.push(process.env.CLIENT_URL);
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  return origins;
};

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true); // curl / mobile / Postman
    const list = allowedOrigins();
    if (list.length === 0 || list.includes(origin)) return cb(null, true);
    cb(new Error('CORS: ' + origin + ' not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsers ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health check (Render uses this) ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Silver Key Hotel API running', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/rooms',     roomRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/gallery',   galleryRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/chatbot',   chatbotRoutes);
app.use('/api/whatsapp',  whatsappRoutes);
app.use('/api/contact',   contactRoutes);

app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info(`Silver Key API on port ${PORT} [${process.env.NODE_ENV}]`);
  });
  const shutdown = (sig) => {
    logger.info(sig + ' — shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}).catch(err => {
  logger.error('DB connect failed: ' + err.message);
  process.exit(1);
});

export default app;
