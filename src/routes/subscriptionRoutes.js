const express = require('express');
const router = express.Router();
const {
  getSubscriptionPlans,
  getSubscriptionFeatures,
  createCompany,
  getMyCompany,
  updateCompanySubscription,
  addCompanyUser,
  getCompanyUsers,
  checkFeatureAccess
} = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');

router.get('/plans', auth, getSubscriptionPlans);
router.get('/features', auth, getSubscriptionFeatures);
router.post('/company', auth, createCompany);
router.get('/company/me', auth, getMyCompany);
router.patch('/company/subscription', auth, updateCompanySubscription);
router.post('/company/users', auth, addCompanyUser);
router.get('/company/users', auth, getCompanyUsers);
router.get('/feature/:feature_key/access', auth, checkFeatureAccess);

module.exports = router;
