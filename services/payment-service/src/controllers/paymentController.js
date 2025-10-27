const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');
const { publishEvent } = require('../config/rabbitmq');

exports.initiatePayment = async (req, res, next) => {
  try {
    const { amount, currency, paymentMethod, paymentType, orderId, shopId, companyId, metadata } = req.body;

    const result = await paymentService.initiatePayment({
      userId: req.user.userId,
      amount,
      currency: currency || 'USD',
      paymentMethod,
      paymentType,
      orderId,
      shopId,
      companyId,
      metadata: metadata || {},
    });

    await publishEvent('payment.initiated', {
      transactionId: result.payment.transactionId,
      userId: req.user.userId,
      amount,
      paymentMethod,
      paymentType,
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated',
      data: result,
    });
  } catch (error) {
    logger.error('Initiate Payment Error:', error);
    next(error);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const result = await paymentService.confirmPayment(transactionId);

    if (result.payment.status === 'completed') {
      await publishEvent('payment.completed', {
        transactionId: result.payment.transactionId,
        userId: result.payment.userId,
        orderId: result.payment.orderId,
        shopId: result.payment.shopId,
        companyId: result.payment.companyId,
        amount: result.payment.amount,
        paymentType: result.payment.paymentType,
      });
    }

    res.json({
      success: true,
      message: 'Payment confirmed',
      data: result.payment,
    });
  } catch (error) {
    logger.error('Confirm Payment Error:', error);
    next(error);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const result = await paymentService.getPaymentStatus(transactionId);

    res.json({
      success: true,
      data: result.payment,
    });
  } catch (error) {
    logger.error('Get Payment Status Error:', error);
    next(error);
  }
};

exports.refundPayment = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { amount } = req.body;

    const result = await paymentService.refundPayment(transactionId, amount);

    await publishEvent('payment.refunded', {
      transactionId: result.payment.transactionId,
      userId: result.payment.userId,
      orderId: result.payment.orderId,
      amount: result.payment.refundedAmount,
    });

    res.json({
      success: true,
      message: 'Payment refunded',
      data: result.payment,
    });
  } catch (error) {
    logger.error('Refund Payment Error:', error);
    next(error);
  }
};

exports.getUserPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const payments = await Payment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ userId: req.user.userId });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get User Payments Error:', error);
    next(error);
  }
};

exports.getShopPayments = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await paymentService.getPaymentsByShop(shopId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get Shop Payments Error:', error);
    next(error);
  }
};

exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const stripeService = require('../services/stripeService');

    const result = await stripeService.constructWebhookEvent(req.body, signature);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const event = result.event;

    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('PaymentIntent succeeded:', event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        logger.info('PaymentIntent failed:', event.data.object.id);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe Webhook Error:', error);
    res.status(400).json({ error: error.message });
  }
};

const Payment = require('../models/Payment');
