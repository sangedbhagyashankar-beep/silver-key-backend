import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { seedDatabase } from './seed.js';

export const connectDB = async function() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error('MONGO_URI is not defined — set it in your environment variables');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected: ' + conn.connection.host);
    // Only seed when explicitly requested or in development
    if (process.env.NODE_ENV !== 'production' || process.env.SEED_DB === 'true') {
      await seedDatabase();
    }
  } catch (err) {
    logger.error('MongoDB connection failed: ' + err.message);
    process.exit(1);
  }
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected',  () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error: ' + err.message));
};
