const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['sales', 'inventory', 'customer', 'financial', 'performance', 'custom'],
    index: true,
  },
  description: {
    type: String,
  },
  period: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  filters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  visualizations: [{
    type: {
      type: String,
      enum: ['line', 'bar', 'pie', 'table', 'metric'],
    },
    title: String,
    data: mongoose.Schema.Types.Mixed,
    config: mongoose.Schema.Types.Mixed,
  }],
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending',
  },
  scheduled: {
    enabled: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    },
    recipients: [String],
    nextRun: Date,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  fileUrl: {
    type: String,
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'xlsx', 'json'],
  },
}, {
  timestamps: true,
});

reportSchema.index({ companyId: 1, type: 1, createdAt: -1 });
reportSchema.index({ 'scheduled.enabled': 1, 'scheduled.nextRun': 1 });

module.exports = mongoose.model('Report', reportSchema);
