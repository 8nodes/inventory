const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, roleMiddleware(['admin', 'manager']), reportController.generateReport);
router.get('/', authMiddleware, reportController.getReports);
router.get('/:id', authMiddleware, reportController.getReportById);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), reportController.deleteReport);
router.post('/:id/schedule', authMiddleware, roleMiddleware(['admin']), reportController.scheduleReport);

module.exports = router;
