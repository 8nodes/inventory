const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'access', 'export', 'import', 'other'],
  },
  category: {
    type: String,
    required: true,
    enum: ['auth', 'user', 'product', 'order', 'inventory', 'shop', 'payment', 'system', 'security'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  resource: {
    type: {
      type: String,
      required: true,
    },
    id: mongoose.Schema.Types.Mixed,
    name: String,
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  request: {
    method: String,
    url: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
  },
  response: {
    statusCode: Number,
    message: String,
  },
  ipAddress: {
    type: String,
    index: true,
  },
  userAgent: String,
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true,
  },
  success: {
    type: Boolean,
    default: true,
  },
  error: {
    message: String,
    stack: String,
  },
  duration: {
    type: Number,
  },
  tags: [{
    type: String,
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
