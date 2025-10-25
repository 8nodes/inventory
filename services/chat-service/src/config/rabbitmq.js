const amqp = require('amqp-connection-manager');
const { logger } = require('../utils/logger');

let connection;
let channelWrapper;

const connectRabbitMQ = async () => {
  try {
    const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    connection = amqp.connect([rabbitMQUrl], {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 5,
    });

    connection.on('connect', () => {
      logger.info('RabbitMQ connected successfully');
    });

    connection.on('disconnect', (err) => {
      logger.error('RabbitMQ disconnected:', err);
    });

    channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel) => {
        await channel.assertExchange('chat_events', 'topic', { durable: true });
        await channel.assertQueue('chat_notifications', { durable: true });
      },
    });

    return channelWrapper;
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    throw error;
  }
};

const publishEvent = async (routingKey, message) => {
  try {
    if (!channelWrapper) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await channelWrapper.publish('chat_events', routingKey, message);
    logger.info(`Event published: ${routingKey}`);
  } catch (error) {
    logger.error('Error publishing event:', error);
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
  closeRabbitMQ
};
