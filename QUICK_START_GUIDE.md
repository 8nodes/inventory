# Inventory Service - Quick Start Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- RabbitMQ (v3.8 or higher)

## Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Set Up Environment Variables**

Create a `.env` file in the project root:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/inventory

# Message Queue
RABBITMQ_URL=amqp://localhost:5672

# Server
PORT=8007
NODE_ENV=development
```

3. **Start Required Services**

**MongoDB:**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install locally and start
mongod
```

**RabbitMQ:**
```bash
# Using Docker
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq:3-management

# Or install locally and start
rabbitmq-server
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will start on `http://localhost:8007`

## Verify Installation

### 1. Health Check
```bash
curl http://localhost:8007/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-10-23T10:30:00.000Z"
}
```

### 2. Service Info
```bash
curl http://localhost:8007/inventory
```

**Expected Response:**
```json
{
  "message": "Inventory Service API",
  "version": "2.0",
  "status": "operational",
  "endpoints": { ... }
}
```

### 3. Check Logs
```bash
tail -f logs/combined.log
```

You should see:
```
info: Database connected successfully
info: RabbitMQ connected successfully
info: Queue asserted: product.events
info: Queue asserted: inventory.events
...
info: Event consumers started successfully
info: Inventory Service running on http://localhost:8007
```

## Quick Test

### Create a Test Product

```bash
curl -X POST http://localhost:8007/inventory/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "sku": "TEST-001",
    "companyId": "test-company",
    "pricing": {
      "basePrice": 99.99,
      "currency": "USD"
    },
    "inventory": {
      "quantity": 100,
      "lowStockThreshold": 10
    },
    "status": "active",
    "visibility": "public"
  }'
```

### Get All Products

```bash
curl "http://localhost:8007/inventory/v1/products?companyId=test-company"
```

### Create Stock Reservation

```bash
curl -X POST http://localhost:8007/inventory/v1/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "orderId": "TEST-ORDER-001",
    "customerId": "TEST-CUSTOMER",
    "quantity": 2,
    "expirationMinutes": 15
  }'
```

## Integration with Other Services

### Order Service Integration

**1. Create a Test Order Event (Simulate Order Service)**

```javascript
// In your Order Service or test script
const amqp = require('amqplib');

async function publishOrderPlaced() {
  const connection = await amqp.connect('amqp://localhost:5672');
  const channel = await connection.createChannel();

  await channel.assertQueue('order.events', { durable: true });

  const event = {
    eventType: 'order.placed',
    data: {
      orderId: 'ORD-TEST-001',
      companyId: 'test-company',
      items: [
        {
          productId: 'YOUR_PRODUCT_ID',
          quantity: 5
        }
      ]
    }
  };

  channel.sendToQueue(
    'order.events',
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  console.log('Order event published');

  setTimeout(() => {
    connection.close();
  }, 500);
}

publishOrderPlaced();
```

**2. Verify Stock was Deducted**

Check the product inventory and stock changes:
```bash
curl "http://localhost:8007/inventory/v1/products/YOUR_PRODUCT_ID"
curl "http://localhost:8007/inventory/v1/stock-changes?companyId=test-company&productId=YOUR_PRODUCT_ID"
```

### Purchase Service Integration

**1. Publish Purchase Received Event**

```javascript
const event = {
  eventType: 'purchase.received',
  data: {
    purchaseId: 'PUR-TEST-001',
    companyId: 'test-company',
    supplierId: 'SUPPLIER-001',
    items: [
      {
        productId: 'YOUR_PRODUCT_ID',
        quantity: 50
      }
    ]
  }
};

channel.sendToQueue('purchase.events', Buffer.from(JSON.stringify(event)));
```

**2. Verify Stock was Added**

```bash
curl "http://localhost:8007/inventory/v1/products/YOUR_PRODUCT_ID"
```

## Common Tasks

### 1. Bulk Import Products

```bash
curl -X POST http://localhost:8007/inventory/v1/batch/import \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test-company",
    "products": [
      {
        "name": "Product 1",
        "sku": "SKU-001",
        "pricing": { "basePrice": 29.99 },
        "inventory": { "quantity": 100 }
      },
      {
        "name": "Product 2",
        "sku": "SKU-002",
        "pricing": { "basePrice": 39.99 },
        "inventory": { "quantity": 150 }
      }
    ]
  }'
```

### 2. Create Warehouse Transfer

```bash
# First, create warehouses
curl -X POST http://localhost:8007/inventory/v1/warehouses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warehouse A",
    "companyId": "test-company",
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "USA"
    }
  }'

# Then create transfer
curl -X POST http://localhost:8007/inventory/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "test-company",
    "sourceWarehouseId": "SOURCE_WAREHOUSE_ID",
    "destinationWarehouseId": "DEST_WAREHOUSE_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 10
      }
    ]
  }'
```

### 3. Check Available Stock (with Reservations)

```bash
curl "http://localhost:8007/inventory/v1/reservations/available-stock?productId=YOUR_PRODUCT_ID"
```

### 4. Get Low Stock Alerts

