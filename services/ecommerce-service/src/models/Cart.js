const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: String,
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
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
  },
  companyId: {
    type: String,
    required: true
  },
  shopId: mongoose.Schema.Types.ObjectId,
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [cartItemSchema],
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  itemCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

cartSchema.pre('save', function(next) {
  this.itemCount = this.items.length;
  this.total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.lastModified = new Date();
  next();
});

cartSchema.methods.addItem = function(item) {
  const existingItem = this.items.find(
    i => i.productId.toString() === item.productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += item.quantity;
    existingItem.subtotal = existingItem.quantity * existingItem.price;
  } else {
    item.subtotal = item.quantity * item.price;
    this.items.push(item);
  }

  return this.save();
};

cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(i => i.productId.toString() === productId.toString());

  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter(i => i.productId.toString() !== productId.toString());
    } else {
      item.quantity = quantity;
      item.subtotal = item.quantity * item.price;
    }
  }

  return this.save();
};

cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(i => i.productId.toString() !== productId.toString());
  return this.save();
};

cartSchema.methods.clear = function() {
  this.items = [];
  return this.save();
};

cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ lastModified: 1 });

module.exports = mongoose.model('Cart', cartSchema);
