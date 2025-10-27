const ComplianceReport = require('../models/ComplianceReport');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

exports.generateReport = async (req, res, next) => {
  try {
    const { companyId, type, startDate, endDate } = req.body;

    const report = await ComplianceReport.create({
      companyId,
      type,
      title: `${type.toUpperCase()} Compliance Report`,
      description: `Compliance report for period ${startDate} to ${endDate}`,
      period: { startDate, endDate },
      status: 'in_progress',
      generatedBy: req.user.userId,
    });

    generateReportAsync(report._id, companyId, startDate, endDate);

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report generation started',
    });
  } catch (error) {
    logger.error(`Generate report error: ${error.message}`);
    next(error);
  }
};

async function generateReportAsync(reportId, companyId, startDate, endDate) {
  try {
    const query = {
      companyId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const totalEvents = await AuditLog.countDocuments(query);

    const uniqueUsers = await AuditLog.distinct('userId', query);

    const criticalEvents = await AuditLog.countDocuments({
      ...query,
      severity: 'critical',
    });

    const failedLogins = await AuditLog.countDocuments({
      ...query,
      action: 'login',
      success: false,
    });

    const dataExports = await AuditLog.countDocuments({
      ...query,
      action: 'export',
    });

    const dataDeletes = await AuditLog.countDocuments({
      ...query,
      action: 'delete',
    });

    const findings = [];

    if (failedLogins > 100) {
      findings.push({
        category: 'Authentication',
        description: `High number of failed login attempts (${failedLogins})`,
        severity: 'high',
        recommendation: 'Review authentication policies and implement account lockout',
        affectedRecords: failedLogins,
      });
    }

    if (dataDeletes > 50) {
      findings.push({
        category: 'Data Management',
        description: `Significant data deletion activity (${dataDeletes})`,
        severity: 'medium',
        recommendation: 'Review deletion policies and ensure proper authorization',
        affectedRecords: dataDeletes,
      });
    }

    await ComplianceReport.findByIdAndUpdate(reportId, {
      status: 'completed',
      summary: {
        totalEvents,
        totalUsers: uniqueUsers.length,
        criticalEvents,
        failedLogins,
        dataExports,
        dataDeletes,
      },
      findings,
      recommendations: [
        'Implement multi-factor authentication',
        'Regular security training for staff',
        'Automated compliance monitoring',
        'Regular audit log reviews',
      ],
    });

    logger.info(`Compliance report ${reportId} generated successfully`);
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    await ComplianceReport.findByIdAndUpdate(reportId, { status: 'failed' });
  }
}

exports.getReports = async (req, res, next) => {
  try {
    const { companyId, type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (companyId) query.companyId = companyId;
    if (type) query.type = type;
    if (status) query.status = status;

    const reports = await ComplianceReport.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await ComplianceReport.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get reports error: ${error.message}`);
    next(error);
  }
};

exports.getReportById = async (req, res, next) => {
  try {
    const report = await ComplianceReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Get report error: ${error.message}`);
    next(error);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await ComplianceReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    logger.info(`Compliance report deleted: ${report._id}`);
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Delete report error: ${error.message}`);
    next(error);
  }
};
