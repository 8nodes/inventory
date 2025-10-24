const { emitToUser, broadcastToAll } = require('../socket');
const { createLogger } = require('../../../../shared/utils/logger');

const logger = createLogger('notification-handler');

async function handleNotificationEvent(io, event) {
  try {
    const { userId, type, priority, subject, content, metadata } = event;

    logger.info(`Handling notification for user: ${userId}`);

    const notificationData = {
      type,
      priority,
      subject,
      content,
      metadata,
      timestamp: new Date().toISOString()
    };

    if (userId) {
      emitToUser(io, userId, 'notification:new', notificationData);
    } else {
      broadcastToAll(io, 'notification:broadcast', notificationData);
    }

    logger.info(`Notification delivered successfully`);
  } catch (error) {
    logger.error('Error handling notification event:', error);
  }
}

async function handleSystemAnnouncement(io, event) {
  try {
    const { title, message, priority, targetRole } = event;

    logger.info(`Broadcasting system announcement: ${title}`);

    const announcementData = {
      title,
      message,
      priority: priority || 'normal',
      type: 'system_announcement',
      timestamp: new Date().toISOString()
    };

    if (targetRole) {
      io.to(targetRole).emit('announcement:new', announcementData);
    } else {
      broadcastToAll(io, 'announcement:new', announcementData);
    }

    logger.info(`System announcement broadcast complete: ${title}`);
  } catch (error) {
    logger.error('Error handling system announcement:', error);
  }
}

module.exports = {
  handleNotificationEvent,
  handleSystemAnnouncement
};
