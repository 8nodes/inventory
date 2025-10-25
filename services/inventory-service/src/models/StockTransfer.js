const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  sourceWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  destinationWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    notes: String
  }],
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  initiatedBy: {
    type: String,
    required: true
  },
  approvedBy: {
    type: String,
    default: null
  },
  completedBy: {
    type: String,
    default: null
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  shippedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  trackingNumber: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

stockTransferSchema.index({ companyId: 1, status: 1 });
stockTransferSchema.index({ sourceWarehouseId: 1, status: 1 });
stockTransferSchema.index({ destinationWarehouseId: 1, status: 1 });

stockTransferSchema.statics.generateTransferNumber = async function() {
  const count = await this.countDocuments();
  return `TRF-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
};

stockTransferSchema.methods.approve = function(userId) {
  this.status = 'in_transit';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

stockTransferSchema.methods.ship = function(trackingNumber) {
  this.shippedAt = new Date();
  if (trackingNumber) this.trackingNumber = trackingNumber;
  return this.save();
};

stockTransferSchema.methods.complete = function(userId) {
  this.status = 'completed';
  this.completedBy = userId;
  this.completedAt = new Date();
  return this.save();
};

stockTransferSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) this.cancellationReason = reason;
  return this.save();
};

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
