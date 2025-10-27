const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/logs', authMiddleware, auditController.createLog);
router.get('/logs', authMiddleware, auditController.getLogs);
router.get('/logs/:id', authMiddleware, auditController.getLogById);
router.get('/logs/user/:userId', authMiddleware, auditController.getUserActivity);
router.get('/logs/resource/:resourceType/:resourceId', authMiddleware, auditController.getResourceHistory);
router.get('/stats', authMiddleware, roleMiddleware(['admin', 'manager']), auditController.getAuditStats);
router.get('/export', authMiddleware, roleMiddleware(['admin']), auditController.exportLogs);

module.exports = router;
