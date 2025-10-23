const { getChannel } = require('../config/rabbitmq');
const { logger } = require('../utils/logger');
const Product = require('../models/Product');
const StockChange = require('../models/StockChange');
const Alert = require('../models/Alert');
const mongoose = require('mongoose');

const consumeOrderEvents = async () => {
  try {
    const channel = getChannel();
    if (!channel) throw new Error('RabbitMQ channel not initialized');

    await channel.assertQueue('order.events', { durable: true });
    await channel.prefetch(1);

    logger.info('Started consuming order events');

    channel.consume('order.events', async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing order event: ${event.eventType}`);

        switch (event.eventType) {
          case 'order.created':
          case 'order.placed':
            await handleOrderPlaced(event.data);
            break;

          case 'order.cancelled':
            await handleOrderCancelled(event.data);
            break;

          case 'order.returned':
            await handleOrderReturned(event.data);
            break;

          case 'order.reserved':
            await handleStockReservation(event.data);
            break;

          case 'order.reservation.released':
            await handleReservationRelease(event.data);
            break;

          default:
            logger.warn(`Unknown order event type: ${event.eventType}`);
        }

        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing order event:', error);
        channel.nack(msg, false, true);
      }
    });
  } catch (error) {
    logger.error('Error setting up order event consumer:', error);
    setTimeout(consumeOrderEvents, 5000);
  }
};

const handleOrderPlaced = async (orderData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, items, companyId, warehouseId } = orderData;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        logger.error(`Product not found: ${item.productId}`);
        continue;
      }

      const quantityToDeduct = item.quantity;
      const oldQuantity = product.inventory.quantity;
      const newQuantity = Math.max(0, oldQuantity - quantityToDeduct);

      if (newQuantity < 0) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      product.inventory.quantity = newQuantity;

      if (warehouseId) {
        const warehouseEntry = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === warehouseId
        );
        if (warehouseEntry) {
          warehouseEntry.quantity = Math.max(0, warehouseEntry.quantity - quantityToDeduct);
        }
      }

      product.availability = newQuantity > 0 ? 'in_stock' : 'out_of_stock';
      product.auditTrail.push({
        action: 'stock_change',
        changedBy: 'order-service',
        oldValue: { quantity: oldQuantity },
        newValue: { quantity: newQuantity, reason: 'Order placed' }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: companyId || product.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: warehouseId || null,
        changeType: 'sale',
        quantity: -quantityToDeduct,
        previousStock: oldQuantity,
        newStock: newQuantity,
        reason: `Order ${orderId} placed`,
        orderId,
        userId: 'order-service'
      });
      await stockChange.save({ session });

      if (newQuantity <= product.inventory.lowStockThreshold) {
        const alert = new Alert({
          companyId: companyId || product.companyId,
          type: 'low_stock',
          productId: item.productId,
          threshold: product.inventory.lowStockThreshold,
          message: `Stock for product ${product.name} is low: ${newQuantity} units remaining`
        });
        await alert.save({ session });
      }
    }

    await session.commitTransaction();
    logger.info(`Successfully processed order: ${orderId}`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error handling order placed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const handleOrderCancelled = async (orderData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, items, companyId, warehouseId } = orderData;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        logger.error(`Product not found: ${item.productId}`);
        continue;
      }

      const quantityToRestore = item.quantity;
      const oldQuantity = product.inventory.quantity;
      const newQuantity = oldQuantity + quantityToRestore;

      product.inventory.quantity = newQuantity;

      if (warehouseId) {
        const warehouseEntry = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === warehouseId
        );
        if (warehouseEntry) {
          warehouseEntry.quantity += quantityToRestore;
        }
      }

      product.availability = newQuantity > 0 ? 'in_stock' : 'out_of_stock';
      product.auditTrail.push({
        action: 'stock_change',
        changedBy: 'order-service',
        oldValue: { quantity: oldQuantity },
        newValue: { quantity: newQuantity, reason: 'Order cancelled' }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: companyId || product.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: warehouseId || null,
        changeType: 'return',
        quantity: quantityToRestore,
        previousStock: oldQuantity,
        newStock: newQuantity,
        reason: `Order ${orderId} cancelled`,
        orderId,
        userId: 'order-service'
      });
      await stockChange.save({ session });
    }

    await session.commitTransaction();
    logger.info(`Successfully processed order cancellation: ${orderId}`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error handling order cancelled:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const handleOrderReturned = async (returnData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, items, companyId, warehouseId, returnReason } = returnData;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        logger.error(`Product not found: ${item.productId}`);
        continue;
      }

      const quantityToRestore = item.quantity;
      const oldQuantity = product.inventory.quantity;
      const newQuantity = oldQuantity + quantityToRestore;

      product.inventory.quantity = newQuantity;

      if (warehouseId) {
        const warehouseEntry = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === warehouseId
        );
        if (warehouseEntry) {
          warehouseEntry.quantity += quantityToRestore;
        }
      }

      product.availability = 'in_stock';
      product.auditTrail.push({
        action: 'stock_change',
        changedBy: 'order-service',
        oldValue: { quantity: oldQuantity },
        newValue: { quantity: newQuantity, reason: 'Order returned' }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: companyId || product.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: warehouseId || null,
        changeType: 'return',
        quantity: quantityToRestore,
        previousStock: oldQuantity,
        newStock: newQuantity,
        reason: `Order ${orderId} returned: ${returnReason || 'No reason provided'}`,
        orderId,
        userId: 'order-service'
      });
      await stockChange.save({ session });
    }

    await session.commitTransaction();
    logger.info(`Successfully processed order return: ${orderId}`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error handling order return:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const handleStockReservation = async (reservationData) => {
  logger.info('Stock reservation handling - to be implemented with reservation model');
};

const handleReservationRelease = async (releaseData) => {
  logger.info('Reservation release handling - to be implemented with reservation model');
};

const consumePurchaseEvents = async () => {
  try {
    const channel = getChannel();
    if (!channel) throw new Error('RabbitMQ channel not initialized');

    await channel.assertQueue('purchase.events', { durable: true });
    await channel.prefetch(1);

    logger.info('Started consuming purchase events');

    channel.consume('purchase.events', async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing purchase event: ${event.eventType}`);

        switch (event.eventType) {
          case 'purchase.completed':
          case 'purchase.received':
            await handlePurchaseReceived(event.data);
            break;

          default:
            logger.warn(`Unknown purchase event type: ${event.eventType}`);
        }

        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing purchase event:', error);
        channel.nack(msg, false, true);
      }
    });
  } catch (error) {
    logger.error('Error setting up purchase event consumer:', error);
    setTimeout(consumePurchaseEvents, 5000);
  }
};

