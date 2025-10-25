const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('subscription-controller');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const getSubscriptionPlans = async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true });

    if (error) throw error;

    const groupedPlans = plans.reduce((acc, plan) => {
      if (!acc[plan.tier]) {
        acc[plan.tier] = {};
      }
      acc[plan.tier][plan.billing_cycle] = plan;
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

const getSubscriptionFeatures = async (req, res) => {
  try {
    const { data: features, error } = await supabase
      .from('subscription_features')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: features
    });
  } catch (error) {
    logger.error('Error fetching subscription features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription features',
      error: error.message
    });
  }
};

const createCompany = async (req, res) => {
  try {
    const { name, email, subscription_tier, subscription_type } = req.body;
    const userId = req.user.userId;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    const tier = subscription_tier || 'base';
    const type = subscription_type || 'monthly';

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', tier)
      .eq('billing_cycle', type)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) throw planError;

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

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        email,
        subscription_tier: tier,
        subscription_type: type,
        subscription_status: 'active',
        subscription_end_date: subscriptionEndDate.toISOString(),
        max_users: plan.max_users
      })
      .select()
      .single();

    if (companyError) throw companyError;

    const { error: userError } = await supabase
      .from('company_users')
      .insert({
        company_id: company.id,
        user_id: userId,
        role: 'owner',
        is_active: true
      });

    if (userError) throw userError;

    logger.info(`Company created: ${company.id} by user: ${userId}`);

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

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id, role, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'No company found for this user'
      });
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyUser.company_id)
      .single();

    if (companyError) throw companyError;

    const { data: memberCount, error: countError } = await supabase
      .from('company_users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_active', true);

    if (countError) throw countError;

    const daysUntilExpiry = Math.ceil(
      (new Date(company.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.status(200).json({
      success: true,
      data: {
        ...company,
        userRole: companyUser.role,
        activeUsers: memberCount?.length || 0,
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

const updateCompanySubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription_tier, subscription_type } = req.body;

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can update subscription'
      });
    }

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', subscription_tier)
      .eq('billing_cycle', subscription_type)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) throw planError;

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const subscriptionEndDate = new Date();
    if (subscription_type === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    } else {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
    }

    const { data: company, error: updateError } = await supabase
      .from('companies')
      .update({
        subscription_tier,
        subscription_type,
        subscription_end_date: subscriptionEndDate.toISOString(),
        max_users: plan.max_users
      })
      .eq('id', companyUser.company_id)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info(`Company subscription updated: ${company.id} to ${subscription_tier}/${subscription_type}`);

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
    const { user_id, role } = req.body;

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser || !['owner', 'admin'].includes(companyUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company owners or admins can add users'
      });
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('max_users')
      .eq('id', companyUser.company_id)
      .single();

    if (companyError) throw companyError;

    const { count, error: countError } = await supabase
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyUser.company_id)
      .eq('is_active', true);

    if (countError) throw countError;

    if (count >= company.max_users) {
      return res.status(400).json({
        success: false,
        message: `User limit reached. Maximum ${company.max_users} users allowed for your subscription tier.`
      });
    }

    const { data: newUser, error: insertError } = await supabase
      .from('company_users')
      .insert({
        company_id: companyUser.company_id,
        user_id,
        role: role || 'member',
        is_active: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`User ${user_id} added to company ${companyUser.company_id}`);

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

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'No company found'
      });
    }

    const { data: users, error: usersError } = await supabase
      .from('company_users')
      .select('*')
      .eq('company_id', companyUser.company_id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (usersError) throw usersError;

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

const checkFeatureAccess = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { feature_key } = req.params;

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'No company found'
      });
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('subscription_tier')
      .eq('id', companyUser.company_id)
      .single();

    if (companyError) throw companyError;

    const { data: feature, error: featureError } = await supabase
      .from('subscription_features')
      .select('*')
      .eq('feature_key', feature_key)
      .maybeSingle();

    if (featureError) throw featureError;

    if (!feature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }

    const hasAccess = feature[`${company.subscription_tier}_tier`];

    res.status(200).json({
      success: true,
      data: {
        feature_key,
        feature_name: feature.feature_name,
        has_access: hasAccess,
        current_tier: company.subscription_tier
      }
    });
  } catch (error) {
    logger.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check feature access',
      error: error.message
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  getSubscriptionFeatures,
  createCompany,
  getMyCompany,
  updateCompanySubscription,
  addCompanyUser,
  getCompanyUsers,
  checkFeatureAccess
};
