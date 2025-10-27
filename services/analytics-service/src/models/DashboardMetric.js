const mongoose = require('mongoose');

const dashboardMetricSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  metricType: {
    type: String,
    required: true,
    enum: [
      'total_revenue',
      'total_orders',
      'avg_order_value',
      'conversion_rate',
      'customer_count',
      'product_views',
      'cart_abandonment',
      'inventory_turnover',
      'top_products',
      'top_categories',
      'sales_by_region',
      'customer_retention',
    ],
    index: true,
  },
  period: {
    type: String,
    required: true,
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  change: {
    absolute: Number,
    percentage: Number,
  },
  breakdown: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

dashboardMetricSchema.index({ companyId: 1, metricType: 1, period: 1, date: -1 });
dashboardMetricSchema.index({ shopId: 1, metricType: 1, date: -1 });

module.exports = mongoose.model('DashboardMetric', dashboardMetricSchema);
