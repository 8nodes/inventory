const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/alerts', authMiddleware, roleMiddleware(['admin', 'manager']), securityController.getAlerts);
router.get('/alerts/:id', authMiddleware, roleMiddleware(['admin', 'manager']), securityController.getAlertById);
router.patch('/alerts/:id/status', authMiddleware, roleMiddleware(['admin', 'manager']), securityController.updateAlertStatus);
router.patch('/alerts/:id/assign', authMiddleware, roleMiddleware(['admin', 'manager']), securityController.assignAlert);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), securityController.getAlertStats);

module.exports = router;
