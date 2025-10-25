const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const auth = require('../middleware/auth');

router.get('/plans', companyController.getSubscriptionPlans);
router.post('/companies', auth, companyController.createCompany);
router.get('/companies/me', auth, companyController.getMyCompany);
router.put('/companies/me', auth, companyController.updateCompany);
router.put('/companies/me/subscription', auth, companyController.updateCompanySubscription);

router.post('/companies/users', auth, companyController.addCompanyUser);
router.get('/companies/users', auth, companyController.getCompanyUsers);
router.put('/companies/users/:targetUserId', auth, companyController.updateUserRole);
router.delete('/companies/users/:targetUserId', auth, companyController.removeCompanyUser);

module.exports = router;
