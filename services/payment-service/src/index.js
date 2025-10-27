require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3009;

const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
