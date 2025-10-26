const amqp = require('amqp-connection-manager');
const logger = require('../utils/logger');

let connection;
let channelWrapper;

const connectRabbitMQ = async () => {
  try {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

    connection = amqp.connect([RABBITMQ_URL], {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 1,
    });

    connection.on('connect', () => {
      logger.info('RabbitMQ connected successfully');
    });

    connection.on('disconnect', (err) => {
      logger.error('RabbitMQ disconnected:', err.message);
    });

    channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel) => {
        await channel.assertExchange('ecommerce_exchange', 'topic', { durable: true });

        await channel.assertQueue('ecommerce.events', { durable: true });
        await channel.assertQueue('product.views', { durable: true });
        await channel.assertQueue('cart.events', { durable: true });

        await channel.bindQueue('ecommerce.events', 'ecommerce_exchange', 'ecommerce.*');
        await channel.bindQueue('product.views', 'ecommerce_exchange', 'product.viewed');
        await channel.bindQueue('cart.events', 'ecommerce_exchange', 'cart.*');

        logger.info('RabbitMQ channels and queues configured');
      }
    });

    return channelWrapper;
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    throw error;
  }
};

const publishEvent = async (routingKey, data) => {
  try {
    if (!channelWrapper) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await channelWrapper.publish('ecommerce_exchange', routingKey, data, {
      persistent: true,
      contentType: 'application/json',
    });

    logger.info(`Event published: ${routingKey}`);
  } catch (error) {
    logger.error(`Failed to publish event ${routingKey}:`, error);
    throw error;
  }
};

const consumeEvents = async (queue, onMessage) => {
  try {
    if (!channelWrapper) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await channelWrapper.addSetup((channel) => {
      return channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await onMessage(content);
            channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message from ${queue}:`, error);
            channel.nack(msg, false, false);
          }
        }
      });
    });

    logger.info(`Started consuming from queue: ${queue}`);
  } catch (error) {
    logger.error(`Failed to consume from ${queue}:`, error);
    throw error;
  }
};

const closeRabbitMQ = async () => {
  try {
    if (channelWrapper) {
      await channelWrapper.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishEvent,
  consumeEvents,
  closeRabbitMQ,
  getChannelWrapper: () => channelWrapper
};
