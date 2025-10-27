const mongoose = require('mongoose');

const debtReminderSchema = new mongoose.Schema({
  reminderId: {
    type: String,
    required: true,
    unique: true,
  },
  debtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debt',
    required: true,
  },
  reminderDate: {
    type: Date,
    required: true,
  },
  reminderType: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  message: {
    type: String,
  },
  sentAt: {
    type: Date,
  },
  errorMessage: {
    type: String,
  },
}, {
  timestamps: true,
});

debtReminderSchema.index({ debtId: 1 });
debtReminderSchema.index({ reminderDate: 1, status: 1 });

module.exports = mongoose.model('DebtReminder', debtReminderSchema);
