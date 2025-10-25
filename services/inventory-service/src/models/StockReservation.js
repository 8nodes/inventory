const mongoose = require('mongoose');

const stockReservationSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  variationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  fulfilledAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

stockReservationSchema.index({ status: 1, expiresAt: 1 });
stockReservationSchema.index({ companyId: 1, productId: 1, status: 1 });

stockReservationSchema.statics.getActiveReservations = function(productId) {
  return this.find({
    productId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

stockReservationSchema.statics.getTotalReservedQuantity = async function(productId, warehouseId = null) {
  const query = {
    productId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  };

  if (warehouseId) {
    query.warehouseId = warehouseId;
  }

  const result = await this.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]);

  return result.length > 0 ? result[0].total : 0;
};

stockReservationSchema.methods.fulfill = function() {
  this.status = 'fulfilled';
  this.fulfilledAt = new Date();
  return this.save();
};

stockReservationSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) this.reason = reason;
  return this.save();
};

stockReservationSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

module.exports = mongoose.model('StockReservation', stockReservationSchema);
