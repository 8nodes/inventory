const SERVICES = {
  AUTH: {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
    healthCheck: '/health'
  },
  COMPANY: {
    name: 'company-service',
    url: process.env.COMPANY_SERVICE_URL || 'http://localhost:8002',
    healthCheck: '/health'
  },
  SHOP: {
    name: 'shop-service',
    url: process.env.SHOP_SERVICE_URL || 'http://localhost:8003',
    healthCheck: '/health'
  },
  ECOMMERCE: {
    name: 'ecommerce-service',
    url: process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:8004',
    healthCheck: '/health'
  },
  SALES: {
    name: 'sales-service',
    url: process.env.SALES_SERVICE_URL || 'http://localhost:8005',
    healthCheck: '/health'
  },
  PAYMENT: {
    name: 'payment-service',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8006',
    healthCheck: '/health'
  },
  INVENTORY: {
    name: 'inventory-service',
    url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:8007',
    healthCheck: '/health'
  },
  NOTIFICATION: {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8008',
    healthCheck: '/health'
  },
  WEBSOCKET: {
    name: 'websocket-service',
    url: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:8009',
    healthCheck: '/health'
  },
  AUDIT: {
    name: 'audit-service',
    url: process.env.AUDIT_SERVICE_URL || 'http://localhost:8010',
    healthCheck: '/health'
  },
  ANALYTICS: {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8011',
    healthCheck: '/health'
  },
  DEBT: {
    name: 'debt-service',
    url: process.env.DEBT_SERVICE_URL || 'http://localhost:8012',
    healthCheck: '/health'
  }
};

module.exports = SERVICES;
