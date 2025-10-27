const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerType: {
    type: String,
    enum: ['shop', 'company'],
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  pendingBalance: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  totalWithdrawals: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active',
  },
}, {
  timestamps: true,
});

walletSchema.index({ ownerId: 1, ownerType: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
