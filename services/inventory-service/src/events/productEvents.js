const { getChannel } = require('../config/rabbitmq');
const { logger } = require('../utils/logger');

const publishEvent = async (queueName, eventType, data, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const channel = getChannel();
      if (!channel) throw new Error('RabbitMQ channel not initialized');

      const message = JSON.stringify({
        eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'inventory-service'
      });

      const success = channel.sendToQueue(
        queueName,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          ...options.messageOptions
        }
      );

      if (success) {
        logger.info(`Published event: ${eventType} to ${queueName}`);
        return true;
      } else {
        throw new Error('Failed to send message to queue');
      }
    } catch (error) {
      logger.error(`Failed to publish event (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      } else {
        logger.error(`All retry attempts failed for event: ${eventType}`);
        return false;
      }
    }
  }
};

const publishProductEvent = async (eventType, data) => {
  return publishEvent('product.events', eventType, data);
};

const publishInventoryEvent = async (eventType, data) => {
  return publishEvent('inventory.events', eventType, data);
};

const publishStockEvent = async (eventType, data) => {
  return publishEvent('stock.events', eventType, data);
};

const publishAlertEvent = async (eventType, data) => {
  return publishEvent('alert.events', eventType, data);
};

const publishWarehouseEvent = async (eventType, data) => {
  return publishEvent('warehouse.events', eventType, data);
};

module.exports = {
  publishEvent,
  publishProductEvent,
  publishInventoryEvent,
  publishStockEvent,
  publishAlertEvent,
  publishWarehouseEvent
};