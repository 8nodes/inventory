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
  CHAT: {
    name: 'chat-service',
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:3003',
    healthCheck: '/health'
  },
  ECOMMERCE: {
    name: 'ecommerce-service',
    url: process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:3004',
    healthCheck: '/health'
  },
  SALES: {
    name: 'sales-service',
    url: process.env.SALES_SERVICE_URL || 'http://localhost:3005',
    healthCheck: '/health'
  },
  INVENTORY: {
    name: 'inventory-service',
    url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3006',
    healthCheck: '/health'
  },
  NOTIFICATION: {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    healthCheck: '/health'
  },
  SHOP: {
    name: 'shop-service',
    url: process.env.SHOP_SERVICE_URL || 'http://localhost:3008',
    healthCheck: '/health'
  },
  AUDIT: {
    name: 'audit-service',
    url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3009',
    healthCheck: '/health'
  },
  ANALYTICS: {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010',
    healthCheck: '/health'
  },
  WEBSOCKET: {
    name: 'websocket-service',
    url: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3011',
    healthCheck: '/health'
  }
};

module.exports = SERVICES;
