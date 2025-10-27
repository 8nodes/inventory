const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
  },
  banner: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending',
  },
  type: {
    type: String,
    enum: ['physical', 'digital', 'hybrid'],
    default: 'hybrid',
  },
  settings: {
    currency: {
      type: String,
      default: 'USD',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    language: {
      type: String,
      default: 'en',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    shippingEnabled: {
      type: Boolean,
      default: true,
    },
    paymentMethods: [{
      type: String,
      enum: ['credit_card', 'paypal', 'stripe', 'bank_transfer', 'cash_on_delivery'],
    }],
    autoApproveProducts: {
      type: Boolean,
      default: false,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxOrderAmount: {
      type: Number,
    },
  },
  contact: {
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    website: String,
  },
  businessHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    open: String,
    close: String,
    closed: {
      type: Boolean,
      default: false,
    },
  }],
  social: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },
  metrics: {
    totalProducts: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  verification: {
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    documents: [{
      type: String,
      url: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
    }],
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  staff: [{
    userId: mongoose.Schema.Types.ObjectId,
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'staff'],
    },
    permissions: [String],
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  features: {
    analytics: {
      type: Boolean,
      default: true,
    },
    inventory: {
      type: Boolean,
      default: true,
    },
    multiWarehouse: {
      type: Boolean,
      default: false,
    },
    pos: {
      type: Boolean,
      default: false,
    },
    customDomain: {
      type: Boolean,
      default: false,
    },
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

shopSchema.index({ companyId: 1, status: 1 });
shopSchema.index({ slug: 1 });
shopSchema.index({ 'contact.email': 1 });

module.exports = mongoose.model('Shop', shopSchema);
