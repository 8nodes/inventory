# Setup and Deployment Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10+): [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+): Usually included with Docker Desktop
- **Node.js** (v20+): For local development (optional)
- **Git**: For version control

## Quick Start (Docker Compose)

### 1. Clone and Navigate to Project

```bash
cd /path/to/project
```

### 2. Configure Environment Variables

The project uses a single `.env` file in the root directory. Update the following variables:

```bash
# Database
DB_MONGO=mongodb://admin:admin123@mongodb:27017

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@rabbitmq:5672

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please
JWT_EXPIRES_IN=7d

# Service Ports
API_GATEWAY_PORT=8000
AUTH_SERVICE_PORT=8001
COMPANY_SERVICE_PORT=8002
SHOP_SERVICE_PORT=8003
ECOMMERCE_SERVICE_PORT=8004
SALES_SERVICE_PORT=8005
PAYMENT_SERVICE_PORT=8006
INVENTORY_SERVICE_PORT=8007
NOTIFICATION_SERVICE_PORT=8008
WEBSOCKET_SERVICE_PORT=8009
AUDIT_SERVICE_PORT=8010
ANALYTICS_SERVICE_PORT=8011
DEBT_SERVICE_PORT=8012

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_MODE=sandbox

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# SMS Configuration
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Configuration (for push notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Node Environment
NODE_ENV=development
LOG_LEVEL=info
```

### 3. Start All Services

```bash
docker-compose up -d
```

This command will:
- Pull required Docker images (MongoDB, RabbitMQ)
- Build all microservice images
- Start all containers
- Create necessary networks and volumes

### 4. Verify Services are Running

```bash
# Check all containers
docker-compose ps

# Should show all services as "Up"
```

### 5. Check Service Health

```bash
# API Gateway
curl http://localhost:8000/health

# Auth Service
curl http://localhost:8001/health

# Check all services
for port in {8000..8012}; do
  echo "Checking port $port..."
  curl -s http://localhost:$port/health | jq '.service'
done
```

### 6. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 inventory-service
```

### 7. Access Management UIs

- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `admin123`

- **MongoDB**: localhost:27017
  - Username: `admin`
  - Password: `admin123`
  - Use MongoDB Compass or any MongoDB client

## Service Architecture

### Port Mappings

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| API Gateway | 8000 | 8000 | Main entry point |
| Auth Service | 8001 | 8001 | Authentication |
| Company Service | 8002 | 8002 | Company management |
| Shop Service | 8003 | 8003 | Shop management |
| E-commerce Service | 8004 | 8004 | Product catalog |
| Sales Service | 8005 | 8005 | Order management |
| Payment Service | 8006 | 8006 | Payment processing |
| Inventory Service | 8007 | 8007 | Stock management |
| Notification Service | 8008 | 8008 | Notifications |
| WebSocket Service | 8009 | 8009 | Real-time updates |
| Audit Service | 8010 | 8010 | Audit logs |
| Analytics Service | 8011 | 8011 | Analytics & reports |
| Debt Service | 8012 | 8012 | Debt tracking |
| MongoDB | 27017 | 27017 | Database |
| RabbitMQ | 5672 | 5672 | Message broker |
| RabbitMQ Management | 15672 | 15672 | RabbitMQ UI |

## Initial Setup Steps

### 1. Create Super Admin Account

The first account you create should be the super admin:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123!",
    "firstName": "Super",
    "lastName": "Admin",
    "phone": "+1234567890"
  }'
```

**Important**: After creating this account, you need to manually update its role to `super_admin` in the database:

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh -u admin -p admin123

# Switch to auth database
use authdb

# Update user role
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "super_admin" } }
)

# Verify
db.users.findOne({ email: "admin@yourdomain.com" })

exit
```

### 2. Login as Super Admin

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123!"
  }'
```

Save the returned JWT token for subsequent requests.

### 3. Create a Company

```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "name": "My E-commerce Company",
    "slug": "my-ecommerce",
    "description": "Leading online retailer",
    "contactInfo": {
      "email": "contact@myecommerce.com",
      "phone": "+1234567890",
      "website": "https://myecommerce.com"
    },
    "address": {
      "street": "123 Business Ave",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "zipCode": "10001"
    },
    "settings": {
      "currency": "USD",
      "timezone": "America/New_York",
      "taxRate": 8.5
    }
  }'
```

### 4. Create Company Admin User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myecommerce.com",
    "password": "CompanyAdminPass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "company_admin",
    "companyId": "COMPANY_ID_FROM_STEP_3"
  }'
```

### 5. Create Shops

```bash
curl -X POST http://localhost:8000/api/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COMPANY_ADMIN_TOKEN" \
  -d '{
    "name": "Downtown Store",
    "companyId": "COMPANY_ID",
    "location": {
      "address": "456 Market St",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "zipCode": "94102",
      "coordinates": {
        "lat": 37.7749,
        "lng": -122.4194
      }
    },
    "contactInfo": {
      "phone": "+14155551234",
      "email": "downtown@myecommerce.com"
    },
    "operatingHours": [
      {"day": "Monday", "open": "09:00", "close": "18:00"},
      {"day": "Tuesday", "open": "09:00", "close": "18:00"},
      {"day": "Wednesday", "open": "09:00", "close": "18:00"},
      {"day": "Thursday", "open": "09:00", "close": "18:00"},
      {"day": "Friday", "open": "09:00", "close": "20:00"},
      {"day": "Saturday", "open": "10:00", "close": "20:00"},
      {"day": "Sunday", "open": "10:00", "close": "18:00"}
    ]
  }'
