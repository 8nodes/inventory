const Payment = require('../models/Payment');
const Withdrawal = require('../models/Withdrawal');
const stripeService = require('./stripeService');
const paypalService = require('./paypalService');
const mtnMomoService = require('./mtnMomoService');
const airtelMoneyService = require('./airtelMoneyService');
const walletService = require('./walletService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PaymentService {
  async initiatePayment(paymentData) {
    try {
      const { userId, amount, currency, paymentMethod, paymentType, orderId, shopId, companyId, metadata } = paymentData;

      const transactionId = uuidv4();

      const payment = await Payment.create({
        transactionId,
        userId,
        orderId,
        shopId,
        companyId,
        amount,
        currency,
        paymentMethod,
        paymentType,
        status: 'pending',
        metadata,
      });

      let result;

      switch (paymentMethod) {
        case 'stripe':
          result = await stripeService.createPaymentIntent(amount, currency, {
            transactionId,
            userId,
            orderId,
            shopId,
            companyId,
            paymentType,
          });
          if (result.success) {
            payment.providerTransactionId = result.paymentIntentId;
            payment.metadata = { ...payment.metadata, clientSecret: result.clientSecret };
          }
          break;

        case 'paypal':
          result = await paypalService.createOrder(
            amount,
            currency,
            metadata.returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
            metadata.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`
          );
          if (result.success) {
            payment.providerTransactionId = result.orderId;
            payment.metadata = { ...payment.metadata, approvalUrl: result.approvalUrl };
          }
          break;

        case 'mtn_momo':
          if (!metadata.phoneNumber) {
            throw new Error('Phone number required for MTN MoMo');
          }
          result = await mtnMomoService.requestToPay(
            amount,
            currency,
            metadata.phoneNumber,
            `Payment for ${paymentType}`,
            `Payment received`
          );
          if (result.success) {
            payment.providerTransactionId = result.referenceId;
            payment.status = 'processing';
          }
          break;

        case 'airtel_money':
          if (!metadata.phoneNumber) {
            throw new Error('Phone number required for Airtel Money');
          }
          result = await airtelMoneyService.initiatePayment(
            amount,
            currency,
            metadata.phoneNumber,
            transactionId
          );
          if (result.success) {
            payment.providerTransactionId = result.transactionId;
            payment.status = 'processing';
          }
          break;

        default:
          throw new Error('Invalid payment method');
      }

      if (!result.success) {
        payment.status = 'failed';
        payment.errorMessage = result.error;
      }

      await payment.save();

      return {
        success: result.success,
        payment,
        ...(result.success && {
          clientSecret: payment.metadata?.clientSecret,
          approvalUrl: payment.metadata?.approvalUrl,
        }),
      };
    } catch (error) {
      logger.error('Initiate Payment Error:', error);
      throw error;
    }
  }

  async confirmPayment(transactionId) {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'completed') {
        return { success: true, payment };
      }

      let result;

      switch (payment.paymentMethod) {
        case 'stripe':
          result = await stripeService.confirmPayment(payment.providerTransactionId);
          if (result.success && result.status === 'succeeded') {
            payment.status = 'completed';
          }
          break;

        case 'paypal':
          result = await paypalService.captureOrder(payment.providerTransactionId);
          if (result.success && result.status === 'COMPLETED') {
            payment.status = 'completed';
          }
          break;

        case 'mtn_momo':
          result = await mtnMomoService.getTransactionStatus(payment.providerTransactionId);
          if (result.success) {
            if (result.status === 'SUCCESSFUL') {
              payment.status = 'completed';
            } else if (result.status === 'FAILED') {
              payment.status = 'failed';
            }
          }
          break;

        case 'airtel_money':
          result = await airtelMoneyService.getTransactionStatus(payment.providerTransactionId);
          if (result.success) {
            if (result.status === 'ts') {
              payment.status = 'completed';
            } else if (result.status === 'tf') {
              payment.status = 'failed';
            }
          }
          break;
      }

      if (payment.status === 'completed' && payment.shopId) {
        const processingFee = payment.amount * 0.029 + 0.30;
        payment.processingFee = processingFee;
        payment.netAmount = payment.amount - processingFee;

        const wallet = await walletService.getOrCreateWallet(payment.shopId, 'shop', payment.currency);
        await walletService.creditWallet(
          wallet._id,
          payment.netAmount,
          'payment_received',
          `Payment for order ${payment.orderId}`,
          { paymentId: payment._id, orderId: payment.orderId }
        );
      }

      await payment.save();

      return { success: true, payment };
    } catch (error) {
      logger.error('Confirm Payment Error:', error);
      throw error;
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      return { success: true, payment };
    } catch (error) {
      logger.error('Get Payment Status Error:', error);
      throw error;
    }
  }

  async refundPayment(transactionId, amount = null) {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      const refundAmount = amount || payment.amount;

      let result;

      switch (payment.paymentMethod) {
        case 'stripe':
          result = await stripeService.createRefund(payment.providerTransactionId, refundAmount);
          break;

        default:
          throw new Error('Refund not supported for this payment method');
      }

      if (result.success) {
        payment.status = 'refunded';
        payment.refundedAmount = refundAmount;
        await payment.save();

        if (payment.shopId && payment.netAmount) {
          const wallet = await walletService.getOrCreateWallet(payment.shopId, 'shop', payment.currency);
          await walletService.debitWallet(
            wallet._id,
            payment.netAmount,
            'refund',
            `Refund for order ${payment.orderId}`,
            { paymentId: payment._id, orderId: payment.orderId }
          );
        }
      }

      return { success: result.success, payment };
    } catch (error) {
      logger.error('Refund Payment Error:', error);
      throw error;
    }
  }

  async requestWithdrawal(ownerId, amount, withdrawalMethod, accountDetails) {
    try {
      const wallet = await walletService.getOrCreateWallet(ownerId, 'shop');

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const withdrawal = await Withdrawal.create({
        withdrawalId: uuidv4(),
        walletId: wallet._id,
        ownerId,
        amount,
        currency: wallet.currency,
        withdrawalMethod,
        accountDetails,
        status: 'pending',
      });

      await walletService.debitWallet(
        wallet._id,
        amount,
        'withdrawal',
        `Withdrawal request ${withdrawal.withdrawalId}`,
        { withdrawalId: withdrawal._id }
      );

      return { success: true, withdrawal };
    } catch (error) {
      logger.error('Request Withdrawal Error:', error);
      throw error;
    }
  }

  async processWithdrawal(withdrawalId) {
    try {
      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new Error('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error('Withdrawal already processed');
      }

      withdrawal.status = 'processing';
      await withdrawal.save();

      let result;

      switch (withdrawal.withdrawalMethod) {
        case 'paypal':
          if (!withdrawal.accountDetails.email) {
            throw new Error('PayPal email required');
          }
          result = await paypalService.createPayout(
            withdrawal.amount,
            withdrawal.currency,
            withdrawal.accountDetails.email,
            `Withdrawal ${withdrawalId}`
          );
          if (result.success) {
            withdrawal.paymentTransactionId = result.payoutBatchId;
            withdrawal.status = 'completed';
            withdrawal.processedAt = new Date();
          }
          break;

        case 'mobile_money':
          if (!withdrawal.accountDetails.phoneNumber || !withdrawal.accountDetails.provider) {
            throw new Error('Phone number and provider required');
          }

          if (withdrawal.accountDetails.provider === 'mtn') {
            result = { success: true, status: 'completed' };
          } else if (withdrawal.accountDetails.provider === 'airtel') {
            result = await airtelMoneyService.disbursement(
              withdrawal.amount,
              withdrawal.currency,
              withdrawal.accountDetails.phoneNumber,
              withdrawalId
            );
          }

          if (result.success) {
            withdrawal.status = 'completed';
            withdrawal.processedAt = new Date();
          }
          break;

        default:
          withdrawal.status = 'completed';
          withdrawal.processedAt = new Date();
          withdrawal.notes = 'Manual processing required';
      }

      if (!result || !result.success) {
        withdrawal.status = 'failed';
        withdrawal.errorMessage = result?.error || 'Processing failed';
      }

      await withdrawal.save();

      return { success: true, withdrawal };
    } catch (error) {
      logger.error('Process Withdrawal Error:', error);

      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (withdrawal) {
        withdrawal.status = 'failed';
        withdrawal.errorMessage = error.message;
        await withdrawal.save();
      }

      throw error;
    }
  }

  async getPaymentsByShop(shopId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const payments = await Payment.find({ shopId, status: 'completed' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments({ shopId, status: 'completed' });

      return {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get Payments By Shop Error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
