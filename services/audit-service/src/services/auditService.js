const AuditLog = require('../models/AuditLog');
const SecurityAlert = require('../models/SecurityAlert');
const logger = require('../utils/logger');

const eventCategoryMap = {
  'user.login': { category: 'auth', action: 'login' },
  'user.logout': { category: 'auth', action: 'logout' },
  'user.created': { category: 'user', action: 'create' },
  'user.updated': { category: 'user', action: 'update' },
  'user.deleted': { category: 'user', action: 'delete' },
  'product.created': { category: 'product', action: 'create' },
  'product.updated': { category: 'product', action: 'update' },
  'product.deleted': { category: 'product', action: 'delete' },
  'order.created': { category: 'order', action: 'create' },
  'order.updated': { category: 'order', action: 'update' },
  'order.cancelled': { category: 'order', action: 'update' },
  'inventory.adjusted': { category: 'inventory', action: 'update' },
  'inventory.transferred': { category: 'inventory', action: 'update' },
  'shop.created': { category: 'shop', action: 'create' },
  'shop.updated': { category: 'shop', action: 'update' },
  'shop.deleted': { category: 'shop', action: 'delete' },
};

exports.processAuditEvent = async (routingKey, event) => {
  try {
    const mapping = eventCategoryMap[routingKey] || {
      category: 'system',
      action: 'other',
    };

    const auditLog = new AuditLog({
      eventType: routingKey,
      action: mapping.action,
      category: mapping.category,
      userId: event.userId,
      companyId: event.companyId,
      resource: {
        type: routingKey.split('.')[0],
        id: event.resourceId || event.orderId || event.productId || event.shopId,
        name: event.resourceName || event.name,
      },
      changes: event.changes,
      metadata: event.metadata || {},
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      severity: determineSeverity(routingKey, event),
      success: event.success !== false,
      timestamp: event.timestamp || new Date(),
    });

    await auditLog.save();
    logger.info(`Audit log created for event: ${routingKey}`);

    await checkForSecurityThreats(auditLog);
  } catch (error) {
    logger.error(`Error processing audit event: ${error.message}`);
  }
};

function determineSeverity(routingKey, event) {
  if (routingKey.includes('delete') || routingKey.includes('cancelled')) {
    return 'medium';
  }
  if (routingKey.includes('login') && event.success === false) {
    return 'high';
  }
  if (routingKey.includes('payment') || routingKey.includes('security')) {
    return 'high';
  }
  return 'low';
}

async function checkForSecurityThreats(auditLog) {
  if (auditLog.action === 'login' && !auditLog.success) {
    const recentFailedLogins = await AuditLog.countDocuments({
      userId: auditLog.userId,
      action: 'login',
      success: false,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (recentFailedLogins >= 5) {
      await SecurityAlert.create({
        companyId: auditLog.companyId,
        userId: auditLog.userId,
        type: 'failed_login',
        severity: 'high',
        title: 'Multiple Failed Login Attempts',
        description: `${recentFailedLogins} failed login attempts detected in the last 15 minutes`,
        ipAddress: auditLog.ipAddress,
        details: {
          attempts: recentFailedLogins,
          lastAttempt: auditLog.timestamp,
        },
        relatedAuditLogs: [auditLog._id],
      });
      logger.warn(`Security alert created for user ${auditLog.userId}`);
    }
  }

  if (auditLog.action === 'delete' && auditLog.category === 'product') {
    const recentDeletions = await AuditLog.countDocuments({
      userId: auditLog.userId,
      action: 'delete',
      category: 'product',
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });

    if (recentDeletions >= 10) {
      await SecurityAlert.create({
        companyId: auditLog.companyId,
        userId: auditLog.userId,
        type: 'mass_deletion',
        severity: 'critical',
        title: 'Mass Product Deletion Detected',
        description: `${recentDeletions} products deleted in the last 5 minutes`,
        ipAddress: auditLog.ipAddress,
        details: {
          deletions: recentDeletions,
        },
        relatedAuditLogs: [auditLog._id],
      });
      logger.warn(`Security alert: Mass deletion by user ${auditLog.userId}`);
    }
  }
}

exports.createAuditLog = async (data) => {
  try {
    const auditLog = await AuditLog.create(data);
    logger.info(`Manual audit log created: ${auditLog._id}`);
    return auditLog;
  } catch (error) {
    logger.error(`Error creating audit log: ${error.message}`);
    throw error;
  }
};

exports.getAuditLogs = async (filters) => {
  try {
    const {
      userId,
      companyId,
      category,
      action,
      eventType,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const query = {};
    if (userId) query.userId = userId;
    if (companyId) query.companyId = companyId;
    if (category) query.category = category;
    if (action) query.action = action;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;

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

    return {
      logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    };
  } catch (error) {
    logger.error(`Error getting audit logs: ${error.message}`);
    throw error;
  }
};
