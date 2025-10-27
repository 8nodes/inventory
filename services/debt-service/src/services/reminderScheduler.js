const schedule = require('node-schedule');
const DebtReminder = require('../models/DebtReminder');
const Debt = require('../models/Debt');
const debtService = require('./debtService');
const logger = require('../utils/logger');

class ReminderScheduler {
  init() {
    schedule.scheduleJob('0 */6 * * *', async () => {
      await this.checkAndSendReminders();
    });

    schedule.scheduleJob('0 2 * * *', async () => {
      await debtService.markAsOverdue();
    });

    logger.info('Reminder scheduler initialized');
  }

  async checkAndSendReminders() {
    try {
      const now = new Date();

      const reminders = await DebtReminder.find({
        status: 'pending',
        reminderDate: { $lte: now },
      }).populate('debtId');

      logger.info(`Found ${reminders.length} reminders to send`);

      for (const reminder of reminders) {
        try {
          await this.sendReminder(reminder);
          reminder.status = 'sent';
          reminder.sentAt = new Date();
          await reminder.save();
        } catch (error) {
          logger.error(`Failed to send reminder ${reminder.reminderId}:`, error);
          reminder.status = 'failed';
          reminder.errorMessage = error.message;
          await reminder.save();
        }
      }
    } catch (error) {
      logger.error('Check And Send Reminders Error:', error);
    }
  }

  async sendReminder(reminder) {
    logger.info(`Sending reminder ${reminder.reminderId} via ${reminder.reminderType}`);
  }
}

module.exports = new ReminderScheduler();
