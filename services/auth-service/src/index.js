require('dotenv').config({ path: '../../../.env' });
const mongoose = require('mongoose');
const app = require('./app');
const { connectRabbitMQ, closeRabbitMQ } = require('../../../shared/config/rabbitmq');
const { createLogger } = require('../../../shared/utils/logger');

const PORT = process.env.AUTH_SERVICE_PORT || 8001;
const logger = createLogger('auth-service');

const startServer = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO || 'mongodb://localhost:27017/authdb', {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info('Database connected successfully');

    await connectRabbitMQ('auth-service');
    logger.info('RabbitMQ connected successfully');

    app.listen(PORT, () => {
      logger.info(`Auth Service running on http://localhost:${PORT}`);
      logger.info('Service is ready to handle requests');
    });

  } catch (error) {
    logger.error('Failed to start server: %s', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await closeRabbitMQ();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await closeRabbitMQ();
  await mongoose.disconnect();
  process.exit(0);
});

startServer();
