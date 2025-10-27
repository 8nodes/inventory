const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['sales', 'inventory', 'customer', 'product', 'traffic', 'engagement'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  sessionId: {
    type: String,
    index: true,
  },
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  metrics: {
    revenue: Number,
    quantity: Number,
    value: Number,
    duration: Number,
  },
  dimensions: {
    source: String,
    medium: String,
    campaign: String,
    device: String,
    browser: String,
    os: String,
    country: String,
    city: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
  timeseries: {
    timeField: 'timestamp',
    metaField: 'companyId',
    granularity: 'hours',
  },
});

analyticsEventSchema.index({ companyId: 1, timestamp: -1 });
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ category: 1, timestamp: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
