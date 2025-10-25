const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const StockChange = require('../models/StockChange');
const { validateMongoId } = require('../utils/validateMongoId');
const { publishInventoryEvent } = require('../events/productEvents');
const mongoose = require('mongoose');

const batchUpdateInventory = asyncHandler(async (req, res) => {
  const { updates, companyId } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Updates array is required and must not be empty'
    });
  }

  const results = {
    successful: [],
    failed: []
  };

  const session = await mongoose.startSession();

  for (const update of updates) {
    try {
      await session.startTransaction();

      const { productId, quantity, operation = 'set', warehouseId, reason } = update;
      validateMongoId(productId);

      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error('Product not found');
      }

      const oldQuantity = product.inventory.quantity;
      let newQuantity;

      switch (operation) {
        case 'increment':
          newQuantity = oldQuantity + quantity;
          break;
        case 'decrement':
          newQuantity = Math.max(0, oldQuantity - quantity);
          break;
        case 'set':
        default:
          newQuantity = Math.max(0, quantity);
      }

      product.inventory.quantity = newQuantity;
      product.availability = newQuantity > 0 ? 'in_stock' : 'out_of_stock';

      if (warehouseId) {
        validateMongoId(warehouseId);
        const warehouseEntry = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === warehouseId
        );
        if (warehouseEntry) {
          warehouseEntry.quantity = newQuantity;
        }
      }

      product.auditTrail.push({
        action: 'stock_change',
        changedBy: req.user?.id || 'batch-operation',
        oldValue: { quantity: oldQuantity },
        newValue: { quantity: newQuantity, operation }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: companyId || product.companyId,
        productId,
        warehouseId: warehouseId || null,
        changeType: operation === 'decrement' ? 'adjustment' : (operation === 'increment' ? 'restock' : 'adjustment'),
        quantity: operation === 'decrement' ? -Math.abs(quantity) : quantity,
        previousStock: oldQuantity,
        newStock: newQuantity,
        reason: reason || `Batch ${operation} update`,
        userId: req.user?.id || 'batch-operation'
      });
      await stockChange.save({ session });

      await session.commitTransaction();

      results.successful.push({
        productId,
        oldQuantity,
        newQuantity,
        operation
      });

      await publishInventoryEvent('inventory.batch.updated', {
        productId,
        companyId: product.companyId,
        oldQuantity,
        newQuantity,
        operation
      });

    } catch (error) {
      await session.abortTransaction();
      results.failed.push({
        productId: update.productId,
        error: error.message
      });
    }
  }

  session.endSession();

  res.status(results.failed.length === updates.length ? 400 : 200).json({
    success: results.successful.length > 0,
    message: `Processed ${updates.length} updates: ${results.successful.length} successful, ${results.failed.length} failed`,
    data: results
  });
});

const batchUpdatePrices = asyncHandler(async (req, res) => {
  const { updates, companyId } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Updates array is required and must not be empty'
    });
  }

  const results = {
    successful: [],
    failed: []
  };

  for (const update of updates) {
    try {
      const { productId, basePrice, salePrice, costPrice } = update;
      validateMongoId(productId);

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const oldPricing = { ...product.pricing };

      if (basePrice !== undefined) product.pricing.basePrice = basePrice;
      if (salePrice !== undefined) product.pricing.salePrice = salePrice;
      if (costPrice !== undefined) product.pricing.costPrice = costPrice;

      product.auditTrail.push({
        action: 'price_update',
        changedBy: req.user?.id || 'batch-operation',
        oldValue: oldPricing,
        newValue: product.pricing
      });

      await product.save();

      results.successful.push({
        productId,
        oldPricing,
        newPricing: product.pricing
      });

    } catch (error) {
      results.failed.push({
        productId: update.productId,
        error: error.message
      });
    }
  }

  res.status(results.failed.length === updates.length ? 400 : 200).json({
    success: results.successful.length > 0,
    message: `Processed ${updates.length} price updates: ${results.successful.length} successful, ${results.failed.length} failed`,
    data: results
  });
});

const batchUpdateStatus = asyncHandler(async (req, res) => {
  const { productIds, status, visibility } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Product IDs array is required and must not be empty'
    });
  }

  const results = {
    successful: [],
    failed: []
  };

  for (const productId of productIds) {
    try {
      validateMongoId(productId);

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const oldStatus = product.status;
      const oldVisibility = product.visibility;

      if (status) product.status = status;
      if (visibility) product.visibility = visibility;

      product.auditTrail.push({
        action: 'status_update',
        changedBy: req.user?.id || 'batch-operation',
        oldValue: { status: oldStatus, visibility: oldVisibility },
        newValue: { status: product.status, visibility: product.visibility }
      });

      await product.save();

      results.successful.push({
        productId,
        oldStatus,
        oldVisibility,
        newStatus: product.status,
        newVisibility: product.visibility
      });

    } catch (error) {
      results.failed.push({
        productId,
        error: error.message
      });
    }
  }

  res.status(results.failed.length === productIds.length ? 400 : 200).json({
    success: results.successful.length > 0,
    message: `Processed ${productIds.length} status updates: ${results.successful.length} successful, ${results.failed.length} failed`,
    data: results
  });
});

const batchDeleteProducts = asyncHandler(async (req, res) => {
  const { productIds, companyId } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Product IDs array is required and must not be empty'
    });
  }

  const results = {
    successful: [],
    failed: []
  };

  for (const productId of productIds) {
    try {
      validateMongoId(productId);

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      await Product.findByIdAndDelete(productId);

      results.successful.push({
        productId,
        name: product.name,
        sku: product.sku
      });

    } catch (error) {
      results.failed.push({
        productId,
        error: error.message
      });
    }
  }

  res.status(results.failed.length === productIds.length ? 400 : 200).json({
    success: results.successful.length > 0,
    message: `Processed ${productIds.length} deletions: ${results.successful.length} successful, ${results.failed.length} failed`,
    data: results
  });
});

const batchImportProducts = asyncHandler(async (req, res) => {
  const { products, companyId } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Products array is required and must not be empty'
    });
  }

  const results = {
    successful: [],
    failed: [],
    duplicates: []
  };

  for (const productData of products) {
    try {
      const existing = await Product.findOne({
        $or: [
          { sku: productData.sku, companyId },
          { asin: productData.asin, companyId }
        ]
      });

      if (existing) {
        results.duplicates.push({
          sku: productData.sku,
          asin: productData.asin,
          reason: 'Product with same SKU or ASIN already exists'
        });
        continue;
      }

      const product = new Product({
        ...productData,
        companyId: companyId || productData.companyId
      });

      product.auditTrail.push({
        action: 'create',
        changedBy: req.user?.id || 'batch-import',
        newValue: productData
      });

      await product.save();

      results.successful.push({
        productId: product._id,
        name: product.name,
        sku: product.sku
      });

    } catch (error) {
      results.failed.push({
        sku: productData.sku,
        name: productData.name,
        error: error.message
      });
    }
  }

  res.status(results.failed.length === products.length ? 400 : 201).json({
    success: results.successful.length > 0,
    message: `Processed ${products.length} imports: ${results.successful.length} successful, ${results.failed.length} failed, ${results.duplicates.length} duplicates`,
    data: results
  });
});

module.exports = {
  batchUpdateInventory,
  batchUpdatePrices,
  batchUpdateStatus,
  batchDeleteProducts,
  batchImportProducts
};
