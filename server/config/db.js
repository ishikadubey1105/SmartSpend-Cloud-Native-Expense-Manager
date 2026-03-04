const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);

  // Connection events
  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: 'majority',
  });
};

module.exports = connectDB;
