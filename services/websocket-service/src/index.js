require('dotenv').config({ path: '../../../.env' });
const http = require('http');
const app = require('./app');
const { setupSocketIO } = require('./socket');
const { connectRabbitMQ, closeRabbitMQ, consumeEvents, QUEUES, ROUTING_KEYS } = require('../../../shared/config/rabbitmq');
const { createLogger } = require('../../../shared/utils/logger');
const { handleOrderEvent, handlePaymentEvent } = require('./handlers/orderHandler');
const { handleInventoryEvent, handleLowStockAlert, handleStockTransfer } = require('./handlers/inventoryHandler');
const { handleNotificationEvent, handleSystemAnnouncement } = require('./handlers/notificationHandler');

const PORT = process.env.WEBSOCKET_SERVICE_PORT || 8011;
const logger = createLogger('websocket-service');

let io = null;

const startServer = async () => {
  try {
    const server = http.createServer(app);

    io = setupSocketIO(server);
    logger.info('Socket.IO initialized successfully');

    await connectRabbitMQ('websocket-service');

    await setupEventConsumers();

    server.listen(PORT, () => {
      logger.info(`WebSocket Service running on port ${PORT}`);
    });

    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');

      if (io) {
        io.close();
      }

      server.close(async () => {
        await closeRabbitMQ();
        logger.info('WebSocket Service shut down complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start websocket service:', error);
    process.exit(1);
  }
};

async function setupEventConsumers() {
  await consumeEvents(
    'websocket.events',
    [
      ROUTING_KEYS.ORDER_CREATED,
      ROUTING_KEYS.ORDER_CONFIRMED,
      ROUTING_KEYS.ORDER_SHIPPED,
      ROUTING_KEYS.ORDER_DELIVERED,
      ROUTING_KEYS.ORDER_CANCELLED,
      ROUTING_KEYS.PAYMENT_SUCCESS,
      ROUTING_KEYS.PAYMENT_FAILED,
      ROUTING_KEYS.INVENTORY_UPDATED,
      ROUTING_KEYS.INVENTORY_LOW_STOCK,
      ROUTING_KEYS.INVENTORY_OUT_OF_STOCK,
      ROUTING_KEYS.PRODUCT_CREATED,
      ROUTING_KEYS.PRODUCT_UPDATED,
      ROUTING_KEYS.NOTIFICATION_SEND,
      'user.*',
      'company.*',
      'shop.*'
    ],
    async (event) => {
      try {
        const eventType = determineEventType(event);

        switch (eventType) {
          case 'order':
            await handleOrderEvent(io, event);
            break;

          case 'payment':
            await handlePaymentEvent(io, event);
            break;

          case 'inventory':
            await handleInventoryEvent(io, event);
            break;

          case 'low_stock':
            await handleLowStockAlert(io, event);
            break;

          case 'stock_transfer':
            await handleStockTransfer(io, event);
            break;

          case 'notification':
            await handleNotificationEvent(io, event);
            break;

          case 'announcement':
            await handleSystemAnnouncement(io, event);
            break;

          default:
            logger.info(`Received event of type: ${eventType}`);
        }
      } catch (error) {
        logger.error('Error processing event:', error);
      }
    }
  );

  logger.info('Event consumers set up successfully');
}

function determineEventType(event) {
  if (event.orderId || event.orderNumber) {
    return 'order';
  }

  if (event.paymentId) {
    return 'payment';
  }

  if (event.productId && event.quantity !== undefined) {
    if (event.threshold !== undefined) {
      return 'low_stock';
    }
    return 'inventory';
  }

  if (event.transferId) {
    return 'stock_transfer';
  }

  if (event.type === 'system_announcement') {
    return 'announcement';
  }

  if (event.subject || event.content) {
    return 'notification';
  }

  return 'unknown';
}

startServer();
