const mongoose = require('mongoose');

const debtPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
  },
  debtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debt',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'card', 'other'],
    required: true,
  },
  transactionReference: {
    type: String,
  },
  paidBy: {
    type: String,
    required: true,
  },
  receivedBy: {
    type: String,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
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

debtPaymentSchema.index({ debtId: 1, createdAt: -1 });
debtPaymentSchema.index({ paymentId: 1 });

module.exports = mongoose.model('DebtPayment', debtPaymentSchema);
