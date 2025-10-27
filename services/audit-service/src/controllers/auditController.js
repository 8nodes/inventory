const { createAuditLog, getAuditLogs } = require('../services/auditService');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

exports.createLog = async (req, res, next) => {
  try {
    const logData = {
      ...req.body,
      userId: req.user.userId,
      companyId: req.user.companyId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const log = await createAuditLog(logData);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    logger.error(`Create audit log error: ${error.message}`);
    next(error);
  }
};

exports.getLogs = async (req, res, next) => {
  try {
    const result = await getAuditLogs(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`Get audit logs error: ${error.message}`);
    next(error);
  }
};

exports.getLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    logger.error(`Get audit log error: ${error.message}`);
    next(error);
  }
};

exports.getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { userId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get user activity error: ${error.message}`);
    next(error);
  }
};

exports.getResourceHistory = async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const query = {
      'resource.type': resourceType,
      'resource.id': resourceId,
    };

    const logs = await AuditLog.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get resource history error: ${error.message}`);
    next(error);
  }
};

exports.getAuditStats = async (req, res, next) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const query = {};
    if (companyId) query.companyId = companyId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const totalEvents = await AuditLog.countDocuments(query);

    const eventsByCategory = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const eventsBySeverity = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const failedActions = await AuditLog.countDocuments({
      ...query,
      success: false,
    });

    const topUsers = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        totalEvents,
        eventsByCategory,
        eventsBySeverity,
        failedActions,
        topUsers,
      },
    });
  } catch (error) {
    logger.error(`Get audit stats error: ${error.message}`);
    next(error);
  }
};

exports.exportLogs = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const result = await getAuditLogs(req.query);

    if (format === 'csv') {
      const csv = convertToCSV(result.logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      return res.send(csv);
    }

    res.json({ success: true, data: result.logs });
  } catch (error) {
    logger.error(`Export logs error: ${error.message}`);
    next(error);
  }
};

function convertToCSV(logs) {
  const headers = ['Timestamp', 'Event Type', 'Category', 'Action', 'User ID', 'Resource Type', 'Resource ID', 'Severity', 'Success'];
  const rows = logs.map(log => [
    log.timestamp,
    log.eventType,
    log.category,
    log.action,
    log.userId,
    log.resource?.type,
    log.resource?.id,
    log.severity,
    log.success,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
