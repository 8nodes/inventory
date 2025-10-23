# Inventory Service Documentation

## Overview
The Inventory Service is a comprehensive microservice designed for managing e-commerce inventory, stock levels, warehouses, and inter-service communication through event-driven architecture. It integrates seamlessly with Order Service, Purchase Service, and other microservices in your e-commerce ecosystem.

## Architecture

### Event-Driven Design
The service uses RabbitMQ for asynchronous event processing:
- **Consumes Events**: Order events, Purchase events
- **Publishes Events**: Product events, Inventory events, Stock events, Alert events, Warehouse events

### Key Features
1. **Product Management**: Full CRUD operations for products with variations
2. **Inventory Tracking**: Real-time stock level management across multiple warehouses
3. **Stock Reservations**: Temporary stock holds for pending orders
4. **Warehouse Management**: Multi-warehouse support with stock transfers
5. **Batch Operations**: Bulk updates for inventory, prices, and status
6. **Stock Transfers**: Inter-warehouse stock movement with approval workflow
7. **Alerts**: Automatic low-stock and out-of-stock notifications
8. **Reporting**: Stock change history and audit trails
9. **Event Integration**: Automatic inventory updates from external services

## System Components

### Controllers
- **Product Controller**: Product CRUD, inventory updates, search
- **Reservation Controller**: Stock reservation management
- **Transfer Controller**: Warehouse-to-warehouse transfers
- **Batch Controller**: Bulk operations for multiple products
- **Warehouse Controller**: Warehouse management
- **Alert Controller**: Inventory alerts and notifications
- **Stock Change Controller**: Stock history tracking
- **Category Controller**: Product categorization
- **Discount Controller**: Discount management
- **Report Controller**: Inventory reporting

### Models
- **Product**: Core product with inventory, pricing, variations
- **StockReservation**: Temporary stock holds
- **StockTransfer**: Inter-warehouse movements
- **StockChange**: Historical stock changes
- **Warehouse**: Warehouse locations and details
- **Alert**: Low stock and inventory alerts
- **Category**: Product categories
- **Discount**: Pricing discounts

### Event System

#### Consumed Events
- `order.created/placed`: Deducts inventory when order is placed
- `order.cancelled`: Restores inventory when order is cancelled
- `order.returned`: Adds inventory back when order is returned
- `purchase.completed/received`: Adds inventory from supplier purchases

#### Published Events
- `product.created`: New product added
- `product.updated`: Product information changed
- `product.deleted`: Product removed
- `inventory.updated`: Stock levels changed
- `inventory.batch.updated`: Bulk inventory update
- `stock.reserved`: Stock reserved for order
- `stock.reservation.fulfilled`: Reservation converted to sale
- `stock.reservation.cancelled`: Reservation released
- `stock.reservation.expired`: Reservation timed out
- `transfer.created`: New transfer initiated
- `transfer.approved`: Transfer approved and stock deducted
- `transfer.completed`: Transfer received at destination
- `transfer.cancelled`: Transfer cancelled

## API Endpoints

### Base URL
```
http://localhost:8007/inventory
```

### Health Check
```
GET /health
```

## Service Endpoints

### 1. Products API

#### Get All Products
```
GET /v1/products
```
**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `sort` (default: -createdAt)
- `status`: active, inactive, draft
- `visibility`: public, private
- `category`: Category ID
- `brand`: Brand name
- `featured`: true/false
- `search`: Text search
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `inStock`: true/false
- `companyId`: Company ID

#### Get Product by ID
```
GET /v1/products/:id
```

#### Get Product by Slug
```
GET /v1/products/slug/:slug
```

#### Create Product
```
POST /v1/products
```
**Request Body:**
```json
{
  "name": "Premium Laptop",
  "sku": "LAP-001",
  "asin": "B08N5WRWNW",
  "companyId": "company123",
  "category": "categoryId",
  "description": "High-performance laptop",
  "pricing": {
    "basePrice": 1200,
    "salePrice": 1000,
    "costPrice": 800,
    "currency": "USD"
  },
  "inventory": {
    "quantity": 50,
    "lowStockThreshold": 10,
    "sku": "LAP-001"
  },
  "status": "active",
  "visibility": "public"
}
```

