const { emitToCompany, emitToShop, emitToRoom, broadcastToAll } = require('../socket');
const { createLogger } = require('../../../../shared/utils/logger');

const logger = createLogger('inventory-handler');

async function handleInventoryEvent(io, event) {
  try {
    const { productId, productName, quantity, warehouseId, companyId, shopId, eventType } = event;

    logger.info(`Handling inventory event: ${eventType} for product: ${productName}`);

    if (companyId) {
      emitToCompany(io, companyId, 'inventory:updated', {
        productId,
        productName,
        quantity,
        warehouseId,
        eventType,
        timestamp: new Date().toISOString()
      });
    }

    if (shopId) {
      emitToShop(io, shopId, 'inventory:shop_update', {
        productId,
        productName,
        quantity,
        warehouseId,
        eventType,
        timestamp: new Date().toISOString()
      });
    }

    emitToRoom(io, `product:${productId}`, 'inventory:stock_changed', {
      productId,
      quantity,
      eventType,
      timestamp: new Date().toISOString()
    });

    logger.info(`Inventory event processed successfully: ${productName}`);
  } catch (error) {
    logger.error('Error handling inventory event:', error);
  }
}

async function handleLowStockAlert(io, event) {
  try {
    const { productId, productName, quantity, threshold, companyId, shopId } = event;

    logger.warn(`Low stock alert for product: ${productName} (${quantity} remaining)`);

    const alertData = {
      productId,
      productName,
      quantity,
      threshold,
      severity: quantity === 0 ? 'critical' : 'warning',
      message: quantity === 0 ? `${productName} is out of stock!` : `${productName} is running low (${quantity} remaining)`,
      timestamp: new Date().toISOString()
    };

    if (companyId) {
      emitToCompany(io, companyId, 'inventory:low_stock_alert', alertData);
    }

    if (shopId) {
      emitToShop(io, shopId, 'inventory:low_stock_alert', alertData);
    }

    broadcastToAll(io, 'inventory:alert', {
      ...alertData,
      type: 'low_stock'
    });

    logger.info(`Low stock alert sent: ${productName}`);
  } catch (error) {
    logger.error('Error handling low stock alert:', error);
  }
}

async function handleStockTransfer(io, event) {
  try {
    const { transferId, productId, productName, quantity, fromWarehouse, toWarehouse, status, companyId } = event;

    logger.info(`Handling stock transfer: ${transferId} (${status})`);

    if (companyId) {
      emitToCompany(io, companyId, 'inventory:transfer_update', {
        transferId,
        productId,
        productName,
        quantity,
        fromWarehouse,
        toWarehouse,
        status,
        timestamp: new Date().toISOString()
      });
    }

    emitToRoom(io, `transfer:${transferId}`, 'transfer:status_update', {
      transferId,
      status,
      timestamp: new Date().toISOString()
    });

    logger.info(`Stock transfer event processed: ${transferId}`);
  } catch (error) {
    logger.error('Error handling stock transfer event:', error);
  }
}

module.exports = {
  handleInventoryEvent,
  handleLowStockAlert,
  handleStockTransfer
};
