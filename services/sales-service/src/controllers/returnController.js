const Return = require('../models/Return');
const Order = require('../models/Order');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

exports.createReturn = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { orderId, items, reason, detailedReason, images = [] } = req.body;

    if (!orderId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and items are required'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned'
      });
    }

    const daysSinceDelivery = Math.floor((new Date() - order.deliveredAt) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivery > 30) {
      return res.status(400).json({
        success: false,
        message: 'Return period has expired. Returns must be initiated within 30 days of delivery.'
      });
    }

    for (const item of items) {
      const orderItem = order.items.find(oi => oi.productId.toString() === item.productId.toString());
      if (!orderItem) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found in order`
        });
      }

      if (item.quantity > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity exceeds ordered quantity for product ${orderItem.productName}`
        });
      }
    }

    const returnNumber = await Return.generateReturnNumber();

    let refundAmount = 0;
    const returnItems = items.map(item => {
      const orderItem = order.items.find(oi => oi.productId.toString() === item.productId.toString());
      refundAmount += orderItem.price * item.quantity;

      return {
        productId: item.productId,
        productName: orderItem.productName,
        quantity: item.quantity,
        price: orderItem.price,
        reason: item.reason,
        condition: item.condition
      };
    });

    const returnRequest = await Return.create({
      returnNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: userId,
      companyId: order.companyId,
      items: returnItems,
      reason,
      detailedReason,
      images,
      refundAmount,
      status: 'requested'
    });

    await publishEvent('return.requested', {
      returnId: returnRequest._id,
      returnNumber: returnRequest.returnNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: userId,
      refundAmount,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      data: returnRequest
    });
  } catch (error) {
    logger.error('Error in createReturn:', error);
    next(error);
  }
};

exports.getReturns = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const returns = await Return.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Return.countDocuments(query);

    res.json({
      success: true,
      data: {
        returns,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error in getReturns:', error);
    next(error);
  }
};

exports.getReturnById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const returnRequest = await Return.findOne({
      _id: id,
      customerId: userId
    }).populate('orderId');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      data: returnRequest
    });
  } catch (error) {
    logger.error('Error in getReturnById:', error);
    next(error);
  }
};

exports.approveReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    await returnRequest.approve(req.user.userId, notes);

    await publishEvent('return.approved', {
      returnId: returnRequest._id,
      returnNumber: returnRequest.returnNumber,
      orderId: returnRequest.orderId,
      customerId: returnRequest.customerId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Return request approved',
      data: returnRequest
    });
  } catch (error) {
    logger.error('Error in approveReturn:', error);
    next(error);
  }
};

exports.rejectReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    await returnRequest.reject(reason, req.user.userId);

    await publishEvent('return.rejected', {
      returnId: returnRequest._id,
      returnNumber: returnRequest.returnNumber,
      customerId: returnRequest.customerId,
      reason,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Return request rejected',
      data: returnRequest
    });
  } catch (error) {
    logger.error('Error in rejectReturn:', error);
    next(error);
  }
};

exports.updateReturnStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    returnRequest.status = status;
    if (notes) {
      returnRequest.adminNotes = notes;
    }

    if (status === 'received') {
      returnRequest.receivedAt = new Date();
    } else if (status === 'inspected') {
      returnRequest.inspectedAt = new Date();
    } else if (status === 'refunded') {
      returnRequest.refundedAt = new Date();
      returnRequest.refundStatus = 'completed';
    }

    await returnRequest.save();

    await publishEvent(`return.${status}`, {
      returnId: returnRequest._id,
      returnNumber: returnRequest.returnNumber,
      customerId: returnRequest.customerId,
      status,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Return status updated to ${status}`,
      data: returnRequest
    });
  } catch (error) {
    logger.error('Error in updateReturnStatus:', error);
    next(error);
  }
};
