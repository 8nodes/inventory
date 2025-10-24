const NotificationTemplate = require('../models/NotificationTemplate');
const { createLogger } = require('../../../../shared/utils/logger');

const logger = createLogger('template-controller');

exports.createTemplate = async (req, res) => {
  try {
    const { name, slug, type, subject, body, variables, category, metadata } = req.body;

    const existingTemplate = await NotificationTemplate.findOne({ slug });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Template with this slug already exists'
      });
    }

    const template = new NotificationTemplate({
      name,
      slug,
      type,
      subject,
      body,
      variables,
      category,
      metadata
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message
    });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { type, category, isActive, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      NotificationTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      NotificationTemplate.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await NotificationTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await NotificationTemplate.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message
    });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await NotificationTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
};

exports.renderTemplate = async (req, res) => {
  try {
    const { slug } = req.params;
    const { data } = req.body;

    const template = await NotificationTemplate.findOne({ slug, isActive: true });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const rendered = template.render(data);

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    logger.error('Render template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to render template',
      error: error.message
    });
  }
};
