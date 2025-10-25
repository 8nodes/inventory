const mongoose = require('mongoose');

const companyUserSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'member'],
    default: 'member'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_subscription',
      'manage_settings',
      'view_reports',
      'manage_inventory',
      'manage_chat',
      'export_data'
    ]
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

companyUserSchema.index({ companyId: 1, userId: 1 }, { unique: true });
companyUserSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('CompanyUser', companyUserSchema);
