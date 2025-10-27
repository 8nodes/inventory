const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class WalletService {
  async getOrCreateWallet(ownerId, ownerType, currency = 'USD') {
    try {
      let wallet = await Wallet.findOne({ ownerId, ownerType });

      if (!wallet) {
        wallet = await Wallet.create({
          ownerId,
          ownerType,
          currency,
          balance: 0,
          pendingBalance: 0,
        });
        logger.info(`Wallet created for ${ownerType} ${ownerId}`);
      }

      return wallet;
    } catch (error) {
      logger.error('Get or Create Wallet Error:', error);
      throw error;
    }
  }

  async creditWallet(walletId, amount, category, description, metadata = {}) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      const transaction = await WalletTransaction.create({
        walletId,
        transactionId: uuidv4(),
        type: 'credit',
        category,
        amount,
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        description,
        metadata,
      });

      wallet.balance = balanceAfter;
      wallet.totalEarnings += amount;
      await wallet.save();

      logger.info(`Wallet ${walletId} credited with ${amount}`);

      return { wallet, transaction };
    } catch (error) {
      logger.error('Credit Wallet Error:', error);
      throw error;
    }
  }

  async debitWallet(walletId, amount, category, description, metadata = {}) {
    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      const transaction = await WalletTransaction.create({
        walletId,
        transactionId: uuidv4(),
        type: 'debit',
        category,
        amount,
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        description,
        metadata,
      });

      wallet.balance = balanceAfter;
      if (category === 'withdrawal') {
        wallet.totalWithdrawals += amount;
      }
      await wallet.save();

      logger.info(`Wallet ${walletId} debited with ${amount}`);

      return { wallet, transaction };
    } catch (error) {
      logger.error('Debit Wallet Error:', error);
      throw error;
    }
  }

  async getWalletBalance(ownerId, ownerType) {
    try {
      const wallet = await Wallet.findOne({ ownerId, ownerType });
      if (!wallet) {
        return {
          balance: 0,
          currency: 'USD',
          pendingBalance: 0,
        };
      }

      return {
        balance: wallet.balance,
        currency: wallet.currency,
        pendingBalance: wallet.pendingBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        status: wallet.status,
      };
    } catch (error) {
      logger.error('Get Wallet Balance Error:', error);
      throw error;
    }
  }

  async getWalletTransactions(walletId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const transactions = await WalletTransaction.find({ walletId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WalletTransaction.countDocuments({ walletId });

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get Wallet Transactions Error:', error);
      throw error;
    }
  }

  async suspendWallet(ownerId, ownerType) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { ownerId, ownerType },
        { status: 'suspended' },
        { new: true }
      );

      logger.info(`Wallet suspended for ${ownerType} ${ownerId}`);
      return wallet;
    } catch (error) {
      logger.error('Suspend Wallet Error:', error);
      throw error;
    }
  }

  async activateWallet(ownerId, ownerType) {
    try {
      const wallet = await Wallet.findOneAndUpdate(
        { ownerId, ownerType },
        { status: 'active' },
        { new: true }
      );

      logger.info(`Wallet activated for ${ownerType} ${ownerId}`);
      return wallet;
    } catch (error) {
      logger.error('Activate Wallet Error:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();
