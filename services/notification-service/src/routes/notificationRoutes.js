const express = require('express');
const { body, query } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../../../../shared/middleware/authMiddleware');

const router = express.Router();

router.post('/',
  authMiddleware,
  [
    body('userId').notEmpty(),
    body('type').isIn(['email', 'sms', 'push', 'in_app']),
    body('content').notEmpty()
  ],
  notificationController.sendNotification
);

router.post('/bulk',
  authMiddleware,
  [
    body('userIds').isArray({ min: 1 }),
    body('type').isIn(['email', 'sms', 'push', 'in_app']),
    body('content').notEmpty()
  ],
  notificationController.sendBulkNotifications
);

router.get('/',
  authMiddleware,
  notificationController.getNotifications
);

router.get('/:id',
  authMiddleware,
  notificationController.getNotificationById
);

router.patch('/:id/read',
  authMiddleware,
  notificationController.markAsRead
);

router.delete('/:id',
  authMiddleware,
  notificationController.deleteNotification
);

module.exports = router;
