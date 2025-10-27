require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./utils/logger');

const PORT = process.env.SHOP_SERVICE_PORT || 3008;

const startServer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Shop Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
