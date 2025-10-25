require('dotenv').config();
const connectDB = require('./config/db');
const { logger } = require('./utils/logger');
const app = require('./app');

const PORT = process.env.PORT || 8009;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Company Service running on http://localhost:${PORT}`);
      logger.info('Service is ready to handle requests');
    });
  } catch (error) {
    logger.error('Failed to start server: %s', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

startServer();
