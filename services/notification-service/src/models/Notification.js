const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    required: true
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'normal', 'low'],
    default: 'normal',
    index: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'all'],
    default: 'push'
  },
  subject: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationTemplate'
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  recipient: {
    email: String,
    phone: String,
    deviceTokens: [String]
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sending', 'sent', 'failed', 'delivered'],
    default: 'pending',
    index: true
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failureReason: String,
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['order', 'product', 'payment', 'user', 'company', 'shop', 'inventory']
    },
    id: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

module.exports = mongoose.model('Notification', notificationSchema);
