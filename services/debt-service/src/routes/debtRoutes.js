const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, debtController.createDebt);
router.post('/:debtId/payments', authenticate, debtController.recordPayment);
router.get('/:debtId', authenticate, debtController.getDebt);
router.get('/company/:companyId', authenticate, debtController.getCompanyDebts);
router.get('/debtor/:debtorType/:debtorId', authenticate, debtController.getDebtorDebts);
router.post('/:debtId/write-off', authenticate, debtController.writeOffDebt);
router.post('/:debtId/reminders', authenticate, debtController.scheduleReminder);
router.get('/company/:companyId/overdue', authenticate, debtController.getOverdueDebts);

module.exports = router;
