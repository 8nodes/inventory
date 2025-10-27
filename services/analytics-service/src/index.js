require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./utils/logger');

const PORT = process.env.ANALYTICS_SERVICE_PORT || 3010;

const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
