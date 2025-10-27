const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/reports', authMiddleware, roleMiddleware(['admin']), complianceController.generateReport);
router.get('/reports', authMiddleware, roleMiddleware(['admin', 'manager']), complianceController.getReports);
router.get('/reports/:id', authMiddleware, roleMiddleware(['admin', 'manager']), complianceController.getReportById);
router.delete('/reports/:id', authMiddleware, roleMiddleware(['admin']), complianceController.deleteReport);

module.exports = router;
