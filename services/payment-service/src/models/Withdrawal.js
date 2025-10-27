const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: {
    type: String,
    required: true,
    unique: true,
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  ownerId: {
    type: String,
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
  withdrawalMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'paypal'],
    required: true,
  },
  accountDetails: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  processedAt: {
    type: Date,
  },
  paymentTransactionId: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

withdrawalSchema.index({ walletId: 1, createdAt: -1 });
withdrawalSchema.index({ ownerId: 1 });
withdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