#### Update Product
```
PUT /v1/products/:id
```

#### Delete Product
```
DELETE /v1/products/:id
```

#### Update Inventory
```
PATCH /v1/products/:id/inventory
```
**Request Body:**
```json
{
  "quantity": 10,
  "operation": "increment",
  "warehouseId": "warehouse123",
  "variationId": "variation123",
  "reason": "Restock from supplier"
}
```
**Operations:** `increment`, `decrement`, `set`

#### Get Low Stock Products
```
GET /v1/products/low-stock
```
**Query Parameters:**
- `companyId`: Required
- `threshold`: Stock threshold (default: 10)

#### Search Products
```
GET /v1/products/search
```
**Query Parameters:**
- `q`: Search query (required)
- `page`, `limit`, `sort`
- `category`, `minPrice`, `maxPrice`

### 2. Reservations API

#### Create Reservation
```
POST /v1/reservations
```
**Request Body:**
```json
{
  "productId": "product123",
  "orderId": "order123",
  "customerId": "customer123",
  "quantity": 2,
  "warehouseId": "warehouse123",
  "expirationMinutes": 15
}
```

#### Get All Reservations
```
GET /v1/reservations
```
**Query Parameters:**
- `companyId`: Required
- `productId`: Filter by product
- `orderId`: Filter by order
- `status`: active, fulfilled, cancelled, expired
- `page`, `limit`

#### Get Reservation by ID
```
GET /v1/reservations/:id
```

#### Fulfill Reservation
```
PATCH /v1/reservations/:id/fulfill
```

#### Cancel Reservation
```
PATCH /v1/reservations/:id/cancel
```
**Request Body:**
```json
{
  "reason": "Customer cancelled order"
}
```

#### Get Available Stock
```
GET /v1/reservations/available-stock
```
**Query Parameters:**
- `productId`: Required
- `warehouseId`: Optional

#### Cleanup Expired Reservations
```
POST /v1/reservations/cleanup-expired
```

### 3. Warehouse Transfers API

#### Create Transfer
```
POST /v1/transfers
```
**Request Body:**
```json
{
  "companyId": "company123",
  "sourceWarehouseId": "warehouse1",
  "destinationWarehouseId": "warehouse2",
  "items": [
    {
      "productId": "product123",
      "quantity": 10,
      "notes": "Urgent transfer"
    }
  ],
  "notes": "Rebalancing inventory"
}
```

#### Get All Transfers
```
GET /v1/transfers
```
**Query Parameters:**
- `companyId`: Required
- `status`: pending, in_transit, completed, cancelled
- `sourceWarehouseId`
- `destinationWarehouseId`
- `page`, `limit`

#### Get Transfer by ID
```
GET /v1/transfers/:id
```

#### Approve Transfer
```
PATCH /v1/transfers/:id/approve
```
**Request Body:**
```json
{
  "trackingNumber": "TRK123456"
}
```

#### Complete Transfer
```
PATCH /v1/transfers/:id/complete
```

#### Cancel Transfer
```
PATCH /v1/transfers/:id/cancel
```
**Request Body:**
```json
{
  "reason": "Cancelled due to inventory recount"
}
```

### 4. Batch Operations API

#### Batch Update Inventory
```
POST /v1/batch/inventory
```
**Request Body:**
```json
{
  "companyId": "company123",
  "updates": [
    {
      "productId": "product1",
      "quantity": 50,
      "operation": "set",
      "warehouseId": "warehouse1",
      "reason": "Physical count adjustment"
    },
    {
      "productId": "product2",
      "quantity": 20,
      "operation": "increment",
      "reason": "New shipment received"
    }
  ]
}
```

