const amqp = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGE = 'ecommerce_exchange';
const EXCHANGE_TYPE = 'topic';

const QUEUES = {
  PRODUCT: 'product.events',
  INVENTORY: 'inventory.events',
  ORDER: 'order.events',
  PAYMENT: 'payment.events',
  USER: 'user.events',
  COMPANY: 'company.events',
  SHOP: 'shop.events',
  NOTIFICATION: 'notification.events',
  AUDIT: 'audit.events',
  ANALYTICS: 'analytics.events',
  DEBT: 'debt.events',
  AUTH: 'auth.events'
};

const ROUTING_KEYS = {
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  INVENTORY_UPDATED: 'inventory.updated',
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  COMPANY_CREATED: 'company.created',
  COMPANY_UPDATED: 'company.updated',
  SHOP_CREATED: 'shop.created',
  SHOP_UPDATED: 'shop.updated',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  NOTIFICATION_SEND: 'notification.send',
  AUDIT_LOG: 'audit.log',
  ANALYTICS_TRACK: 'analytics.track',
  DEBT_CREATED: 'debt.created',
  DEBT_PAID: 'debt.paid'
};

const connectRabbitMQ = async (serviceName) => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

    Object.values(QUEUES).forEach(async (queueName) => {
      await channel.assertQueue(queueName, { durable: true });
    });

    connection.on('error', (error) => {
      console.error(`[${serviceName}] RabbitMQ connection error:`, error);
    });

    connection.on('close', () => {
      console.warn(`[${serviceName}] RabbitMQ connection closed, reconnecting...`);
      setTimeout(() => connectRabbitMQ(serviceName), 5000);
    });

    console.log(`[${serviceName}] Connected to RabbitMQ successfully`);
  } catch (error) {
    console.error(`[${serviceName}] RabbitMQ connection failed:`, error);
    setTimeout(() => connectRabbitMQ(serviceName), 5000);
  }
};

const closeRabbitMQ = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
};

const publishEvent = async (routingKey, data) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const message = {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`Event published: ${routingKey}`);
  } catch (error) {
    console.error('Error publishing event:', error);
    throw error;
  }
};

const consumeEvents = async (queueName, routingKeys, handler) => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    routingKeys.forEach(async (routingKey) => {
      await channel.bindQueue(queueName, EXCHANGE, routingKey);
    });

    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await handler(event);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, true);
        }
      }
    });

    console.log(`Consuming events from queue: ${queueName}`);
  } catch (error) {
    console.error('Error setting up consumer:', error);
    throw error;
  }
};

const getChannel = () => channel;

module.exports = {
  connectRabbitMQ,
  closeRabbitMQ,
  publishEvent,
  consumeEvents,
  getChannel,
  QUEUES,
  ROUTING_KEYS,
  EXCHANGE
};
