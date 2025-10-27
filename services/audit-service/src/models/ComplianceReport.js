const mongoose = require('mongoose');

const complianceReportSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['gdpr', 'hipaa', 'sox', 'pci_dss', 'iso27001', 'custom'],
  },
  title: {
    type: String,
    required: true,
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
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending',
  },
  summary: {
    totalEvents: {
      type: Number,
      default: 0,
    },
    totalUsers: {
      type: Number,
      default: 0,
    },
    criticalEvents: {
      type: Number,
      default: 0,
    },
    failedLogins: {
      type: Number,
      default: 0,
    },
    dataExports: {
      type: Number,
      default: 0,
    },
    dataDeletes: {
      type: Number,
      default: 0,
    },
  },
  findings: [{
    category: String,
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    recommendation: String,
    affectedRecords: Number,
  }],
  recommendations: [{
    type: String,
  }],
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  fileUrl: {
    type: String,
  },
  fileFormat: {
    type: String,
    enum: ['pdf', 'csv', 'json', 'xlsx'],
  },
}, {
  timestamps: true,
});

complianceReportSchema.index({ companyId: 1, type: 1, createdAt: -1 });
complianceReportSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

module.exports = mongoose.model('ComplianceReport', complianceReportSchema);
