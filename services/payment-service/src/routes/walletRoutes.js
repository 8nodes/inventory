const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.get('/:ownerType/:ownerId/balance', authenticate, walletController.getWalletBalance);
router.get('/:walletId/transactions', authenticate, walletController.getWalletTransactions);
router.post('/:ownerId/withdraw', authenticate, walletController.requestWithdrawal);
router.post('/withdrawals/:withdrawalId/process', authenticate, walletController.processWithdrawal);
router.post('/withdrawals/:withdrawalId/cancel', authenticate, walletController.cancelWithdrawal);
router.get('/:ownerId/withdrawals', authenticate, walletController.getWithdrawals);

module.exports = router;
