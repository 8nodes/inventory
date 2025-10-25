const connectDB = require('./config/db');
const { logger } = require('./utils/logger');
const { scheduleDailyReport } = require('./services/reportService');
const { connectRabbitMQ, closeRabbitMQ } = require('./config/rabbitmq');
const { startAllConsumers } = require('./events/eventConsumer');
const PORT = process.env.PORT || 8007;
const app = require('./app');

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    await connectRabbitMQ();
    logger.info('RabbitMQ connected successfully');

    await startAllConsumers();
    logger.info('Event consumers started successfully');

    app.listen(PORT, () => {
      logger.info(`Inventory Service running on http://localhost:${PORT}`);
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