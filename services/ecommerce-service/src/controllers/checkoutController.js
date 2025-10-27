const Cart = require('../models/Cart');
const axios = require('axios').default;
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3009';
const salesServiceUrl = process.env.SALES_SERVICE_URL || 'http://sales-service:8008';

exports.initiateCheckout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { paymentMethod, shippingAddress, phoneNumber } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    const orderData = {
      userId,
      items: cart.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: cart.totalAmount,
      shippingAddress,
      paymentMethod,
    };

    const orderResponse = await axios.post(`${salesServiceUrl}/api/orders`, orderData, {
      headers: {
        Authorization: req.headers.authorization,
      },
    });

    const order = orderResponse.data.data;

    const paymentData = {
      amount: cart.totalAmount,
      currency: 'USD',
      paymentMethod,
      paymentType: 'order',
      orderId: order._id,
      shopId: cart.items[0]?.companyId,
      metadata: {
        phoneNumber,
        returnUrl: `${process.env.FRONTEND_URL}/checkout/success`,
        cancelUrl: `${process.env.FRONTEND_URL}/checkout/cancel`,
      },
    };

    const paymentResponse = await axios.post(
      `${paymentServiceUrl}/api/payments/initiate`,
      paymentData,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    await cart.clear();

    await publishEvent('checkout.initiated', {
      userId,
      orderId: order._id,
      amount: cart.totalAmount,
      paymentMethod,
    });

    res.json({
      success: true,
      message: 'Checkout initiated',
      data: {
        order,
        payment: paymentResponse.data.data,
      },
    });
  } catch (error) {
    logger.error('Error in initiateCheckout:', error);
    next(error);
  }
};

exports.confirmCheckout = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const paymentResponse = await axios.post(
      `${paymentServiceUrl}/api/payments/${transactionId}/confirm`,
      {},
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const payment = paymentResponse.data.data;

    if (payment.status === 'completed') {
      await axios.patch(
        `${salesServiceUrl}/api/orders/${payment.orderId}/status`,
        { status: 'confirmed' },
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );

      await publishEvent('checkout.completed', {
        userId: payment.userId,
        orderId: payment.orderId,
        transactionId,
        amount: payment.amount,
      });
    }

    res.json({
      success: true,
      message: 'Checkout confirmed',
      data: payment,
    });
  } catch (error) {
    logger.error('Error in confirmCheckout:', error);
    next(error);
  }
};
