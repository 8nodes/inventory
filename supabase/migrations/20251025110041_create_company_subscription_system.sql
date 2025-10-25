/*
  # Company Subscription System

  ## Overview
  This migration creates a complete company subscription management system with three tiers:
  - Base (monthly/yearly)
  - Pro (monthly/yearly) 
  - Max (monthly/yearly)
  
  Yearly subscriptions include 2 months discount (10/12 pricing).

  ## New Tables

  ### 1. `companies`
  Stores company information and subscription details
  - `id` (uuid, primary key) - Unique company identifier
  - `name` (text) - Company name
  - `email` (text) - Company contact email
  - `subscription_tier` (text) - Current subscription tier (base, pro, max)
  - `subscription_type` (text) - Payment frequency (monthly, yearly)
  - `subscription_status` (text) - Active, expired, cancelled
  - `subscription_start_date` (timestamptz) - When subscription started
  - `subscription_end_date` (timestamptz) - When subscription expires
  - `max_users` (integer) - Maximum allowed users based on tier
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `subscription_plans`
  Defines available subscription plans with features and pricing
  - `id` (uuid, primary key) - Plan identifier
  - `tier` (text) - Plan tier (base, pro, max)
  - `billing_cycle` (text) - Monthly or yearly
  - `price` (decimal) - Price in currency
  - `features` (jsonb) - Plan features and limits
  - `max_users` (integer) - User limit for this plan
  - `max_storage_gb` (integer) - Storage limit in GB
  - `is_active` (boolean) - Whether plan is available
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `company_users`
  Links users to companies with roles
  - `id` (uuid, primary key) - Record identifier
  - `company_id` (uuid, foreign key) - Reference to companies
  - `user_id` (uuid) - User identifier (from auth.users)
  - `role` (text) - User role (owner, admin, member)
  - `is_active` (boolean) - Whether user is active
  - `joined_at` (timestamptz) - When user joined company
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `subscription_features`
  Tracks feature access per subscription tier
  - `id` (uuid, primary key) - Feature identifier
  - `feature_name` (text) - Name of the feature
  - `feature_key` (text) - Unique key for programmatic access
  - `base_tier` (boolean) - Available in base tier
  - `pro_tier` (boolean) - Available in pro tier
  - `max_tier` (boolean) - Available in max tier
  - `description` (text) - Feature description
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Company owners/admins can manage their company
  - Users can only view their own company data
  - Subscription plans are publicly readable
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  subscription_tier text NOT NULL DEFAULT 'base' CHECK (subscription_tier IN ('base', 'pro', 'max')),
  subscription_type text NOT NULL DEFAULT 'monthly' CHECK (subscription_type IN ('monthly', 'yearly')),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled')),
  subscription_start_date timestamptz DEFAULT now(),
  subscription_end_date timestamptz,
  max_users integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('base', 'pro', 'max')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  price decimal(10,2) NOT NULL,
  features jsonb DEFAULT '{}'::jsonb,
  max_users integer NOT NULL,
  max_storage_gb integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tier, billing_cycle)
);

-- Create company users table
CREATE TABLE IF NOT EXISTS company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Create subscription features table
CREATE TABLE IF NOT EXISTS subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  feature_key text UNIQUE NOT NULL,
  base_tier boolean DEFAULT false,
  pro_tier boolean DEFAULT false,
  max_tier boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_tier ON companies(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies table
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for subscription_plans table (publicly readable)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for company_users table
CREATE POLICY "Users can view members of their company"
  ON company_users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage company users"
  ON company_users FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Company admins can update company users"
  ON company_users FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Company admins can remove company users"
  ON company_users FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- RLS Policies for subscription_features table (publicly readable)
CREATE POLICY "Anyone can view subscription features"
  ON subscription_features FOR SELECT
  TO authenticated
  USING (true);

-- Insert default subscription plans
INSERT INTO subscription_plans (tier, billing_cycle, price, max_users, max_storage_gb, features) VALUES
  ('base', 'monthly', 29.99, 10, 10, '{"chat": true, "basic_inventory": true, "reports": false, "api_access": false, "priority_support": false}'),
  ('base', 'yearly', 249.99, 10, 10, '{"chat": true, "basic_inventory": true, "reports": false, "api_access": false, "priority_support": false}'),
  ('pro', 'monthly', 79.99, 50, 50, '{"chat": true, "basic_inventory": true, "advanced_inventory": true, "reports": true, "api_access": true, "priority_support": false}'),
  ('pro', 'yearly', 666.66, 50, 50, '{"chat": true, "basic_inventory": true, "advanced_inventory": true, "reports": true, "api_access": true, "priority_support": false}'),
  ('max', 'monthly', 199.99, 200, 200, '{"chat": true, "basic_inventory": true, "advanced_inventory": true, "reports": true, "api_access": true, "priority_support": true, "custom_integrations": true, "dedicated_support": true}'),
  ('max', 'yearly', 1666.58, 200, 200, '{"chat": true, "basic_inventory": true, "advanced_inventory": true, "reports": true, "api_access": true, "priority_support": true, "custom_integrations": true, "dedicated_support": true}');

-- Insert subscription features
INSERT INTO subscription_features (feature_name, feature_key, base_tier, pro_tier, max_tier, description) VALUES
  ('Real-time Chat', 'chat', true, true, true, 'Group and private messaging within company'),
  ('Basic Inventory Management', 'basic_inventory', true, true, true, 'Core inventory tracking features'),
  ('Advanced Inventory Features', 'advanced_inventory', false, true, true, 'Batch tracking, transfers, reservations'),
  ('Analytics & Reports', 'reports', false, true, true, 'Comprehensive reporting and analytics'),
  ('API Access', 'api_access', false, true, true, 'REST API for integrations'),
  ('Priority Support', 'priority_support', false, false, true, '24/7 priority customer support'),
  ('Custom Integrations', 'custom_integrations', false, false, true, 'Custom API integrations and webhooks'),
  ('Dedicated Support', 'dedicated_support', false, false, true, 'Dedicated account manager');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
