const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

router.post('/:companyId/upgrade', authenticate, subscriptionController.upgradeSubscription);
router.post('/:companyId/confirm/:transactionId', authenticate, subscriptionController.confirmSubscriptionPayment);
router.post('/:companyId/cancel', authenticate, subscriptionController.cancelSubscription);

module.exports = router;
