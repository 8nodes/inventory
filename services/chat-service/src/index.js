require('dotenv').config();
const connectDB = require('./config/db');
const { logger } = require('./utils/logger');
const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
const { startScheduler } = require('./services/messageScheduler');
const app = require('./app');

const PORT = process.env.CHAT_SERVICE_PORT || 8008;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    await connectRabbitMQ();
    logger.info('RabbitMQ connected successfully');

    startScheduler();
    logger.info('Message scheduler started');

    app.listen(PORT, () => {
      logger.info(`Chat Service running on http://localhost:${PORT}`);
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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
