const Company = require('../models/Company');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const axios = require('axios').default;
const { logger } = require('../utils/logger');

const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3009';

exports.upgradeSubscription = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { subscriptionTier, subscriptionType, paymentMethod } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const plan = await SubscriptionPlan.findOne({
      tier: subscriptionTier,
      billingCycle: subscriptionType,
      isActive: true,
    });

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan',
      });
    }

    const paymentData = {
      amount: plan.price,
      currency: 'USD',
      paymentMethod,
      paymentType: 'subscription',
      companyId: company._id,
      metadata: {
        subscriptionTier,
        subscriptionType,
        planId: plan._id,
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

    res.json({
      success: true,
      message: 'Subscription upgrade initiated',
      data: {
        payment: paymentResponse.data.data,
        plan,
      },
    });
  } catch (error) {
    logger.error('Error upgrading subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription',
      error: error.message,
    });
  }
};

exports.confirmSubscriptionPayment = async (req, res) => {
  try {
    const { companyId, transactionId } = req.params;

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
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      const { subscriptionTier, subscriptionType } = payment.metadata;

      const plan = await SubscriptionPlan.findOne({
        tier: subscriptionTier,
        billingCycle: subscriptionType,
        isActive: true,
      });

      const subscriptionEndDate = new Date();
      if (subscriptionType === 'monthly') {
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      } else {
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      }

      company.subscriptionTier = subscriptionTier;
      company.subscriptionType = subscriptionType;
      company.subscriptionStatus = 'active';
      company.subscriptionEndDate = subscriptionEndDate;
      company.maxUsers = plan.maxUsers;

      await company.save();
    }

    res.json({
      success: true,
      message: 'Subscription payment confirmed',
      data: payment,
    });
  } catch (error) {
    logger.error('Error confirming subscription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm subscription payment',
      error: error.message,
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    company.subscriptionStatus = 'cancelled';
    await company.save();

    res.json({
      success: true,
      message: 'Subscription cancelled',
      data: company,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message,
    });
  }
};
