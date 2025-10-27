const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/initiate', authenticate, paymentController.initiatePayment);
router.post('/:transactionId/confirm', authenticate, paymentController.confirmPayment);
router.get('/:transactionId/status', authenticate, paymentController.getPaymentStatus);
router.post('/:transactionId/refund', authenticate, paymentController.refundPayment);
router.get('/user/payments', authenticate, paymentController.getUserPayments);
router.get('/shop/:shopId/payments', authenticate, paymentController.getShopPayments);
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), paymentController.handleStripeWebhook);

module.exports = router;
