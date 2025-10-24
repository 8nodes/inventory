const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    required: true
  },
  subject: {
    type: String,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    default: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['auth', 'order', 'payment', 'inventory', 'marketing', 'system'],
    default: 'system'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

notificationTemplateSchema.methods.render = function(data) {
  let renderedSubject = this.subject || '';
  let renderedBody = this.body;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    renderedSubject = renderedSubject.replace(regex, data[key] || '');
    renderedBody = renderedBody.replace(regex, data[key] || '');
  });

  return {
    subject: renderedSubject,
    body: renderedBody
  };
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
