const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const StockReservation = require('../models/StockReservation');
const Product = require('../models/Product');
const { validateMongoId } = require('../utils/validateMongoId');
const { publishInventoryEvent } = require('../events/productEvents');

const createReservation = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { productId, variationId, warehouseId, orderId, customerId, quantity, expirationMinutes = 15 } = req.body;

  validateMongoId(productId);
  if (variationId) validateMongoId(variationId);
  if (warehouseId) validateMongoId(warehouseId);

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const availableStock = product.inventory.quantity;
  const currentReservations = await StockReservation.getTotalReservedQuantity(productId, warehouseId);
  const actualAvailable = availableStock - currentReservations;

  if (actualAvailable < quantity) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient stock available for reservation',
      data: {
        requested: quantity,
        available: actualAvailable,
        totalStock: availableStock,
        reserved: currentReservations
      }
    });
  }

  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  const reservation = new StockReservation({
    companyId: product.companyId,
    productId,
    variationId,
    warehouseId,
    orderId,
    customerId,
    quantity,
    expiresAt
  });

  await reservation.save();

  await publishInventoryEvent('stock.reserved', {
    reservationId: reservation._id,
    productId,
    orderId,
    quantity,
    expiresAt
  });

  res.status(201).json({
    success: true,
    message: 'Stock reservation created successfully',
    data: reservation
  });
});

const fulfillReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const reservation = await StockReservation.findById(id);

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Reservation not found' });
  }

  if (reservation.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: `Reservation is ${reservation.status} and cannot be fulfilled`
    });
  }

  if (reservation.expiresAt < new Date()) {
    await reservation.expire();
    return res.status(400).json({
      success: false,
      message: 'Reservation has expired'
    });
  }

  await reservation.fulfill();

  await publishInventoryEvent('stock.reservation.fulfilled', {
    reservationId: reservation._id,
    productId: reservation.productId,
    orderId: reservation.orderId,
    quantity: reservation.quantity
  });

  res.status(200).json({
    success: true,
    message: 'Reservation fulfilled successfully',
    data: reservation
  });
});

const cancelReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  validateMongoId(id);

  const reservation = await StockReservation.findById(id);

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Reservation not found' });
  }

  if (reservation.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: `Reservation is already ${reservation.status}`
    });
  }

  await reservation.cancel(reason);

  await publishInventoryEvent('stock.reservation.cancelled', {
    reservationId: reservation._id,
    productId: reservation.productId,
    orderId: reservation.orderId,
    quantity: reservation.quantity,
    reason
  });

  res.status(200).json({
    success: true,
    message: 'Reservation cancelled successfully',
    data: reservation
  });
});

const getReservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoId(id);

  const reservation = await StockReservation.findById(id)
    .populate('productId', 'name sku')
    .populate('warehouseId', 'name');

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Reservation not found' });
  }

  res.status(200).json({ success: true, data: reservation });
});

const getAllReservations = asyncHandler(async (req, res) => {
  const { companyId, productId, orderId, status, page = 1, limit = 20 } = req.query;

  if (!companyId) {
    return res.status(400).json({ success: false, message: 'Company ID is required' });
  }

  if (productId) validateMongoId(productId);

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { companyId };
  if (productId) query.productId = productId;
  if (orderId) query.orderId = orderId;
  if (status) query.status = status;

  const reservations = await StockReservation.find(query)
    .populate('productId', 'name sku')
    .populate('warehouseId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await StockReservation.countDocuments(query);

  res.status(200).json({
    success: true,
    data: reservations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

const getAvailableStock = asyncHandler(async (req, res) => {
  const { productId, warehouseId } = req.query;

  if (!productId) {
    return res.status(400).json({ success: false, message: 'Product ID is required' });
  }

  validateMongoId(productId);
  if (warehouseId) validateMongoId(warehouseId);

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const totalStock = product.inventory.quantity;
  const reserved = await StockReservation.getTotalReservedQuantity(productId, warehouseId);
  const available = totalStock - reserved;

  res.status(200).json({
    success: true,
    data: {
      productId,
      warehouseId: warehouseId || null,
      totalStock,
      reserved,
      available
    }
  });
});

const cleanupExpiredReservations = asyncHandler(async (req, res) => {
  const expiredReservations = await StockReservation.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });

  for (const reservation of expiredReservations) {
    await reservation.expire();
    await publishInventoryEvent('stock.reservation.expired', {
      reservationId: reservation._id,
      productId: reservation.productId,
      orderId: reservation.orderId,
      quantity: reservation.quantity
    });
  }

  res.status(200).json({
    success: true,
    message: `Cleaned up ${expiredReservations.length} expired reservations`,
    count: expiredReservations.length
  });
});

module.exports = {
  createReservation,
  fulfillReservation,
  cancelReservation,
  getReservationById,
  getAllReservations,
  getAvailableStock,
  cleanupExpiredReservations
};
