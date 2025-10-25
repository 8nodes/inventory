const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subscriptionTier: {
    type: String,
    enum: ['base', 'pro', 'enterprise'],
    default: 'base'
  },
  subscriptionType: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial', 'cancelled'],
    default: 'trial'
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: {
    type: Date,
    required: true
  },
  maxUsers: {
    type: Number,
    default: 5
  },
  logoUrl: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  phone: {
    type: String
  },
  website: {
    type: String
  },
  industry: {
    type: String
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

companySchema.index({ email: 1 }, { unique: true });
companySchema.index({ subscriptionStatus: 1 });
companySchema.index({ subscriptionEndDate: 1 });

module.exports = mongoose.model('Company', companySchema);
