const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  orderId: {
    type: String,
  },
  shopId: {
    type: String,
  },
  companyId: {
    type: String,
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
    enum: ['stripe', 'paypal', 'mtn_momo', 'airtel_money'],
    required: true,
  },
  paymentType: {
    type: String,
    enum: ['order', 'subscription', 'wallet_topup', 'withdrawal'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
  },
  providerTransactionId: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  errorMessage: {
    type: String,
  },
  refundedAmount: {
    type: Number,
    default: 0,
  },
  processingFee: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
  },
}, {
  timestamps: true,
});

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ shopId: 1 });
paymentSchema.index({ companyId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
