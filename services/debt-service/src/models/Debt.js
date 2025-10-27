const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  debtId: {
    type: String,
    required: true,
    unique: true,
  },
  companyId: {
    type: String,
    required: true,
  },
  debtorId: {
    type: String,
    required: true,
  },
  debtorType: {
    type: String,
    enum: ['customer', 'company'],
    required: true,
  },
  creditorId: {
    type: String,
    required: true,
  },
  creditorType: {
    type: String,
    enum: ['shop', 'company'],
    required: true,
  },
  relatedOrderId: {
    type: String,
  },
  principalAmount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  remainingBalance: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  status: {
    type: String,
    enum: ['active', 'partially_paid', 'paid', 'overdue', 'written_off', 'disputed'],
    default: 'active',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
  },
  paymentTerms: {
    type: String,
  },
  notes: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

debtSchema.index({ companyId: 1, status: 1 });
debtSchema.index({ debtorId: 1, debtorType: 1 });
debtSchema.index({ creditorId: 1, creditorType: 1 });
debtSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Debt', debtSchema);
