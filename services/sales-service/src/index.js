require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRabbitMQ, closeRabbitMQ, consumeEvents } = require('./config/rabbitmq');
const Order = require('./models/Order');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 8005;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');

    await connectRabbitMQ();
    logger.info('RabbitMQ connected successfully');

    await consumeEvents('payment.events', async (data) => {
      logger.info('Received payment event:', data);

      if (data.event === 'payment.success') {
        const order = await Order.findOne({ orderNumber: data.orderNumber });
        if (order) {
          order.paymentStatus = 'paid';
          order.paymentId = data.paymentId;
          order.status = 'confirmed';
          await order.save();

          logger.info(`Order ${order.orderNumber} payment confirmed`);
        }
      } else if (data.event === 'payment.failed') {
        const order = await Order.findOne({ orderNumber: data.orderNumber });
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();

          logger.info(`Order ${order.orderNumber} payment failed`);
        }
      }
    });

    const server = app.listen(PORT, () => {
      logger.info(`Sales service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await closeRabbitMQ();
        logger.info('RabbitMQ connection closed');

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
