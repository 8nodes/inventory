require('dotenv').config({ path: '../../../.env' });
const mongoose = require('mongoose');
const schedule = require('node-schedule');
const app = require('./app');
const { connectRabbitMQ, closeRabbitMQ, consumeEvents, QUEUES, ROUTING_KEYS } = require('../../../shared/config/rabbitmq');
const { createLogger } = require('../../../shared/utils/logger');
const Notification = require('./models/Notification');
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');
const { processNotification } = require('./controllers/notificationController');

const PORT = process.env.NOTIFICATION_SERVICE_PORT || 8008;
const logger = createLogger('notification-service');

const startServer = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/notificationdb';
    await mongoose.connect(mongoUrl);
    logger.info('Connected to MongoDB (notificationdb)');

    await connectRabbitMQ('notification-service');

    await setupEventConsumers();

    setupScheduledJobs();

    const server = app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
    });

    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(async () => {
        await mongoose.connection.close();
        await closeRabbitMQ();
        logger.info('Notification Service shut down complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start notification service:', error);
    process.exit(1);
  }
};

async function setupEventConsumers() {
  await consumeEvents(
    QUEUES.NOTIFICATION,
    [
      ROUTING_KEYS.EMAIL_VERIFICATION_REQUESTED,
      ROUTING_KEYS.PHONE_VERIFICATION_REQUESTED,
      ROUTING_KEYS.PASSWORD_RESET_REQUESTED,
      ROUTING_KEYS.ORDER_CREATED,
      ROUTING_KEYS.ORDER_CONFIRMED,
      ROUTING_KEYS.ORDER_SHIPPED,
      ROUTING_KEYS.ORDER_DELIVERED,
      ROUTING_KEYS.PAYMENT_SUCCESS,
      ROUTING_KEYS.PAYMENT_FAILED,
      ROUTING_KEYS.INVENTORY_LOW_STOCK,
      ROUTING_KEYS.INVENTORY_OUT_OF_STOCK
    ],
    handleNotificationEvent
  );

  logger.info('Event consumers set up successfully');
}

async function handleNotificationEvent(event) {
  try {
    logger.info(`Processing notification event: ${event.eventId}`);

    switch (event) {
      case event.hasOwnProperty('token') && event.hasOwnProperty('email'):
        if (event.token && event.email.includes('verify')) {
          await emailService.sendVerificationEmail({
            to: event.email,
            token: event.token,
            name: event.name
          });
        } else if (event.token) {
          await emailService.sendPasswordResetEmail({
            to: event.email,
            token: event.token,
            name: event.name
          });
        }
        break;

      case event.hasOwnProperty('phone') && event.hasOwnProperty('code'):
        await smsService.sendVerificationCode({
          to: event.phone,
          code: event.code
        });
        break;

      case event.hasOwnProperty('orderNumber'):
        if (event.email && event.items) {
          await emailService.sendOrderConfirmation({
            to: event.email,
            orderNumber: event.orderNumber,
            total: event.total,
            items: event.items,
            name: event.customerName
          });
        }

        if (event.phone && event.status) {
          await smsService.sendOrderNotification({
            to: event.phone,
            orderNumber: event.orderNumber,
            status: event.status
          });
        }
        break;

      case event.hasOwnProperty('productName') && event.hasOwnProperty('quantity'):
        await smsService.sendLowStockAlert({
          to: event.managerPhone,
          productName: event.productName,
          quantity: event.quantity
        });
        break;

      default:
        logger.warn('Unknown event type received');
    }

    logger.info(`Notification event processed: ${event.eventId}`);
  } catch (error) {
    logger.error('Error handling notification event:', error);
    throw error;
  }
}

function setupScheduledJobs() {
  schedule.scheduleJob('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const scheduledNotifications = await Notification.find({
        status: 'scheduled',
        scheduledFor: { $lte: now }
      }).limit(50);

      for (const notification of scheduledNotifications) {
        await processNotification(notification);
      }

      logger.info(`Processed ${scheduledNotifications.length} scheduled notifications`);
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
    }
  });

  schedule.scheduleJob('0 */6 * * *', async () => {
    try {
      const failedNotifications = await Notification.find({
        status: 'pending',
        attempts: { $lt: 3 },
        createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
      }).limit(100);

      for (const notification of failedNotifications) {
        await processNotification(notification);
      }

      logger.info(`Retried ${failedNotifications.length} failed notifications`);
    } catch (error) {
      logger.error('Error retrying failed notifications:', error);
    }
  });

  logger.info('Scheduled jobs set up successfully');
}

startServer();
