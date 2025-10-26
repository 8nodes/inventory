const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: Number,
  reason: {
    type: String,
    required: true
  },
  condition: {
    type: String,
    enum: ['unopened', 'opened', 'defective', 'damaged'],
    required: true
  }
});

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: String,
  customerId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  items: [returnItemSchema],
  reason: {
    type: String,
    required: true
  },
  detailedReason: String,
  images: [String],
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'received', 'inspected', 'refunded', 'completed'],
    default: 'requested',
    index: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundMethod: {
    type: String,
    enum: ['original_payment', 'store_credit', 'exchange'],
    default: 'original_payment'
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  trackingNumber: String,
  receivedAt: Date,
  inspectedAt: Date,
  refundedAt: Date,
  notes: String,
  adminNotes: String,
  approvedBy: String,
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

returnSchema.index({ returnNumber: 1 });
returnSchema.index({ orderId: 1 });
returnSchema.index({ customerId: 1, createdAt: -1 });
returnSchema.index({ status: 1 });

returnSchema.statics.generateReturnNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
      $lt: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }
  });

  const sequence = (count + 1).toString().padStart(4, '0');

  return `RET-${year}${month}-${sequence}`;
};

returnSchema.methods.approve = async function(approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  if (notes) this.adminNotes = notes;
  return await this.save();
};

returnSchema.methods.reject = async function(reason, rejectedBy) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Return', returnSchema);
