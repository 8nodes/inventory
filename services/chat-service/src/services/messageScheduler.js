const schedule = require('node-schedule');
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const { logger } = require('../utils/logger');
const { publishEvent } = require('../config/rabbitmq');

const startScheduler = () => {
  schedule.scheduleJob('*/1 * * * *', async () => {
    try {
      const now = new Date();

      const scheduledMessages = await ChatMessage.find({
        isScheduled: true,
        scheduledFor: { $lte: now }
      });

      for (const message of scheduledMessages) {
        message.isScheduled = false;
        await message.save();

        await ChatRoom.findByIdAndUpdate(message.roomId, { updatedAt: new Date() });

        await publishEvent('message.sent', {
          messageId: message._id,
          roomId: message.roomId,
          senderId: message.senderId
        });

        logger.info(`Scheduled message sent: ${message._id}`);
      }
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  });

  schedule.scheduleJob('*/5 * * * *', async () => {
    try {
      const now = new Date();

      const messagesToDelete = await ChatMessage.find({
        autoDeleteAt: { $lte: now },
        isDeleted: false
      });

      for (const message of messagesToDelete) {
        message.isDeleted = true;
        message.deletedAt = now;
        await message.save();

        logger.info(`Auto-deleted message: ${message._id}`);
      }
    } catch (error) {
      logger.error('Error auto-deleting messages:', error);
    }
  });

  logger.info('Message scheduler started');
};

module.exports = { startScheduler };
