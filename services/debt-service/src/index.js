require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const reminderScheduler = require('./services/reminderScheduler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3010;

const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    reminderScheduler.init();

    app.listen(PORT, () => {
      logger.info(`Debt Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
