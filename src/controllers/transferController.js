const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const StockTransfer = require('../models/StockTransfer');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockChange = require('../models/StockChange');
const { validateMongoId } = require('../utils/validateMongoId');
const { publishWarehouseEvent, publishInventoryEvent } = require('../events/productEvents');
const mongoose = require('mongoose');

const createTransfer = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { sourceWarehouseId, destinationWarehouseId, items, notes, companyId } = req.body;

  validateMongoId(sourceWarehouseId);
  validateMongoId(destinationWarehouseId);

  if (sourceWarehouseId === destinationWarehouseId) {
    return res.status(400).json({
      success: false,
      message: 'Source and destination warehouses cannot be the same'
    });
  }

  const sourceWarehouse = await Warehouse.findById(sourceWarehouseId);
  const destinationWarehouse = await Warehouse.findById(destinationWarehouseId);

  if (!sourceWarehouse || !destinationWarehouse) {
    return res.status(404).json({
      success: false,
      message: 'Source or destination warehouse not found'
    });
  }

  for (const item of items) {
    validateMongoId(item.productId);
    const product = await Product.findById(item.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product ${item.productId} not found`
      });
    }

    const warehouseStock = product.inventory.perWarehouse.find(
      wh => wh.warehouseId.toString() === sourceWarehouseId
    );

    if (!warehouseStock || warehouseStock.quantity < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for product ${product.name} in source warehouse`,
        data: {
          productId: item.productId,
          available: warehouseStock ? warehouseStock.quantity : 0,
          requested: item.quantity
        }
      });
    }
  }

  const transferNumber = await StockTransfer.generateTransferNumber();

  const transfer = new StockTransfer({
    companyId: companyId || sourceWarehouse.companyId,
    transferNumber,
    sourceWarehouseId,
    destinationWarehouseId,
    items,
    notes,
    initiatedBy: req.user?.id || 'system'
  });

  await transfer.save();

  await publishWarehouseEvent('transfer.created', {
    transferId: transfer._id,
    transferNumber,
    sourceWarehouseId,
    destinationWarehouseId,
    itemCount: items.length
  });

  res.status(201).json({
    success: true,
    message: 'Stock transfer created successfully',
    data: transfer
  });
});

const approveTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { trackingNumber } = req.body;
  validateMongoId(id);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(id).session(session);

    if (!transfer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfer.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Transfer is ${transfer.status} and cannot be approved`
      });
    }

    for (const item of transfer.items) {
      const product = await Product.findById(item.productId).session(session);

      const sourceWarehouseStock = product.inventory.perWarehouse.find(
        wh => wh.warehouseId.toString() === transfer.sourceWarehouseId.toString()
      );

      if (!sourceWarehouseStock || sourceWarehouseStock.quantity < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}`,
          data: {
            productId: item.productId,
            available: sourceWarehouseStock ? sourceWarehouseStock.quantity : 0,
            requested: item.quantity
          }
        });
      }

      sourceWarehouseStock.quantity -= item.quantity;

      product.auditTrail.push({
        action: 'transfer_out',
        changedBy: req.user?.id || 'system',
        oldValue: { quantity: sourceWarehouseStock.quantity + item.quantity },
        newValue: { quantity: sourceWarehouseStock.quantity, transferNumber: transfer.transferNumber }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: transfer.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: transfer.sourceWarehouseId,
        changeType: 'transfer_out',
        quantity: -item.quantity,
        previousStock: sourceWarehouseStock.quantity + item.quantity,
        newStock: sourceWarehouseStock.quantity,
        reason: `Transfer ${transfer.transferNumber} to destination warehouse`,
        transferId: transfer._id,
        userId: req.user?.id || 'system'
      });
      await stockChange.save({ session });
    }

    await transfer.approve(req.user?.id || 'system');
    if (trackingNumber) {
      await transfer.ship(trackingNumber);
    }

    await session.commitTransaction();

    await publishWarehouseEvent('transfer.approved', {
      transferId: transfer._id,
      transferNumber: transfer.transferNumber,
      sourceWarehouseId: transfer.sourceWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId
    });

    res.status(200).json({
      success: true,
      message: 'Transfer approved and stock deducted from source warehouse',
      data: transfer
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const completeTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(id).session(session);

    if (!transfer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfer.status !== 'in_transit') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Transfer is ${transfer.status} and cannot be completed`
      });
    }

    for (const item of transfer.items) {
      const product = await Product.findById(item.productId).session(session);

      let destWarehouseStock = product.inventory.perWarehouse.find(
        wh => wh.warehouseId.toString() === transfer.destinationWarehouseId.toString()
      );

      if (destWarehouseStock) {
        destWarehouseStock.quantity += item.quantity;
      } else {
        product.inventory.perWarehouse.push({
          warehouseId: transfer.destinationWarehouseId,
          quantity: item.quantity,
          lowStockThreshold: product.inventory.lowStockThreshold
        });
        destWarehouseStock = product.inventory.perWarehouse[product.inventory.perWarehouse.length - 1];
      }

      product.inventory.quantity = product.inventory.perWarehouse.reduce(
        (total, wh) => total + wh.quantity,
        0
      );

      product.availability = product.inventory.quantity > 0 ? 'in_stock' : 'out_of_stock';

      product.auditTrail.push({
        action: 'transfer_in',
        changedBy: req.user?.id || 'system',
        oldValue: { quantity: destWarehouseStock.quantity - item.quantity },
        newValue: { quantity: destWarehouseStock.quantity, transferNumber: transfer.transferNumber }
      });

      await product.save({ session });

      const stockChange = new StockChange({
        companyId: transfer.companyId,
        productId: item.productId,
        variationId: item.variationId || null,
        warehouseId: transfer.destinationWarehouseId,
        changeType: 'transfer_in',
        quantity: item.quantity,
        previousStock: destWarehouseStock.quantity - item.quantity,
        newStock: destWarehouseStock.quantity,
        reason: `Transfer ${transfer.transferNumber} from source warehouse`,
        transferId: transfer._id,
        userId: req.user?.id || 'system'
      });
      await stockChange.save({ session });
    }

    await transfer.complete(req.user?.id || 'system');

    await session.commitTransaction();

    await publishWarehouseEvent('transfer.completed', {
      transferId: transfer._id,
      transferNumber: transfer.transferNumber,
      sourceWarehouseId: transfer.sourceWarehouseId,
      destinationWarehouseId: transfer.destinationWarehouseId
    });

    res.status(200).json({
      success: true,
      message: 'Transfer completed and stock added to destination warehouse',
      data: transfer
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const cancelTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  validateMongoId(id);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StockTransfer.findById(id).session(session);

    if (!transfer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    if (transfer.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Completed transfers cannot be cancelled'
      });
    }

    if (transfer.status === 'in_transit') {
      for (const item of transfer.items) {
        const product = await Product.findById(item.productId).session(session);

        const sourceWarehouseStock = product.inventory.perWarehouse.find(
          wh => wh.warehouseId.toString() === transfer.sourceWarehouseId.toString()
        );

        if (sourceWarehouseStock) {
          sourceWarehouseStock.quantity += item.quantity;
        }

        product.auditTrail.push({
          action: 'transfer_cancelled',
          changedBy: req.user?.id || 'system',
          oldValue: { quantity: sourceWarehouseStock.quantity - item.quantity },
          newValue: { quantity: sourceWarehouseStock.quantity, reason }
        });

        await product.save({ session });

        const stockChange = new StockChange({
          companyId: transfer.companyId,
          productId: item.productId,
          variationId: item.variationId || null,
          warehouseId: transfer.sourceWarehouseId,
          changeType: 'adjustment',
          quantity: item.quantity,
          previousStock: sourceWarehouseStock.quantity - item.quantity,
          newStock: sourceWarehouseStock.quantity,
          reason: `Transfer ${transfer.transferNumber} cancelled: ${reason}`,
          transferId: transfer._id,
          userId: req.user?.id || 'system'
        });
        await stockChange.save({ session });
      }
    }

    await transfer.cancel(reason);

    await session.commitTransaction();

    await publishWarehouseEvent('transfer.cancelled', {
      transferId: transfer._id,
      transferNumber: transfer.transferNumber,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Transfer cancelled successfully',
      data: transfer
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const getTransferById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const transfer = await StockTransfer.findById(id)
    .populate('sourceWarehouseId', 'name location')
    .populate('destinationWarehouseId', 'name location')
    .populate('items.productId', 'name sku');

  if (!transfer) {
    return res.status(404).json({ success: false, message: 'Transfer not found' });
  }

  res.status(200).json({ success: true, data: transfer });
});

const getAllTransfers = asyncHandler(async (req, res) => {
  const { companyId, status, sourceWarehouseId, destinationWarehouseId, page = 1, limit = 20 } = req.query;

  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Company ID is required' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { companyId };
  if (status) query.status = status;
  if (sourceWarehouseId) query.sourceWarehouseId = sourceWarehouseId;
  if (destinationWarehouseId) query.destinationWarehouseId = destinationWarehouseId;

  const transfers = await StockTransfer.find(query)
    .populate('sourceWarehouseId', 'name location')
    .populate('destinationWarehouseId', 'name location')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await StockTransfer.countDocuments(query);

  res.status(200).json({
    success: true,
    data: transfers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

module.exports = {
  createTransfer,
  approveTransfer,
  completeTransfer,
  cancelTransfer,
  getTransferById,
  getAllTransfers
};
