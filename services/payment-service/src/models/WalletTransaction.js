const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  category: {
    type: String,
    enum: ['payment_received', 'withdrawal', 'refund', 'fee', 'adjustment'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceBefore: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  relatedPaymentId: {
    type: String,
  },
  description: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ transactionId: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
