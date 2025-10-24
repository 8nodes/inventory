# Enterprise E-Commerce + Inventory Management Platform

A comprehensive, scalable microservices-based platform combining e-commerce capabilities with advanced inventory management, designed for multi-tenant operations with real-time communication and robust analytics.

## Overview

This platform enables you (as super admin) to manage multiple companies, each with multiple shops, complete inventory tracking, e-commerce operations, order fulfillment, payments, notifications, and comprehensive analytics - all in a single integrated system.

## Key Features

### Multi-Tenant Architecture
- Super admin can manage multiple companies
- Each company can have multiple shops
- Role-based access control (Super Admin, Company Admin, Shop Manager, Shop Staff, Customer)
- Complete data isolation between tenants

### E-Commerce Platform
- Product catalog with advanced search and filtering
- AI-powered recommendation system
- Shopping cart and wishlist
- Customer accounts and profiles
- Order tracking and history
- Product reviews and ratings

### Inventory Management
- Real-time stock tracking across multiple warehouses
- Low stock and out-of-stock alerts
- Stock reservations for orders
- Inter-warehouse transfers with approval workflow
- Batch operations for bulk updates
- Complete audit trail

### Order Management
- Order creation and tracking
- Multiple fulfillment options
- Returns and refunds
- Invoice generation
- Real-time status updates

### Payment Processing
- Multiple payment gateway support (Stripe, PayPal)
- Secure payment processing
- Refund management
- Transaction history
- Payment method storage

### Notification System
- Multi-channel notifications (Email, SMS, Push)
- Priority-based delivery (Critical, Important, Normal)
- Scheduled notifications
- Template management
- Delivery tracking

### Real-Time Communication
- WebSocket-based real-time updates
- Live order tracking
- Instant inventory updates
- Real-time analytics
- Chat support capability

### Analytics & Reporting
- Sales analytics and forecasting
- Inventory analytics
- Customer behavior analysis
- Revenue tracking
- Custom report generation
- Real-time dashboards

### Audit & Compliance
- Complete activity logging
- Change history tracking
- Compliance reporting
- Security event monitoring
- User activity tracking

### Debt Management
- Company debt tracking
- Payment schedules
- Overdue alerts
- Payment history
- Collection management

## Architecture

### Microservices

The platform consists of 13 independent microservices:

1. **API Gateway** (:8000) - Single entry point, routing, rate limiting
2. **Auth Service** (:8001) - Authentication and user management
3. **Company Service** (:8002) - Company management and configuration
4. **Shop Service** (:8003) - Shop operations and staff management
5. **E-commerce Service** (:8004) - Product catalog, cart, recommendations
6. **Sales Service** (:8005) - Order processing and fulfillment
7. **Payment Service** (:8006) - Payment processing and gateways
8. **Inventory Service** (:8007) - Stock management and warehouses
9. **Notification Service** (:8008) - Multi-channel notifications
10. **WebSocket Service** (:8009) - Real-time communication
11. **Audit Service** (:8010) - Activity logging and compliance
12. **Analytics Service** (:8011) - Business intelligence and reporting
13. **Debt Service** (:8012) - Debt tracking and payment plans

### Technology Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB (separate database per service)
- **Message Broker**: RabbitMQ (event-driven architecture)
- **Authentication**: JWT tokens with refresh tokens
- **Containerization**: Docker & Docker Compose
- **Payment Gateways**: Stripe, PayPal
- **Notifications**: SMTP (Email), Twilio (SMS), Firebase (Push)

### Communication Patterns

- **Synchronous**: REST APIs through API Gateway
- **Asynchronous**: Event-driven via RabbitMQ
- **Real-time**: WebSocket connections

## Quick Start

### Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Node.js v20+ (for local development)

### Installation

