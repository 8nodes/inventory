const amqp = require('amqp-connection-manager');
const logger = require('../utils/logger');

let channelWrapper;

const connectRabbitMQ = async () => {
  try {
    const connection = amqp.connect([process.env.RABBITMQ_URL || 'amqp://localhost']);

    connection.on('connect', () => {
      logger.info('RabbitMQ Connected');
    });

    connection.on('disconnect', (err) => {
      logger.error('RabbitMQ Disconnected:', err);
    });

    channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel) => {
        await channel.assertExchange('debt_events', 'topic', { durable: true });
        await channel.assertQueue('debt_queue', { durable: true });
        await channel.bindQueue('debt_queue', 'debt_events', 'debt.*');
      },
    });

    return channelWrapper;
  } catch (error) {
    logger.error('RabbitMQ Connection Error:', error);
    throw error;
  }
};

const publishEvent = async (routingKey, message) => {
  try {
    if (channelWrapper) {
      await channelWrapper.publish('debt_events', routingKey, message, {
        persistent: true,
      });
      logger.info(`Event published: ${routingKey}`);
    }
  } catch (error) {
    logger.error('Error publishing event:', error);
  }
};

module.exports = { connectRabbitMQ, publishEvent, getChannelWrapper: () => channelWrapper };