#### Batch Update Prices
```
POST /v1/batch/prices
```
**Request Body:**
```json
{
  "companyId": "company123",
  "updates": [
    {
      "productId": "product1",
      "basePrice": 99.99,
      "salePrice": 79.99
    },
    {
      "productId": "product2",
      "basePrice": 149.99
    }
  ]
}
```

#### Batch Update Status
```
POST /v1/batch/status
```
**Request Body:**
```json
{
  "productIds": ["product1", "product2", "product3"],
  "status": "active",
  "visibility": "public"
}
```

#### Batch Delete Products
```
POST /v1/batch/delete
```
**Request Body:**
```json
{
  "productIds": ["product1", "product2"],
  "companyId": "company123"
}
```

#### Batch Import Products
```
POST /v1/batch/import
```
**Request Body:**
```json
{
  "companyId": "company123",
  "products": [
    {
      "name": "Product 1",
      "sku": "SKU001",
      "pricing": { "basePrice": 99.99 },
      "inventory": { "quantity": 100 }
    }
  ]
}
```

### 5. Warehouses API

#### Get All Warehouses
```
GET /v1/warehouses
```
**Query Parameters:**
- `companyId`: Required
- `page`, `limit`

#### Get Warehouse by ID
```
GET /v1/warehouses/:id
```

#### Create Warehouse
```
POST /v1/warehouses
```
**Request Body:**
```json
{
  "name": "Main Warehouse",
  "companyId": "company123",
  "location": {
    "address": "123 Warehouse St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "contact": {
    "phone": "+1234567890",
    "email": "warehouse@example.com"
  }
}
```

#### Update Warehouse
```
PUT /v1/warehouses/:id
```

#### Delete Warehouse
```
DELETE /v1/warehouses/:id
```

### 6. Alerts API

#### Get All Alerts
```
GET /v1/alerts
```
**Query Parameters:**
- `companyId`: Required
- `type`: low_stock, out_of_stock
- `isResolved`: true/false
- `page`, `limit`

#### Get Alert by ID
```
GET /v1/alerts/:id
```

#### Create Alert
```
POST /v1/alerts
```

#### Update Alert
```
PUT /v1/alerts/:id
```

#### Delete Alert
```
DELETE /v1/alerts/:id
```

#### Resolve Alert
```
PATCH /v1/alerts/:id/resolve
```

#### Get Unresolved Alerts
```
GET /v1/alerts/unresolved
```

### 7. Stock Changes API

#### Get All Stock Changes
```
GET /v1/stock-changes
```
**Query Parameters:**
- `companyId`: Required
- `productId`
- `changeType`: sale, restock, adjustment, return, transfer_in, transfer_out
- `page`, `limit`

#### Get Stock Change by ID
```
GET /v1/stock-changes/:id
```

#### Get Stock History
```
GET /v1/stock-changes/history
```
**Query Parameters:**
- `productId`: Required
- `variationId`
- `startDate`, `endDate`
- `changeType`

## Event Integration Guide

### Consuming Events from Inventory Service

#### Subscribe to Product Events
```javascript
channel.consume('product.events', (msg) => {
  const event = JSON.parse(msg.content.toString());

  switch(event.eventType) {
    case 'product.created':
      // Handle new product
      break;
    case 'product.updated':
      // Handle product update
      break;
    case 'product.deleted':
      // Handle product deletion
      break;
  }

  channel.ack(msg);
});
```

#### Subscribe to Inventory Events
```javascript
channel.consume('inventory.events', (msg) => {
  const event = JSON.parse(msg.content.toString());

  switch(event.eventType) {
    case 'inventory.updated':
      // Update your cache/database
      break;
    case 'stock.reserved':
      // Handle reservation
      break;
  }

  channel.ack(msg);
});
```

### Publishing Events to Inventory Service

