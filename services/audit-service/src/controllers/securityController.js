const SecurityAlert = require('../models/SecurityAlert');
const logger = require('../utils/logger');

exports.getAlerts = async (req, res, next) => {
  try {
    const { companyId, userId, type, severity, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (companyId) query.companyId = companyId;
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const alerts = await SecurityAlert.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate('relatedAuditLogs');

    const count = await SecurityAlert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get alerts error: ${error.message}`);
    next(error);
  }
};

exports.getAlertById = async (req, res, next) => {
  try {
    const alert = await SecurityAlert.findById(req.params.id)
      .populate('relatedAuditLogs');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error(`Get alert error: ${error.message}`);
    next(error);
  }
};

exports.updateAlertStatus = async (req, res, next) => {
  try {
    const { status, action, notes } = req.body;

    const updateData = { status };

    if (status === 'resolved' || status === 'false_positive') {
      updateData.resolution = {
        action,
        notes,
        resolvedBy: req.user.userId,
        resolvedAt: new Date(),
      };
    }

    const alert = await SecurityAlert.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    logger.info(`Alert ${alert._id} updated to status: ${status}`);
    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error(`Update alert status error: ${error.message}`);
    next(error);
  }
};

exports.assignAlert = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;

    const alert = await SecurityAlert.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'investigating' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error(`Assign alert error: ${error.message}`);
    next(error);
  }
};

exports.getAlertStats = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const query = {};
    if (companyId) query.companyId = companyId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const totalAlerts = await SecurityAlert.countDocuments(query);

    const alertsByType = await SecurityAlert.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const alertsBySeverity = await SecurityAlert.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const alertsByStatus = await SecurityAlert.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const criticalOpen = await SecurityAlert.countDocuments({
      ...query,
      severity: 'critical',
      status: { $in: ['open', 'investigating'] },
    });

    res.json({
      success: true,
      data: {
        totalAlerts,
        alertsByType,
        alertsBySeverity,
        alertsByStatus,
        criticalOpen,
      },
    });
  } catch (error) {
    logger.error(`Get alert stats error: ${error.message}`);
    next(error);
  }
};
