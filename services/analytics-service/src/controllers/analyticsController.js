const {
  getEventStats,
  getSalesMetrics,
  getProductMetrics,
  getCustomerMetrics,
} = require('../services/analyticsService');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const logger = require('../utils/logger');

exports.trackEvent = async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      companyId: req.user.companyId,
      userId: req.user.userId,
      timestamp: new Date(),
    };

    const event = await AnalyticsEvent.create(eventData);
    logger.info(`Event tracked: ${event.eventType}`);

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    logger.error(`Track event error: ${error.message}`);
    next(error);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const {
      companyId,
      shopId,
      category,
      eventType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

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

    const events = await AnalyticsEvent.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await AnalyticsEvent.countDocuments(query);

    res.json({
      success: true,
      data: events,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get events error: ${error.message}`);
    next(error);
  }
};

exports.getEventStats = async (req, res, next) => {
  try {
    const stats = await getEventStats(req.query);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error(`Get event stats error: ${error.message}`);
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'companyId, startDate, and endDate are required',
      });
    }

    const [salesMetrics, productMetrics, customerMetrics] = await Promise.all([
      getSalesMetrics(companyId, startDate, endDate),
      getProductMetrics(companyId, startDate, endDate),
      getCustomerMetrics(companyId, startDate, endDate),
    ]);

    res.json({
      success: true,
      data: {
        sales: salesMetrics,
        products: productMetrics,
        customers: customerMetrics,
      },
    });
  } catch (error) {
    logger.error(`Get dashboard error: ${error.message}`);
    next(error);
  }
};

exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'companyId, startDate, and endDate are required',
      });
    }

    const metrics = await getSalesMetrics(companyId, startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error(`Get sales analytics error: ${error.message}`);
    next(error);
  }
};

exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'companyId, startDate, and endDate are required',
      });
    }

    const metrics = await getProductMetrics(companyId, startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error(`Get product analytics error: ${error.message}`);
    next(error);
  }
};

exports.getCustomerAnalytics = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'companyId, startDate, and endDate are required',
      });
    }

    const metrics = await getCustomerMetrics(companyId, startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error(`Get customer analytics error: ${error.message}`);
    next(error);
  }
};

exports.getRealTimeMetrics = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const query = {
      companyId,
      timestamp: { $gte: oneHourAgo },
    };

    const activeUsers = await AnalyticsEvent.distinct('userId', query);

    const recentOrders = await AnalyticsEvent.countDocuments({
      ...query,
      eventType: 'order.created',
    });

    const recentRevenue = await AnalyticsEvent.aggregate([
      {
        $match: {
          ...query,
          eventType: 'order.completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$metrics.revenue' } } },
    ]);

    const topPages = await AnalyticsEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$properties.page',
          views: { $sum: 1 },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        activeUsers: activeUsers.length,
        recentOrders,
        recentRevenue: recentRevenue[0]?.total || 0,
        topPages,
      },
    });
  } catch (error) {
    logger.error(`Get real-time metrics error: ${error.message}`);
    next(error);
  }
};
