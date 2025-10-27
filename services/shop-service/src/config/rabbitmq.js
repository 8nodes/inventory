const amqp = require('amqplib');
const logger = require('../utils/logger');

let connection;
let channel;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    await channel.assertExchange('shop_events', 'topic', { durable: true });

    logger.info('RabbitMQ Connected');

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    return channel;
  } catch (error) {
    logger.error('RabbitMQ Connection Error:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishEvent = async (routingKey, message) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    channel.publish('shop_events', routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    logger.info(`Event published: ${routingKey}`);
  } catch (error) {
    logger.error(`Error publishing event: ${error.message}`);
  }
};

module.exports = { connectRabbitMQ, publishEvent };
