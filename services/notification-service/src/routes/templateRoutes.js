const express = require('express');
const { body } = require('express-validator');
const templateController = require('../controllers/templateController');
const { authMiddleware, requireRole } = require('../../../../shared/middleware/authMiddleware');

const router = express.Router();

router.post('/',
  authMiddleware,
  requireRole(['super_admin', 'company_admin']),
  [
    body('name').notEmpty(),
    body('slug').notEmpty(),
    body('type').isIn(['email', 'sms', 'push', 'in_app']),
    body('body').notEmpty()
  ],
  templateController.createTemplate
);

router.get('/',
  authMiddleware,
  templateController.getTemplates
);

router.get('/:id',
  authMiddleware,
  templateController.getTemplateById
);

router.put('/:id',
  authMiddleware,
  requireRole(['super_admin', 'company_admin']),
  templateController.updateTemplate
);

router.delete('/:id',
  authMiddleware,
  requireRole(['super_admin', 'company_admin']),
  templateController.deleteTemplate
);

router.post('/:slug/render',
  authMiddleware,
  [
    body('data').isObject()
  ],
  templateController.renderTemplate
);

module.exports = router;
