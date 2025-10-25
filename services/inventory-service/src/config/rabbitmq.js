const amqp = require('amqplib');
const { logger } = require('../utils/logger');

let connection = null;
let channel = null;

const QUEUES = [
  'product.events',
  'inventory.events',
  'stock.events',
  'alert.events',
  'warehouse.events',
  'order.events',
  'purchase.events',
  'sales.events',
  'transfer.events'
];

const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    for (const queueName of QUEUES) {
      await channel.assertQueue(queueName, { durable: true });
      logger.info(`Queue asserted: ${queueName}`);
    }

    connection.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

    logger.info('Connected to RabbitMQ successfully');
  } catch (error) {
    logger.error('RabbitMQ connection failed:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const closeRabbitMQ = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

const getChannel = () => channel;

const isConnected = () => channel !== null && connection !== null;

module.exports = {
  connectRabbitMQ,
  closeRabbitMQ,
  getChannel,
  isConnected
};