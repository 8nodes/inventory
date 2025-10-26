const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: String,
  productImage: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  addressLine1: {
    type: String,
    required: true
  },
  addressLine2: String,
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'USA'
  }
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: String,
  updatedBy: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    index: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  shopId: mongoose.Schema.Types.ObjectId,
  items: [orderItemSchema],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  billingAddress: addressSchema,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash_on_delivery', 'bank_transfer'],
    required: true
  },
  paymentId: String,
  trackingNumber: String,
  shippingCarrier: String,
  estimatedDeliveryDate: Date,
  deliveredAt: Date,
  notes: String,
  customerNotes: String,
  statusHistory: [statusHistorySchema],
  cancellationReason: String,
  returnReason: String,
  refundAmount: Number,
  refundedAt: Date
}, {
  timestamps: true
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ companyId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
  }

  if (!this.billingAddress) {
    this.billingAddress = this.shippingAddress;
  }

  next();
});

orderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    }
  });

  const sequence = (count + 1).toString().padStart(4, '0');

  return `ORD-${year}${month}${day}-${sequence}`;
};

orderSchema.methods.updateStatus = async function(newStatus, note, updatedBy) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || `Status updated to ${newStatus}`,
    updatedBy
  });
  return await this.save();
};

orderSchema.methods.cancel = async function(reason, userId) {
  if (!['pending', 'confirmed'].includes(this.status)) {
    throw new Error('Order cannot be cancelled in current status');
  }

  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    note: `Order cancelled. Reason: ${reason}`,
    updatedBy: userId
  });

  return await this.save();
};

orderSchema.methods.markAsDelivered = async function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  this.statusHistory.push({
    status: 'delivered',
    timestamp: new Date(),
    note: 'Order delivered to customer'
  });

  return await this.save();
};

module.exports = mongoose.model('Order', orderSchema);
