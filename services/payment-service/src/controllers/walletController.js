const walletService = require('../services/walletService');
const paymentService = require('../services/paymentService');
const Withdrawal = require('../models/Withdrawal');
const logger = require('../utils/logger');

exports.getWalletBalance = async (req, res, next) => {
  try {
    const { ownerId, ownerType } = req.params;

    const balance = await walletService.getWalletBalance(ownerId, ownerType);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Get Wallet Balance Error:', error);
    next(error);
  }
};

exports.getWalletTransactions = async (req, res, next) => {
  try {
    const { walletId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await walletService.getWalletTransactions(walletId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get Wallet Transactions Error:', error);
    next(error);
  }
};

exports.requestWithdrawal = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { amount, withdrawalMethod, accountDetails } = req.body;

    const result = await paymentService.requestWithdrawal(ownerId, amount, withdrawalMethod, accountDetails);

    res.status(201).json({
      success: true,
      message: 'Withdrawal requested',
      data: result.withdrawal,
    });
  } catch (error) {
    logger.error('Request Withdrawal Error:', error);
    next(error);
  }
};

exports.processWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;

    const result = await paymentService.processWithdrawal(withdrawalId);

    res.json({
      success: true,
      message: 'Withdrawal processed',
      data: result.withdrawal,
    });
  } catch (error) {
    logger.error('Process Withdrawal Error:', error);
    next(error);
  }
};

exports.getWithdrawals = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const query = { ownerId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get Withdrawals Error:', error);
    next(error);
  }
};

exports.cancelWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await Withdrawal.findOne({ withdrawalId });
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending withdrawals',
      });
    }

    withdrawal.status = 'cancelled';
    await withdrawal.save();

    const wallet = await walletService.getOrCreateWallet(withdrawal.ownerId, 'shop');
    await walletService.creditWallet(
      wallet._id,
      withdrawal.amount,
      'adjustment',
      `Cancelled withdrawal ${withdrawalId}`,
      { withdrawalId: withdrawal._id }
    );

    res.json({
      success: true,
      message: 'Withdrawal cancelled',
      data: withdrawal,
    });
  } catch (error) {
    logger.error('Cancel Withdrawal Error:', error);
    next(error);
  }
};
