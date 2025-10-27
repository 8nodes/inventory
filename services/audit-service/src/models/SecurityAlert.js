const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'failed_login',
      'suspicious_activity',
      'unusual_access',
      'data_breach',
      'unauthorized_access',
      'permission_escalation',
      'mass_deletion',
      'mass_export',
      'rate_limit_exceeded',
      'geo_anomaly',
      'time_anomaly',
      'other',
    ],
    index: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  location: {
    country: String,
    city: String,
  },
  relatedAuditLogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditLog',
  }],
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive', 'ignored'],
    default: 'open',
    index: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
  },
  resolution: {
    action: String,
    notes: String,
    resolvedBy: mongoose.Schema.Types.ObjectId,
    resolvedAt: Date,
  },
  notifications: [{
    method: {
      type: String,
      enum: ['email', 'sms', 'push', 'slack', 'webhook'],
    },
    recipient: String,
    sentAt: Date,
    delivered: Boolean,
  }],
  automated: {
    type: Boolean,
    default: true,
  },
  detectionRule: {
    type: String,
  },
}, {
  timestamps: true,
});

securityAlertSchema.index({ companyId: 1, severity: 1, status: 1 });
securityAlertSchema.index({ type: 1, createdAt: -1 });
securityAlertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
