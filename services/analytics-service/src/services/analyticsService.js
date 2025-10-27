const AnalyticsEvent = require('../models/AnalyticsEvent');
const DashboardMetric = require('../models/DashboardMetric');
const logger = require('../utils/logger');

const eventCategoryMap = {
  'order.created': { category: 'sales' },
  'order.completed': { category: 'sales' },
  'product.viewed': { category: 'product' },
  'product.created': { category: 'product' },
  'cart.added': { category: 'engagement' },
  'inventory.adjusted': { category: 'inventory' },
  'user.registered': { category: 'customer' },
};

exports.processAnalyticsEvent = async (routingKey, event) => {
  try {
    const mapping = eventCategoryMap[routingKey] || { category: 'engagement' };

    const analyticsEvent = new AnalyticsEvent({
      companyId: event.companyId,
      shopId: event.shopId,
      eventType: routingKey,
      category: mapping.category,
      userId: event.userId,
      sessionId: event.sessionId,
      properties: event.properties || {},
      metrics: {
        revenue: event.revenue || event.total || 0,
        quantity: event.quantity || 0,
        value: event.value || 0,
      },
      dimensions: event.dimensions || {},
      timestamp: event.timestamp || new Date(),
    });

    await analyticsEvent.save();
    logger.info(`Analytics event tracked: ${routingKey}`);

    if (routingKey === 'order.completed') {
      await updateRevenueMetrics(event);
    }
  } catch (error) {
    logger.error(`Error processing analytics event: ${error.message}`);
  }
};

async function updateRevenueMetrics(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const metric = await DashboardMetric.findOne({
    companyId: event.companyId,
    metricType: 'total_revenue',
    period: 'day',
    date: today,
  });

  if (metric) {
    metric.value = (parseFloat(metric.value) || 0) + (event.total || 0);
    await metric.save();
  } else {
    await DashboardMetric.create({
      companyId: event.companyId,
      shopId: event.shopId,
      metricType: 'total_revenue',
      period: 'day',
      date: today,
      value: event.total || 0,
    });
  }
}

exports.getEventStats = async (filters) => {
  try {
    const {
      companyId,
      shopId,
      category,
      eventType,
      startDate,
      endDate,
    } = filters;

    const query = {};
    if (companyId) query.companyId = companyId;
    if (shopId) query.shopId = shopId;
    if (category) query.category = category;
    if (eventType) query.eventType = eventType;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const totalEvents = await AnalyticsEvent.countDocuments(query);

    const eventsByType = await AnalyticsEvent.aggregate([
      { $match: query },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const eventsByCategory = await AnalyticsEvent.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    return {
      totalEvents,
      eventsByType,
      eventsByCategory,
    };
  } catch (error) {
    logger.error(`Error getting event stats: ${error.message}`);
    throw error;
  }
};

exports.getSalesMetrics = async (companyId, startDate, endDate) => {
  try {
    const query = {
      companyId,
      category: 'sales',
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalRevenue = await AnalyticsEvent.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$metrics.revenue' } } },
    ]);

    const totalOrders = await AnalyticsEvent.countDocuments({
      ...query,
      eventType: 'order.completed',
    });

    const avgOrderValue = totalOrders > 0
      ? (totalRevenue[0]?.total || 0) / totalOrders
      : 0;

    const salesByDay = await AnalyticsEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          revenue: { $sum: '$metrics.revenue' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      avgOrderValue,
      salesByDay,
    };
  } catch (error) {
    logger.error(`Error getting sales metrics: ${error.message}`);
    throw error;
  }
};

exports.getProductMetrics = async (companyId, startDate, endDate) => {
  try {
    const query = {
      companyId,
      category: 'product',
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalViews = await AnalyticsEvent.countDocuments({
      ...query,
      eventType: 'product.viewed',
    });

    const topProducts = await AnalyticsEvent.aggregate([
      { $match: { ...query, eventType: 'product.viewed' } },
      {
        $group: {
          _id: '$properties.productId',
          views: { $sum: 1 },
          name: { $first: '$properties.productName' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    return {
      totalViews,
      topProducts,
    };
  } catch (error) {
    logger.error(`Error getting product metrics: ${error.message}`);
    throw error;
  }
};

exports.getCustomerMetrics = async (companyId, startDate, endDate) => {
  try {
    const query = {
      companyId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalCustomers = await AnalyticsEvent.distinct('userId', query);

    const newCustomers = await AnalyticsEvent.countDocuments({
      companyId,
      eventType: 'user.registered',
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });

    const activeCustomers = await AnalyticsEvent.aggregate([
      { $match: query },
      { $group: { _id: '$userId' } },
      { $count: 'total' },
    ]);

    return {
      totalCustomers: totalCustomers.length,
      newCustomers,
      activeCustomers: activeCustomers[0]?.total || 0,
    };
  } catch (error) {
    logger.error(`Error getting customer metrics: ${error.message}`);
    throw error;
  }
};
