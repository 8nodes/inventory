const amqp = require('amqplib');
const logger = require('../utils/logger');
const { processAnalyticsEvent } = require('../services/analyticsService');

let connection;
let channel;

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    await channel.assertExchange('analytics_events', 'topic', { durable: true });

    const q = await channel.assertQueue('analytics_queue', { durable: true });

    await channel.bindQueue(q.queue, 'analytics_events', '#');
    await channel.bindQueue(q.queue, 'order_events', '#');
    await channel.bindQueue(q.queue, 'inventory_events', '#');
    await channel.bindQueue(q.queue, 'shop_events', '#');

    channel.consume(q.queue, async (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          await processAnalyticsEvent(routingKey, event);
          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing analytics event: ${error.message}`);
          channel.nack(msg, false, false);
        }
      }
    });

    logger.info('RabbitMQ Connected and consuming analytics events');

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

module.exports = { connectRabbitMQ };
