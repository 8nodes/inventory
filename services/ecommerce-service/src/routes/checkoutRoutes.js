const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { authenticate } = require('../middleware/auth');

router.post('/initiate', authenticate, checkoutController.initiateCheckout);
router.post('/confirm/:transactionId', authenticate, checkoutController.confirmCheckout);

module.exports = router;
