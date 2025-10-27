const Report = require('../models/Report');
const {
  getSalesMetrics,
  getProductMetrics,
  getCustomerMetrics,
} = require('../services/analyticsService');
const logger = require('../utils/logger');

exports.generateReport = async (req, res, next) => {
  try {
    const { name, type, period, filters } = req.body;

    const report = await Report.create({
      companyId: req.user.companyId,
      name,
      type,
      description: req.body.description,
      period,
      filters: filters || {},
      status: 'generating',
      generatedBy: req.user.userId,
    });

    generateReportAsync(report._id, req.user.companyId, type, period);

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

async function generateReportAsync(reportId, companyId, type, period) {
  try {
    const { startDate, endDate } = period;

    let reportData = {};
    let visualizations = [];

    if (type === 'sales' || type === 'financial') {
      const salesMetrics = await getSalesMetrics(companyId, startDate, endDate);
      reportData.sales = salesMetrics;

      visualizations.push({
        type: 'line',
        title: 'Sales Over Time',
        data: salesMetrics.salesByDay,
        config: { xAxis: 'date', yAxis: 'revenue' },
      });

      visualizations.push({
        type: 'metric',
        title: 'Total Revenue',
        data: { value: salesMetrics.totalRevenue, label: 'Total Revenue' },
      });
    }

    if (type === 'sales' || type === 'product') {
      const productMetrics = await getProductMetrics(companyId, startDate, endDate);
      reportData.products = productMetrics;

      visualizations.push({
        type: 'bar',
        title: 'Top Products',
        data: productMetrics.topProducts,
        config: { xAxis: 'name', yAxis: 'views' },
      });
    }

    if (type === 'customer') {
      const customerMetrics = await getCustomerMetrics(companyId, startDate, endDate);
      reportData.customers = customerMetrics;

      visualizations.push({
        type: 'metric',
        title: 'Total Customers',
        data: { value: customerMetrics.totalCustomers, label: 'Total Customers' },
      });

      visualizations.push({
        type: 'metric',
        title: 'New Customers',
        data: { value: customerMetrics.newCustomers, label: 'New Customers' },
      });
    }

    await Report.findByIdAndUpdate(reportId, {
      status: 'completed',
      data: reportData,
      visualizations,
    });

    logger.info(`Report ${reportId} generated successfully`);
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    await Report.findByIdAndUpdate(reportId, { status: 'failed' });
  }
}

exports.getReports = async (req, res, next) => {
  try {
    const { companyId, type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (companyId) query.companyId = companyId;
    if (type) query.type = type;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Report.countDocuments(query);

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
    const report = await Report.findById(req.params.id);

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
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    logger.info(`Report deleted: ${report._id}`);
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Delete report error: ${error.message}`);
    next(error);
  }
};

exports.scheduleReport = async (req, res, next) => {
  try {
    const { frequency, recipients } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        'scheduled.enabled': true,
        'scheduled.frequency': frequency,
        'scheduled.recipients': recipients,
        'scheduled.nextRun': calculateNextRun(frequency),
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error(`Schedule report error: ${error.message}`);
    next(error);
  }
};

function calculateNextRun(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case 'quarterly':
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