1. Clone the repository and navigate to the project:
```bash
cd /path/to/project
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services:
```bash
docker-compose up -d
```

4. Verify all services are running:
```bash
docker-compose ps
```

5. Check health of all services:
```bash
curl http://localhost:8000/health
```

### Initial Setup

1. **Create Super Admin Account**: See `SETUP_AND_DEPLOYMENT_GUIDE.md` for detailed instructions

2. **Create Your First Company**: Use the super admin account to create companies

3. **Set Up Shops**: Add shop locations for each company

4. **Add Products**: Import or manually add products to inventory

5. **Start Selling**: The platform is ready to accept orders!

## Documentation

Comprehensive documentation is available:

- **[MICROSERVICES_ARCHITECTURE.md](MICROSERVICES_ARCHITECTURE.md)** - Complete architecture overview, service descriptions, event flows
- **[INVENTORY_SERVICE_DOCUMENTATION.md](INVENTORY_SERVICE_DOCUMENTATION.md)** - Detailed inventory service documentation
- **[USE_CASES_AND_FLOWS.md](USE_CASES_AND_FLOWS.md)** - User scenarios, API flows, event relationships
- **[SETUP_AND_DEPLOYMENT_GUIDE.md](SETUP_AND_DEPLOYMENT_GUIDE.md)** - Installation, configuration, deployment
- **[POSTMAN_API_EXAMPLES.md](POSTMAN_API_EXAMPLES.md)** - API examples and testing

## User Roles

### Super Admin (You)
- Manage all companies
- Create and configure companies
- Assign company admins
- View global analytics
- System-wide administration

### Company Admin
- Manage company settings
- Create and manage shops
- Assign shop managers
- Manage company inventory
- View company analytics
- Handle company operations

### Shop Manager
- Manage assigned shop(s)
- Process orders
- Manage shop inventory
- Handle staff
- View shop analytics

### Shop Staff
- Process in-store sales
- Update inventory
- View shop information
- Limited operations

### Customer
- Browse products
- Place orders
- Track orders
- Manage profile
- View order history

## API Gateway Routes

All API calls go through the API Gateway at `http://localhost:8000`:

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login
GET    /api/products               - Browse products
POST   /api/cart/items             - Add to cart
POST   /api/orders                 - Create order
POST   /api/payments/process       - Process payment
GET    /api/inventory/v1/products  - Inventory management
POST   /api/companies              - Create company (Super Admin)
POST   /api/shops                  - Create shop (Company Admin)
GET    /api/analytics/dashboard    - Get analytics
```

See documentation for complete API reference.

## Event-Driven Architecture

Services communicate asynchronously via RabbitMQ events:

```
order.created → inventory.reserve → payment.initiate → notification.send
payment.success → order.update → inventory.deduct → analytics.track
inventory.low_stock → notification.critical_alert → websocket.broadcast
```

## Monitoring & Management

- **RabbitMQ Management UI**: http://localhost:15672 (admin/admin123)
- **Service Health Checks**: http://localhost:{port}/health
- **Logs**: `docker-compose logs -f [service-name]`

## Development

### Run Individual Service Locally

```bash
# Stop service in Docker
docker-compose stop auth-service

# Navigate to service
cd services/auth-service

# Install dependencies
npm install

# Run in development
npm run dev
```

### Rebuild Services

```bash
# Rebuild specific service
docker-compose up -d --build auth-service

# Rebuild all services
docker-compose up -d --build
```

## Testing

Each service includes health check endpoints. Test the platform:

```bash
# Test customer registration
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","role":"customer"}'

# Test product search
curl "http://localhost:8000/api/products?search=laptop"

# Test order creation (requires auth token)
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"prod123","quantity":1}]}'
```

## Deployment

### Development
```bash
docker-compose up -d
```

### Production
- Use production environment variables
- Enable HTTPS/TLS
- Configure proper firewall rules
- Set up monitoring and alerting
- Configure automated backups
- Use secrets management
- Scale services as needed

See `SETUP_AND_DEPLOYMENT_GUIDE.md` for detailed production deployment instructions.

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on all endpoints
- Password hashing with bcrypt
- Company/shop data isolation
- Audit logging for all operations
- Secure payment processing
- CORS protection
- Helmet.js security headers

## Scaling

Services can be scaled independently:

```bash
# Scale e-commerce service to 3 instances
docker-compose up -d --scale ecommerce-service=3

# Scale sales service to 2 instances
docker-compose up -d --scale sales-service=2
```

## Database Structure

Each service has its own MongoDB database:
- authdb - User authentication
- companydb - Company data
- shopdb - Shop information
- ecommercedb - Product catalog
- salesdb - Orders
- paymentdb - Transactions
- inventorydb - Stock data
- notificationdb - Notification logs
- auditdb - Audit trails
- analyticsdb - Analytics data
- debtdb - Debt records

## Backup & Recovery

```bash
# Backup MongoDB
docker exec mongodb mongodump --out=/backup

# Restore MongoDB
docker exec mongodb mongorestore /backup
```

## Troubleshooting

### Services not starting
```bash
docker-compose logs [service-name]
docker-compose restart [service-name]
```

### Database connection issues
```bash
docker-compose restart mongodb
docker-compose logs mongodb
```

### Clear all data and restart
```bash
docker-compose down -v
docker-compose up -d
```

## Performance Optimization

- MongoDB indexes on frequently queried fields
- RabbitMQ message persistence for critical events
- Connection pooling for databases
- Pagination on all list endpoints
- Caching frequently accessed data
- Lazy loading for images
- API response compression

## Roadmap

- [ ] GraphQL API Gateway
- [ ] Redis caching layer
- [ ] Elasticsearch for advanced search
- [ ] Kubernetes deployment manifests
- [ ] Service mesh implementation
- [ ] Distributed tracing
- [ ] Admin dashboard frontend
- [ ] Customer mobile app
- [ ] Shop POS system
- [ ] Multi-region support

## Contributing

This is a private enterprise platform. For feature requests or issues, contact the development team.

## License

Proprietary - All rights reserved

## Support

For technical support:
1. Check the documentation
2. Review service logs
3. Check RabbitMQ queues
4. Verify MongoDB collections
5. Review audit logs

---

**Built with ❤️ for modern e-commerce and inventory management**

Version: 1.0.0
Last Updated: 2024
