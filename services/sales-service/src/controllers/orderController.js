const Order = require('../models/Order');
const axios = require('axios').default;
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:8007';

exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      customerNotes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    for (const item of items) {
      const response = await axios.get(`${inventoryServiceUrl}/api/products/${item.productId}`);
      const product = response.data.data;

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      if (product.inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }
    }

    const orderNumber = await Order.generateOrderNumber();

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const response = await axios.get(`${inventoryServiceUrl}/api/products/${item.productId}`);
      const product = response.data.data;

      const price = product.pricing.salePrice || product.pricing.basePrice;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        productImage: product.images[0]?.url,
        quantity: item.quantity,
        price,
        subtotal: itemSubtotal
      });
    }

    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 ? 0 : 10;
    const total = subtotal + tax + shipping;

    const order = await Order.create({
      orderNumber,
      customerId: userId,
      customerEmail: req.user.email,
      companyId: req.user.companyId || orderItems[0].companyId,
      items: orderItems,
      pricing: {
        subtotal,
        tax,
        shipping,
        discount: 0,
        total
      },
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      customerNotes,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await publishEvent('order.created', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: userId,
      companyId: order.companyId,
      total: order.pricing.total,
      items: order.items,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in createOrder:', error);
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error in getOrders:', error);
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({
      _id: id,
      customerId: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error in getOrderById:', error);
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.updateStatus(status, note, req.user.userId);

    await publishEvent(`order.${status}`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    logger.error('Error in updateOrderStatus:', error);
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({
      _id: id,
      customerId: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.cancel(reason, userId);

    await publishEvent('order.cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: userId,
      reason,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error in cancelOrder:', error);
    next(error);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({
      _id: id,
      customerId: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      shippingCarrier: order.shippingCarrier,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      deliveredAt: order.deliveredAt,
      statusHistory: order.statusHistory
    };

    res.json({
      success: true,
      data: trackingInfo
    });
  } catch (error) {
    logger.error('Error in trackOrder:', error);
    next(error);
  }
};

exports.addTrackingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber, shippingCarrier, estimatedDeliveryDate } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.trackingNumber = trackingNumber;
    order.shippingCarrier = shippingCarrier;
    order.estimatedDeliveryDate = estimatedDeliveryDate;
    order.status = 'shipped';

    await order.save();

    await publishEvent('order.shipped', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      trackingNumber,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Tracking information added',
      data: order
    });
  } catch (error) {
    logger.error('Error in addTrackingInfo:', error);
    next(error);
  }
};
