const Company = require('../models/Company');
const CompanyUser = require('../models/CompanyUser');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { logger } = require('../utils/logger');

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ tier: 1 });

    const groupedPlans = plans.reduce((acc, plan) => {
      if (!acc[plan.tier]) {
        acc[plan.tier] = {};
      }
      acc[plan.tier][plan.billingCycle] = plan;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        plans: groupedPlans,
        allPlans: plans
      }
    });
  } catch (error) {
    logger.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
};

const createCompany = async (req, res) => {
  try {
    const { name, email, subscriptionTier, subscriptionType, address, phone, website, industry } = req.body;
    const userId = req.user.userId;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    const tier = subscriptionTier || 'base';
    const type = subscriptionType || 'monthly';

    const plan = await SubscriptionPlan.findOne({
      tier,
      billingCycle: type,
      isActive: true
    });

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const subscriptionEndDate = new Date();
    if (type === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }

    const company = new Company({
      name,
      email,
      subscriptionTier: tier,
      subscriptionType: type,
      subscriptionStatus: 'active',
      subscriptionEndDate,
      maxUsers: plan.maxUsers,
      address,
      phone,
      website,
      industry
    });

    await company.save();

    const companyUser = new CompanyUser({
      companyId: company._id,
      userId,
      role: 'owner',
      isActive: true,
      permissions: [
        'manage_users',
        'manage_subscription',
        'manage_settings',
        'view_reports',
        'manage_inventory',
        'manage_chat',
        'export_data'
      ]
    });

    await companyUser.save();

    logger.info(`Company created: ${company._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company
    });
  } catch (error) {
    logger.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  }
};

const getMyCompany = async (req, res) => {
  try {
    const userId = req.user.userId;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'No company found for this user'
      });
    }

    const company = await Company.findById(companyUser.companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const memberCount = await CompanyUser.countDocuments({
      companyId: company._id,
      isActive: true
    });

    const daysUntilExpiry = Math.ceil(
      (new Date(company.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.status(200).json({
      success: true,
      data: {
        ...company.toObject(),
        userRole: companyUser.role,
        userPermissions: companyUser.permissions,
        activeUsers: memberCount,
        daysUntilExpiry
      }
    });
  } catch (error) {
    logger.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
      error: error.message
    });
  }
};

const updateCompany = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can update company details'
      });
    }

    const allowedUpdates = ['name', 'address', 'phone', 'website', 'industry', 'logoUrl', 'settings'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const company = await Company.findByIdAndUpdate(
      companyUser.companyId,
      filteredUpdates,
      { new: true }
    );

    logger.info(`Company updated: ${company._id} by user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error) {
    logger.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
};

const updateCompanySubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionTier, subscriptionType } = req.body;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can update subscription'
      });
    }

    const plan = await SubscriptionPlan.findOne({
      tier: subscriptionTier,
      billingCycle: subscriptionType,
      isActive: true
    });

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const subscriptionEndDate = new Date();
    if (subscriptionType === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }

    const company = await Company.findByIdAndUpdate(
      companyUser.companyId,
      {
        subscriptionTier,
        subscriptionType,
        subscriptionEndDate,
        maxUsers: plan.maxUsers
      },
      { new: true }
    );

    logger.info(`Company subscription updated: ${company._id} to ${subscriptionTier}/${subscriptionType}`);

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: company
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
};

const addCompanyUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { user_id, role, permissions } = req.body;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can add users'
      });
    }

    const company = await Company.findById(companyUser.companyId);

    const currentUserCount = await CompanyUser.countDocuments({
      companyId: company._id,
      isActive: true
    });

    if (currentUserCount >= company.maxUsers) {
      return res.status(400).json({
        success: false,
        message: `User limit reached. Maximum ${company.maxUsers} users allowed for your subscription tier.`
      });
    }

    const newUser = new CompanyUser({
      companyId: company._id,
      userId: user_id,
      role: role || 'member',
      permissions: permissions || [],
      isActive: true
    });

    await newUser.save();

    logger.info(`User ${user_id} added to company ${company._id}`);

    res.status(201).json({
      success: true,
      message: 'User added to company successfully',
      data: newUser
    });
  } catch (error) {
    logger.error('Error adding user to company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user to company',
      error: error.message
    });
  }
};

const getCompanyUsers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'No company found'
      });
    }

    const users = await CompanyUser.find({
      companyId: companyUser.companyId,
      isActive: true
    }).sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching company users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company users',
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;
    const { role, permissions } = req.body;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can update user roles'
      });
    }

    const updatedUser = await CompanyUser.findOneAndUpdate(
      { userId: targetUserId, companyId: companyUser.companyId },
      { role, permissions },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User role updated: ${targetUserId} to ${role}`);

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

const removeCompanyUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;

    const companyUser = await CompanyUser.findOne({
      userId,
      isActive: true
    });

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can remove users'
      });
    }

    const removedUser = await CompanyUser.findOneAndUpdate(
      { userId: targetUserId, companyId: companyUser.companyId },
      { isActive: false },
      { new: true }
    );

    if (!removedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User removed: ${targetUserId} from company ${companyUser.companyId}`);

    res.status(200).json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    logger.error('Error removing user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user',
      error: error.message
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  createCompany,
  getMyCompany,
  updateCompany,
  updateCompanySubscription,
  addCompanyUser,
  getCompanyUsers,
  updateUserRole,
  removeCompanyUser
};
