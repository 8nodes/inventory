const { emitToUser, emitToCompany, emitToShop, emitToRoom } = require('../socket');
const { createLogger } = require('../../../../shared/utils/logger');

const logger = createLogger('order-handler');

async function handleOrderEvent(io, event) {
  try {
    const { orderId, customerId, companyId, shopId, status, orderNumber } = event;

    logger.info(`Handling order event for order: ${orderNumber}`);

    if (customerId) {
      emitToUser(io, customerId, 'order:status_updated', {
        orderId,
        orderNumber,
        status,
        message: `Your order #${orderNumber} is now ${status}`,
        timestamp: new Date().toISOString()
      });
    }

    if (companyId) {
      emitToCompany(io, companyId, 'order:new_order', {
        orderId,
        orderNumber,
        status,
        customerId,
        timestamp: new Date().toISOString()
      });
    }

    if (shopId) {
      emitToShop(io, shopId, 'order:shop_order', {
        orderId,
        orderNumber,
        status,
        customerId,
        timestamp: new Date().toISOString()
      });
    }

    emitToRoom(io, `order:${orderId}`, 'order:update', {
      orderId,
      orderNumber,
      status,
      timestamp: new Date().toISOString()
    });

    logger.info(`Order event processed successfully: ${orderNumber}`);
  } catch (error) {
    logger.error('Error handling order event:', error);
  }
}

async function handlePaymentEvent(io, event) {
  try {
    const { orderId, customerId, amount, status, paymentId } = event;

    logger.info(`Handling payment event for order: ${orderId}`);

    if (customerId) {
      emitToUser(io, customerId, 'payment:status_updated', {
        orderId,
        paymentId,
        status,
        amount,
        message: status === 'success' ? 'Payment successful!' : 'Payment failed',
        timestamp: new Date().toISOString()
      });
    }

    emitToRoom(io, `order:${orderId}`, 'payment:update', {
      orderId,
      paymentId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    logger.info(`Payment event processed successfully: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling payment event:', error);
  }
}

module.exports = {
  handleOrderEvent,
  handlePaymentEvent
};