const handlePurchaseReceived = async (purchaseData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { purchaseId, items, companyId, warehouseId, supplierId } = purchaseData;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        logger.error(`Product not found: ${item.productId}`);
        continue;
      }

      const quantityToAdd = item.quantity;
      const oldQuantity = product.inventory.quantity;
      const newQuantity = oldQuantity + quantityToAdd;

      product.inventory.quantity = newQuantity;

      if (warehouseId) {
        const warehouseEntry = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === warehouseId
        );
        if (warehouseEntry) {
          warehouseEntry.quantity += quantityToAdd;
        } else {
          product.inventory.perWarehouse.push({
            warehouseId,
            quantity: quantityToAdd,
            lowStockThreshold: product.inventory.lowStockThreshold
          });
        }
      }

      product.availability = 'in_stock';
      product.auditTrail.push({
        action: 'stock_change',
        changedBy: 'purchase-service',
        oldValue: { quantity: oldQuantity },
        newValue: { quantity: newQuantity, reason: 'Purchase received' }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: companyId || product.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: warehouseId || null,
        changeType: 'restock',
        quantity: quantityToAdd,
        previousStock: oldQuantity,
        newStock: newQuantity,
        reason: `Purchase ${purchaseId} received from supplier`,
        supplierId,
        userId: 'purchase-service'
      });
      await stockChange.save({ session });
    }

    await session.commitTransaction();
    logger.info(`Successfully processed purchase: ${purchaseId}`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error handling purchase received:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

const startAllConsumers = async () => {
  await consumeOrderEvents();
  await consumePurchaseEvents();
  logger.info('All event consumers started');
};

module.exports = {
  consumeOrderEvents,
  consumePurchaseEvents,
  startAllConsumers
};
