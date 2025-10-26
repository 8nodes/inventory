const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.post('/:id/cancel', orderController.cancelOrder);
router.get('/:id/tracking', orderController.trackOrder);
router.post('/:id/tracking', orderController.addTrackingInfo);

module.exports = router;
