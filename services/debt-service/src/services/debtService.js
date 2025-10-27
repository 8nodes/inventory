const Debt = require('../models/Debt');
const DebtPayment = require('../models/DebtPayment');
const DebtReminder = require('../models/DebtReminder');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DebtService {
  async createDebt(debtData) {
    try {
      const { companyId, debtorId, debtorType, creditorId, creditorType, principalAmount, interestRate, dueDate, description, paymentTerms, relatedOrderId, currency, metadata } = debtData;

      const totalAmount = principalAmount + (principalAmount * (interestRate || 0) / 100);

      const debt = await Debt.create({
        debtId: uuidv4(),
        companyId,
        debtorId,
        debtorType,
        creditorId,
        creditorType,
        relatedOrderId,
        principalAmount,
        interestRate: interestRate || 0,
        totalAmount,
        remainingBalance: totalAmount,
        currency: currency || 'USD',
        dueDate,
        description,
        paymentTerms,
        metadata,
      });

      logger.info(`Debt created: ${debt.debtId}`);
      return debt;
    } catch (error) {
      logger.error('Create Debt Error:', error);
      throw error;
    }
  }

  async recordPayment(debtId, paymentData) {
    try {
      const { amount, paymentMethod, transactionReference, paidBy, receivedBy, notes, metadata } = paymentData;

      const debt = await Debt.findOne({ debtId });
      if (!debt) {
        throw new Error('Debt not found');
      }

      if (debt.status === 'paid') {
        throw new Error('Debt already paid');
      }

      if (amount > debt.remainingBalance) {
        throw new Error('Payment amount exceeds remaining balance');
      }

      const payment = await DebtPayment.create({
        paymentId: uuidv4(),
        debtId: debt._id,
        amount,
        currency: debt.currency,
        paymentMethod,
        transactionReference,
        paidBy,
        receivedBy,
        notes,
        metadata,
      });

      debt.paidAmount += amount;
      debt.remainingBalance -= amount;

      if (debt.remainingBalance === 0) {
        debt.status = 'paid';
      } else if (debt.paidAmount > 0) {
        debt.status = 'partially_paid';
      }

      await debt.save();

      logger.info(`Payment recorded for debt ${debtId}: ${amount}`);

      return { debt, payment };
    } catch (error) {
      logger.error('Record Payment Error:', error);
      throw error;
    }
  }

  async getDebt(debtId) {
    try {
      const debt = await Debt.findOne({ debtId });
      if (!debt) {
        throw new Error('Debt not found');
      }

      const payments = await DebtPayment.find({ debtId: debt._id }).sort({ createdAt: -1 });

      return { debt, payments };
    } catch (error) {
      logger.error('Get Debt Error:', error);
      throw error;
    }
  }

  async getCompanyDebts(companyId, filters = {}, page = 1, limit = 20) {
    try {
      const query = { companyId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.debtorId) {
        query.debtorId = filters.debtorId;
      }

      if (filters.creditorId) {
        query.creditorId = filters.creditorId;
      }

      const skip = (page - 1) * limit;

      const debts = await Debt.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Debt.countDocuments(query);

      const totalOwed = await Debt.aggregate([
        { $match: { ...query, status: { $nin: ['paid', 'written_off'] } } },
        { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
      ]);

      return {
        debts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalOwed: totalOwed[0]?.total || 0,
        },
      };
    } catch (error) {
      logger.error('Get Company Debts Error:', error);
      throw error;
    }
  }

  async getDebtorDebts(debtorId, debtorType, page = 1, limit = 20) {
    try {
      const query = { debtorId, debtorType };

      const skip = (page - 1) * limit;

      const debts = await Debt.find(query)
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Debt.countDocuments(query);

      const summary = await Debt.aggregate([
        { $match: { debtorId, debtorType } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$remainingBalance' },
          },
        },
      ]);

      return {
        debts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary,
      };
    } catch (error) {
      logger.error('Get Debtor Debts Error:', error);
      throw error;
    }
  }

  async markAsOverdue() {
    try {
      const result = await Debt.updateMany(
        {
          status: { $in: ['active', 'partially_paid'] },
          dueDate: { $lt: new Date() },
        },
        {
          $set: { status: 'overdue' },
        }
      );

      logger.info(`Marked ${result.modifiedCount} debts as overdue`);
      return result;
    } catch (error) {
      logger.error('Mark As Overdue Error:', error);
      throw error;
    }
  }

  async writeOffDebt(debtId, notes) {
    try {
      const debt = await Debt.findOne({ debtId });
      if (!debt) {
        throw new Error('Debt not found');
      }

      debt.status = 'written_off';
      debt.notes = notes;
      await debt.save();

      logger.info(`Debt written off: ${debtId}`);
      return debt;
    } catch (error) {
      logger.error('Write Off Debt Error:', error);
      throw error;
    }
  }

  async scheduleReminder(debtId, reminderDate, reminderType, message) {
    try {
      const debt = await Debt.findOne({ debtId });
      if (!debt) {
        throw new Error('Debt not found');
      }

      const reminder = await DebtReminder.create({
        reminderId: uuidv4(),
        debtId: debt._id,
        reminderDate,
        reminderType,
        message,
      });

      logger.info(`Reminder scheduled for debt ${debtId}`);
      return reminder;
    } catch (error) {
      logger.error('Schedule Reminder Error:', error);
      throw error;
    }
  }

  async getOverdueDebts(companyId) {
    try {
      const debts = await Debt.find({
        companyId,
        status: 'overdue',
      }).sort({ dueDate: 1 });

      return debts;
    } catch (error) {
      logger.error('Get Overdue Debts Error:', error);
      throw error;
    }
  }
}

module.exports = new DebtService();