```

### 6. Add Products to Inventory

```bash
curl -X POST http://localhost:8000/api/inventory/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer COMPANY_ADMIN_TOKEN" \
  -d '{
    "name": "Premium Laptop",
    "sku": "LAP-001",
    "companyId": "COMPANY_ID",
    "description": "High-performance laptop for professionals",
    "pricing": {
      "basePrice": 1299.99,
      "salePrice": 1199.99,
      "costPrice": 900.00,
      "currency": "USD"
    },
    "inventory": {
      "quantity": 50,
      "lowStockThreshold": 10
    },
    "specifications": {
      "processor": "Intel i7",
      "ram": "16GB",
      "storage": "512GB SSD"
    },
    "images": [
      "https://example.com/laptop1.jpg",
      "https://example.com/laptop2.jpg"
    ],
    "status": "active",
    "visibility": "public"
  }'
```

## Testing the Platform

### 1. Test Customer Registration and Login

```bash
# Register customer
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "CustomerPass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1234567890",
    "role": "customer"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "CustomerPass123!"
  }'
```

### 2. Test Product Browsing

```bash
# Get all products
curl http://localhost:8000/api/products

# Search products
curl "http://localhost:8000/api/products?search=laptop&minPrice=500&maxPrice=2000"
```

### 3. Test Shopping Cart

```bash
# Add to cart
curl -X POST http://localhost:8000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 1
  }'

# Get cart
curl http://localhost:8000/api/cart \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### 4. Test Order Creation

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "items": [{
      "productId": "PRODUCT_ID",
      "quantity": 1,
      "price": 1199.99
    }],
    "shippingAddress": {
      "street": "789 Customer Rd",
      "city": "Los Angeles",
      "state": "CA",
      "country": "USA",
      "zipCode": "90001"
    },
    "shopId": "SHOP_ID"
  }'
```

## Development Workflow

### Running Services Individually (for development)

If you want to develop on a specific service:

```bash
# Stop the service in Docker
docker-compose stop auth-service

# Navigate to the service directory
cd services/auth-service

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Rebuilding a Service

```bash
# Rebuild specific service
docker-compose up -d --build auth-service

# Rebuild all services
docker-compose up -d --build
```

### Viewing Database Data

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh -u admin -p admin123

# List databases
show dbs

# Use a specific database
use authdb

# Show collections
show collections

# Query data
db.users.find().pretty()
```

### Monitoring RabbitMQ

1. Open browser: http://localhost:15672
2. Login with `admin` / `admin123`
3. Go to "Queues" tab to see message queues
4. Monitor message rates and consumers

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Database Connection Issues

```bash
# Check MongoDB status
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
docker-compose ps rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq
```

### Service Cannot Connect to Others

```bash
# Check network
docker network ls
docker network inspect project_ecommerce-network

# Restart affected service
docker-compose restart service-name
```

### Clear All Data and Start Fresh

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Production Deployment Considerations

### 1. Security

- Change all default passwords
- Use strong JWT secrets (generate with: `openssl rand -base64 32`)
- Enable HTTPS/TLS
- Configure firewall rules
- Use secrets management (Docker Secrets, Vault)
- Enable MongoDB authentication
- Use RabbitMQ authentication and virtual hosts

### 2. Scaling

```bash
# Scale specific services
docker-compose up -d --scale ecommerce-service=3
docker-compose up -d --scale sales-service=2
```

### 3. Monitoring

- Set up log aggregation (ELK Stack, Grafana Loki)
- Configure metrics collection (Prometheus)
- Set up alerting (Alertmanager)
- Use APM tools (New Relic, DataDog)

### 4. Backups

```bash
# Backup MongoDB
docker exec mongodb mongodump --uri="mongodb://admin:admin123@localhost:27017" --out=/backup

# Copy backup
docker cp mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore
docker exec mongodb mongorestore --uri="mongodb://admin:admin123@localhost:27017" /backup
```

### 5. Environment-Specific Configurations

Create different compose files:
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `docker-compose.staging.yml` (staging)

```bash
# Use production config
docker-compose -f docker-compose.prod.yml up -d
```

## Performance Optimization

### 1. MongoDB Indexes

```javascript
// Connect to each database and create indexes
use authdb;
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, companyId: 1 });

use inventorydb;
db.products.createIndex({ companyId: 1, status: 1 });
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ name: "text", description: "text" });

use salesdb;
db.orders.createIndex({ customerId: 1, status: 1 });
db.orders.createIndex({ companyId: 1, createdAt: -1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
```

### 2. RabbitMQ Optimization

- Set prefetch count for consumers
- Use durable queues
- Enable message persistence for critical data
- Monitor queue depth

### 3. Caching

Consider adding Redis for:
- Session storage
- Frequently accessed data
- Rate limiting
- API response caching

## Maintenance

### Regular Tasks

1. **Monitor disk space**
```bash
docker system df
```

2. **Clean up unused resources**
```bash
docker system prune -a
```

3. **Update images**
```bash
docker-compose pull
docker-compose up -d
```

4. **Check service health**
```bash
./scripts/health-check.sh
```

5. **Review logs**
```bash
docker-compose logs --since 1h
```

## Support

For issues or questions:
- Check service logs
- Review MongoDB collections
- Monitor RabbitMQ queues
- Check service health endpoints
- Review audit logs for system events

## Next Steps

1. Configure payment gateways (Stripe, PayPal)
2. Set up email and SMS providers
3. Configure Firebase for push notifications
4. Customize notification templates
5. Set up monitoring and alerting
6. Configure backups
7. Set up CI/CD pipelines
8. Add frontend applications
9. Configure domain and SSL certificates
10. Set up production environment

---

Your microservices platform is now ready! Start by creating your super admin account and begin adding companies, shops, and products.
