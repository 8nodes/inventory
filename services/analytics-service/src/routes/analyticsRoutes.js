const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/events', authMiddleware, analyticsController.trackEvent);
router.get('/events', authMiddleware, analyticsController.getEvents);
router.get('/events/stats', authMiddleware, analyticsController.getEventStats);
router.get('/dashboard', authMiddleware, analyticsController.getDashboard);
router.get('/sales', authMiddleware, roleMiddleware(['admin', 'manager']), analyticsController.getSalesAnalytics);
router.get('/products', authMiddleware, analyticsController.getProductAnalytics);
router.get('/customers', authMiddleware, roleMiddleware(['admin', 'manager']), analyticsController.getCustomerAnalytics);
router.get('/realtime', authMiddleware, analyticsController.getRealTimeMetrics);

module.exports = router;
