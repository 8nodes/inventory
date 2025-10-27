const debtService = require('../services/debtService');
const logger = require('../utils/logger');
const { publishEvent } = require('../config/rabbitmq');

exports.createDebt = async (req, res, next) => {
  try {
    const debtData = req.body;

    const debt = await debtService.createDebt(debtData);

    await publishEvent('debt.created', {
      debtId: debt.debtId,
      companyId: debt.companyId,
      debtorId: debt.debtorId,
      amount: debt.totalAmount,
    });

    res.status(201).json({
      success: true,
      message: 'Debt created',
      data: debt,
    });
  } catch (error) {
    logger.error('Create Debt Error:', error);
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { debtId } = req.params;
    const paymentData = req.body;

    const result = await debtService.recordPayment(debtId, paymentData);

    await publishEvent('debt.payment_recorded', {
      debtId: result.debt.debtId,
      paymentId: result.payment.paymentId,
      amount: result.payment.amount,
      remainingBalance: result.debt.remainingBalance,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded',
      data: result,
    });
  } catch (error) {
    logger.error('Record Payment Error:', error);
    next(error);
  }
};

exports.getDebt = async (req, res, next) => {
  try {
    const { debtId } = req.params;

    const result = await debtService.getDebt(debtId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get Debt Error:', error);
    next(error);
  }
};

exports.getCompanyDebts = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { status, debtorId, creditorId, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (debtorId) filters.debtorId = debtorId;
    if (creditorId) filters.creditorId = creditorId;

    const result = await debtService.getCompanyDebts(companyId, filters, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get Company Debts Error:', error);
    next(error);
  }
};

exports.getDebtorDebts = async (req, res, next) => {
  try {
    const { debtorId, debtorType } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await debtService.getDebtorDebts(debtorId, debtorType, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get Debtor Debts Error:', error);
    next(error);
  }
};

exports.writeOffDebt = async (req, res, next) => {
  try {
    const { debtId } = req.params;
    const { notes } = req.body;

    const debt = await debtService.writeOffDebt(debtId, notes);

    await publishEvent('debt.written_off', {
      debtId: debt.debtId,
      companyId: debt.companyId,
      amount: debt.remainingBalance,
    });

    res.json({
      success: true,
      message: 'Debt written off',
      data: debt,
    });
  } catch (error) {
    logger.error('Write Off Debt Error:', error);
    next(error);
  }
};

exports.scheduleReminder = async (req, res, next) => {
  try {
    const { debtId } = req.params;
    const { reminderDate, reminderType, message } = req.body;

    const reminder = await debtService.scheduleReminder(debtId, reminderDate, reminderType, message);

    res.status(201).json({
      success: true,
      message: 'Reminder scheduled',
      data: reminder,
    });
  } catch (error) {
    logger.error('Schedule Reminder Error:', error);
    next(error);
  }
};

exports.getOverdueDebts = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const debts = await debtService.getOverdueDebts(companyId);

    res.json({
      success: true,
      data: debts,
    });
  } catch (error) {
    logger.error('Get Overdue Debts Error:', error);
    next(error);
  }
};
