const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const pushService = require('../services/pushService');
const { createLogger } = require('../../../../shared/utils/logger');

const logger = createLogger('notification-controller');

exports.sendNotification = async (req, res) => {
  try {
    const {
      userId,
      type,
      priority,
      channel,
      subject,
      content,
      recipient,
      scheduledFor,
      metadata,
      relatedEntity
    } = req.body;

    const notification = new Notification({
      userId,
      type,
      priority: priority || 'normal',
      channel: channel || 'push',
      subject,
      content,
      recipient,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      status: scheduledFor ? 'scheduled' : 'pending',
      metadata,
      relatedEntity
    });

    await notification.save();

    if (!scheduledFor) {
      await processNotification(notification);
    }

    res.status(201).json({
      success: true,
      message: scheduledFor ? 'Notification scheduled successfully' : 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

exports.sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, type, priority, channel, subject, content, metadata } = req.body;

    const notifications = userIds.map(userId => ({
      userId,
      type,
      priority: priority || 'normal',
      channel: channel || 'push',
      subject,
      content,
      status: 'pending',
      metadata
    }));

    const result = await Notification.insertMany(notifications);

    result.forEach(async (notification) => {
      await processNotification(notification);
    });

    res.status(201).json({
      success: true,
      message: `${result.length} notifications sent successfully`,
      data: { count: result.length }
    });
  } catch (error) {
    logger.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications',
      error: error.message
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, type, priority, page = 1, limit = 20 } = req.query;

    const query = { userId };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

async function processNotification(notification) {
  try {
    notification.status = 'sending';
    notification.attempts += 1;
    await notification.save();

    let result = { success: false };

    switch (notification.type) {
      case 'email':
        result = await emailService.sendEmail({
          to: notification.recipient.email,
          subject: notification.subject,
          html: notification.content
        });
        break;

      case 'sms':
        result = await smsService.sendSMS({
          to: notification.recipient.phone,
          message: notification.content
        });
        break;

      case 'push':
        if (notification.recipient.deviceTokens && notification.recipient.deviceTokens.length > 0) {
          result = await pushService.sendPushNotification({
            tokens: notification.recipient.deviceTokens,
            title: notification.subject,
            body: notification.content,
            data: notification.metadata
          });
        }
        break;
    }

    if (result.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = notification.attempts >= notification.maxAttempts ? 'failed' : 'pending';
      notification.failureReason = result.error || 'Unknown error';
    }

    await notification.save();
  } catch (error) {
    logger.error('Process notification error:', error);

    notification.status = notification.attempts >= notification.maxAttempts ? 'failed' : 'pending';
    notification.failureReason = error.message;
    await notification.save();
  }
}

module.exports.processNotification = processNotification;