#### Order Service Integration
```javascript
// When order is placed
channel.sendToQueue('order.events', Buffer.from(JSON.stringify({
  eventType: 'order.placed',
  data: {
    orderId: 'ORD123',
    companyId: 'company123',
    warehouseId: 'warehouse1',
    items: [
      {
        productId: 'product123',
        variationId: 'var123',
        quantity: 2
      }
    ]
  }
})));

// When order is cancelled
channel.sendToQueue('order.events', Buffer.from(JSON.stringify({
  eventType: 'order.cancelled',
  data: {
    orderId: 'ORD123',
    companyId: 'company123',
    items: [...]
  }
})));
```

#### Purchase Service Integration
```javascript
// When purchase is received
channel.sendToQueue('purchase.events', Buffer.from(JSON.stringify({
  eventType: 'purchase.received',
  data: {
    purchaseId: 'PUR123',
    companyId: 'company123',
    warehouseId: 'warehouse1',
    supplierId: 'supplier123',
    items: [
      {
        productId: 'product123',
        quantity: 100
      }
    ]
  }
})));
```

## Best Practices

### Stock Reservations
1. Always set appropriate expiration times (15-30 minutes)
2. Implement cleanup jobs to expire old reservations
3. Fulfill or cancel reservations promptly
4. Check available stock before creating reservations

### Warehouse Transfers
1. Always approve transfers before shipping
2. Complete transfers only when stock is physically received
3. Cancel in-transit transfers if needed (restores source stock)
4. Track transfers with tracking numbers

### Batch Operations
1. Limit batch size to prevent timeouts (max 100-500 items)
2. Handle partial failures gracefully
3. Use batch operations for imports and mass updates
4. Review failed items and retry if necessary

### Event Processing
1. Always acknowledge messages after successful processing
2. Implement retry logic for failed events
3. Use dead-letter queues for permanent failures
4. Monitor event lag and processing times

### Inventory Management
1. Regular stock audits and reconciliation
2. Set appropriate low-stock thresholds
3. Monitor and act on alerts promptly
4. Keep audit trails for compliance

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be positive"
    }
  ]
}
```

## Performance Considerations

1. **Pagination**: Always use pagination for large datasets
2. **Filtering**: Use query parameters to reduce response size
3. **Caching**: Cache frequently accessed products
4. **Indexing**: MongoDB indexes on companyId, status, category
5. **Event Processing**: Asynchronous processing prevents blocking

## Monitoring & Logging

The service uses Winston logger with multiple transports:
- Console logs for development
- File logs for production (`logs/` directory)
- Structured logging with timestamps and levels

Monitor these metrics:
- Event processing time
- API response times
- Stock reservation expiry rate
- Transfer completion time
- Alert generation frequency

## Security

1. **Authentication**: Implement JWT authentication middleware
2. **Authorization**: Validate user permissions per company
3. **Data Isolation**: Filter all queries by companyId
4. **Input Validation**: Express-validator on all inputs
5. **Rate Limiting**: Implement rate limits on endpoints

## Deployment

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/inventory
RABBITMQ_URL=amqp://localhost:5672
PORT=8007
NODE_ENV=production
```

### Docker Deployment
```bash
docker build -t inventory-service .
docker run -p 8007:8007 \
  -e MONGODB_URI=mongodb://mongo:27017/inventory \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  inventory-service
```

## Troubleshooting

### Common Issues

1. **RabbitMQ Connection Failed**
   - Check RABBITMQ_URL environment variable
   - Ensure RabbitMQ is running and accessible
   - Check firewall rules

2. **Stock Not Updating from Events**
   - Verify event consumers are running
   - Check RabbitMQ queues for messages
   - Review logs for processing errors

3. **Reservations Not Expiring**
   - Run cleanup endpoint manually
   - Implement scheduled job for cleanup
   - Check system time synchronization

4. **Transfer Stock Issues**
   - Verify warehouse IDs are correct
   - Check product stock in source warehouse
   - Ensure transfer is in correct status

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review API documentation
- Monitor RabbitMQ management console
- Check MongoDB for data consistency