```bash
curl "http://localhost:8007/inventory/v1/alerts?companyId=test-company&isResolved=false"
```

### 5. Cleanup Expired Reservations

```bash
curl -X POST http://localhost:8007/inventory/v1/reservations/cleanup-expired
```

## Monitoring

### Check RabbitMQ Management Console

Open browser: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

**What to Check:**
- All queues are declared
- Messages are being processed
- No dead letters accumulating
- Consumer connections are active

### Check MongoDB

```bash
mongo inventory
db.products.count()
db.stockchanges.count()
db.stockreservations.count()
```

### View Logs

```bash
# Combined logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Inventory service specific
tail -f logs/inventory-service.log
```

## Troubleshooting

### Issue: Service won't start

**Check:**
1. MongoDB is running: `mongo --eval "db.stats()"`
2. RabbitMQ is running: `rabbitmqctl status`
3. Port 8007 is not in use: `lsof -i :8007`
4. Environment variables are set: `cat .env`

**Solution:**
```bash
# Kill process on port 8007
kill -9 $(lsof -t -i:8007)

# Restart services
npm run dev
```

### Issue: Events not being consumed

**Check:**
1. RabbitMQ queues exist: Check management console
2. Event consumers started: Check logs for "Event consumers started successfully"
3. Message format is correct: Check RabbitMQ message payload

**Solution:**
```bash
# Restart service
npm run dev

# Check RabbitMQ queues
curl -u guest:guest http://localhost:15672/api/queues
```

### Issue: Stock not updating from events

**Check:**
1. Event is being published to correct queue
2. Event format matches expected structure
3. ProductId exists in database
4. No errors in logs

**Solution:**
```bash
# Check logs
tail -f logs/error.log

# Manually test event consumer
node -e "require('./src/events/eventConsumer').consumeOrderEvents()"
```

### Issue: Reservations not expiring

**Solution:**
Set up a cron job or scheduled task:

```javascript
// scheduledTasks.js
const cron = require('node-cron');
const axios = require('axios');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await axios.post('http://localhost:8007/inventory/v1/reservations/cleanup-expired');
    console.log('Expired reservations cleaned up');
  } catch (error) {
    console.error('Error cleaning up reservations:', error.message);
  }
});
```

## Testing with Postman

1. Import the Postman collection (see `POSTMAN_API_EXAMPLES.md`)
2. Set up environment variables in Postman
3. Run through the example workflows
4. Use test scripts to automate workflows

## Production Deployment

### Using Docker

**1. Build Image**
```bash
docker build -t inventory-service:latest .
```

**2. Run Container**
```bash
docker run -d \
  --name inventory-service \
  -p 8007:8007 \
  -e MONGODB_URI=mongodb://mongo:27017/inventory \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e NODE_ENV=production \
  inventory-service:latest
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  inventory-service:
    build: .
    ports:
      - "8007:8007"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/inventory
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - NODE_ENV=production
    depends_on:
      - mongodb
      - rabbitmq

volumes:
  mongodb_data:
```

**Start All Services:**
```bash
docker-compose up -d
```

## Performance Tips

1. **Enable MongoDB Indexes**
   - Indexes are defined in models and created automatically
   - Monitor slow queries: `db.setProfilingLevel(1, 100)`

2. **RabbitMQ Prefetch**
   - Already set to 1 in event consumers
   - Adjust based on your hardware

3. **Connection Pooling**
   - MongoDB connection pooling is automatic
   - RabbitMQ uses single channel (suitable for most cases)

4. **Caching**
   - Consider Redis for frequently accessed products
   - Cache product details, not inventory (changes frequently)

5. **Rate Limiting**
   - Add rate limiting middleware for production
   - Use express-rate-limit package

## Security Checklist

- [ ] Enable authentication on MongoDB
- [ ] Enable authentication on RabbitMQ
- [ ] Add JWT authentication middleware
- [ ] Implement role-based access control
- [ ] Enable HTTPS in production
- [ ] Set up firewall rules
- [ ] Regularly update dependencies
- [ ] Enable MongoDB encryption at rest
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- [ ] Implement request validation
- [ ] Add security headers (already using Helmet)
- [ ] Set up logging and monitoring
- [ ] Regular security audits

## Support & Documentation

- **Full Documentation**: `INVENTORY_SERVICE_DOCUMENTATION.md`
- **API Examples**: `POSTMAN_API_EXAMPLES.md`
- **Improvements Summary**: `IMPROVEMENTS_SUMMARY.md`
- **This Guide**: `QUICK_START_GUIDE.md`

## Next Steps

1. ✅ Service is running
2. ✅ Test basic operations
3. ✅ Integrate with Order Service
4. ✅ Integrate with Purchase Service
5. ✅ Set up monitoring
6. ✅ Deploy to production
7. ✅ Set up scheduled tasks
8. ✅ Configure backups

---

**You're all set!** 🚀

Your inventory service is now running and ready to handle e-commerce operations with event-driven architecture, multi-warehouse support, and comprehensive inventory management capabilities.
