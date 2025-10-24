# Use Cases and System Flows

## Table of Contents
1. [Authentication Use Cases](#authentication-use-cases)
2. [E-commerce Customer Journey](#ecommerce-customer-journey)
3. [Company Management Workflows](#company-management-workflows)
4. [Shop Operations](#shop-operations)
5. [Order Fulfillment Process](#order-fulfillment-process)
6. [Inventory Management](#inventory-management)
7. [Notification Scenarios](#notification-scenarios)
8. [Analytics and Reporting](#analytics-and-reporting)

---

## Authentication Use Cases

### UC-1: Customer Registration

**Actor**: New Customer

**Flow**:
```
1. Customer opens registration page
2. Enters email, password, name, phone
3. Frontend → API Gateway → Auth Service: POST /api/auth/register
4. Auth Service validates data
5. Auth Service creates user with role='customer'
6. Auth Service generates JWT token
7. Auth Service → RabbitMQ: user.registered event
8. Notification Service ← RabbitMQ: Sends welcome email
9. Audit Service ← RabbitMQ: Logs registration
10. Auth Service → API Gateway → Frontend: Returns user + token
11. Frontend stores token and redirects to home
```

**API Call**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "customer"
}

Response 201:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user123",
      "email": "customer@example.com",
      "role": "customer",
      "profile": {...}
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here"
  }
}
```

**Events Published**:
- `user.registered` → notification.events, audit.events, analytics.events

---

### UC-2: Company Admin Login

**Actor**: Company Administrator

**Flow**:
```
1. Company Admin opens admin portal
2. Enters email and password
3. Frontend → API Gateway → Auth Service: POST /api/auth/login
4. Auth Service validates credentials
5. Auth Service checks if user is company_admin
6. Auth Service generates JWT with companyId
7. Auth Service updates lastLogin timestamp
8. Auth Service → Frontend: Returns user + token + company details
9. Frontend stores token and navigates to dashboard
10. Frontend → API Gateway → Company Service: GET /api/companies/:id
11. Frontend → API Gateway → Analytics Service: GET /api/analytics/dashboard
12. Dashboard displays company overview
```

**API Call**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "AdminPass123!"
}

Response 200:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user456",
      "email": "admin@company.com",
      "role": "company_admin",
      "companyId": "company123",
      "shopIds": ["shop1", "shop2"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here"
  }
}
```

---

### UC-3: Super Admin Managing Companies

**Actor**: Super Admin (You)

**Flow**:
```
1. Super Admin logs in
2. Token contains role='super_admin'
3. Super Admin → API Gateway → Company Service: GET /api/companies
4. View all companies list
5. Super Admin creates new company: POST /api/companies
6. Company Service creates company record
7. Company Service → RabbitMQ: company.created
8. Audit Service logs creation
9. Analytics Service tracks new company
10. Super Admin can assign company admin
```

---

## E-commerce Customer Journey

### UC-4: Product Discovery and Search

**Actor**: Customer (logged in or guest)

**Flow**:
```
1. Customer visits e-commerce site
2. Frontend → API Gateway → Ecommerce Service: GET /api/products
3. Ecommerce Service returns product catalog
4. Customer uses search: GET /api/products?search=laptop&minPrice=500&maxPrice=2000
5. Ecommerce Service performs full-text search with filters
6. Results sorted by relevance/price/rating
7. Customer views product: GET /api/products/:id
8. Ecommerce Service logs view
9. Ecommerce Service → RabbitMQ: product.viewed
10. Analytics Service tracks view for recommendations
```

**API Calls**:
```http
# Search products
GET /api/products?search=laptop&category=electronics&minPrice=500&maxPrice=2000&sort=price_asc&page=1&limit=20
Authorization: Bearer optional_token

Response 200:
{
  "success": true,
  "data": [
    {
      "_id": "prod123",
      "name": "Dell XPS 15 Laptop",
      "price": 1299.99,
      "salePrice": 1199.99,
      "images": ["url1", "url2"],
      "rating": 4.5,
      "reviews": 234,
      "inStock": true,
      "shopId": "shop1",
      "companyId": "company1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}

# Get recommendations
GET /api/recommendations
Authorization: Bearer user_token

Response 200:
{
  "success": true,
  "data": {
    "forYou": [...],  // Based on user history
    "trending": [...],  // Popular products
    "similar": [...]  // Similar to viewed products
  }
}
```

---

### UC-5: Add to Cart and Checkout

**Actor**: Customer (logged in)

**Complete Flow**:
```
1. Customer browsing products
2. Customer clicks "Add to Cart"
3. Frontend → API Gateway → Ecommerce Service: POST /api/cart/items
4. Ecommerce Service checks stock availability
5. Ecommerce Service → Inventory Service: Check available stock
6. Inventory Service confirms availability
7. Ecommerce Service adds item to cart
8. Ecommerce Service → RabbitMQ: cart.item_added
9. Frontend updates cart count
10. Customer continues shopping or goes to cart
11. Customer reviews cart: GET /api/cart
12. Customer proceeds to checkout
13. Frontend → API Gateway → Sales Service: POST /api/orders
14. Sales Service validates cart items
15. Sales Service creates order with status='pending'
16. Sales Service → RabbitMQ: order.created
17. Inventory Service ← RabbitMQ: Creates stock reservation
18. Payment Service ← RabbitMQ: Prepares payment
19. Frontend redirects to payment page
20. Customer enters payment details
21. Frontend → API Gateway → Payment Service: POST /api/payments/process
22. Payment Service calls payment gateway (Stripe/PayPal)
23. Payment gateway processes payment
24. Payment Service → RabbitMQ: payment.success
25. Sales Service ← RabbitMQ: Updates order status='confirmed'
26. Inventory Service ← RabbitMQ: Fulfills reservation, deducts stock
27. Notification Service ← RabbitMQ: Sends order confirmation email + SMS
28. WebSocket Service ← RabbitMQ: Sends real-time notification
29. Audit Service logs entire transaction
30. Analytics Service updates metrics
31. Customer sees order confirmation
```

**API Calls**:
```http
# Add to cart
POST /api/cart/items
Authorization: Bearer user_token
Content-Type: application/json

{
  "productId": "prod123",
  "quantity": 1,
  "shopId": "shop1"
}

Response 201:
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "items": [{
        "productId": "prod123",
        "name": "Dell XPS 15",
        "quantity": 1,
        "price": 1199.99,
        "subtotal": 1199.99
      }],
      "total": 1199.99
    }
  }
}

# Create order
POST /api/orders
Authorization: Bearer user_token
Content-Type: application/json

{
  "items": [{
    "productId": "prod123",
    "quantity": 1,
    "price": 1199.99
  }],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": {...},
  "shopId": "shop1"
}

Response 201:
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-001",
    "status": "pending",
    "total": 1299.98,
    "paymentRequired": true
  }
}

# Process payment
POST /api/payments/process
Authorization: Bearer user_token
Content-Type: application/json

{
  "orderId": "ORD-2024-001",
  "amount": 1299.98,
  "paymentMethod": "card",
  "gateway": "stripe",
  "paymentDetails": {
    "cardToken": "tok_xxxxx"
  }
}

Response 200:
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "paymentId": "pay123",
    "transactionId": "ch_xxxxx",
    "status": "completed"
  }
}
```

**Events Published**:
```
cart.item_added → analytics.events
order.created → inventory.events, payment.events, notification.events, audit.events
payment.success → order.events, notification.events, analytics.events
inventory.updated → notification.events (if low stock)
```

---

## Company Management Workflows

### UC-6: Company Creates New Shop

**Actor**: Company Admin

**Flow**:
```
1. Company Admin logs into admin portal
2. Navigates to "Shops" section
3. Clicks "Add New Shop"
4. Frontend → API Gateway → Shop Service: POST /api/shops
5. Shop Service validates company ownership
6. Shop Service creates shop record
7. Shop Service → RabbitMQ: shop.created
8. Inventory Service ← RabbitMQ: Creates warehouse for shop
9. Audit Service logs creation
10. Company Admin assigns shop manager
11. Frontend → API Gateway → Shop Service: POST /api/shops/:id/staff
12. Shop Service assigns manager
13. Auth Service updates user's shopIds array
14. Notification Service sends assignment notification to manager
```

**API Calls**:
```http
# Create shop
POST /api/shops
Authorization: Bearer company_admin_token
Content-Type: application/json

{
  "name": "Downtown Store",
  "companyId": "company123",
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
    "email": "downtown@company.com"
  },
  "operatingHours": [
    {"day": "Monday", "open": "09:00", "close": "18:00"},
    {"day": "Tuesday", "open": "09:00", "close": "18:00"}
  ]
}

Response 201:
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "shopId": "shop123",
    "name": "Downtown Store",
    "companyId": "company123",
    "warehouseId": "warehouse123"
  }
}

# Assign staff
POST /api/shops/shop123/staff
Authorization: Bearer company_admin_token
Content-Type: application/json

{
  "userId": "user789",
  "role": "shop_manager"
}

Response 200:
{
  "success": true,
  "message": "Staff assigned successfully"
}
```

---

### UC-7: Company Adds Products to Inventory

**Actor**: Company Admin / Shop Manager

**Flow**:
```
1. Company Admin navigates to inventory
2. Clicks "Add Product"
3. Frontend → API Gateway → Inventory Service: POST /api/inventory/v1/products
4. Inventory Service validates data
5. Inventory Service creates product
6. Inventory Service → RabbitMQ: product.created
7. Ecommerce Service ← RabbitMQ: Adds product to catalog
8. Analytics Service ← RabbitMQ: Tracks new product
9. Audit Service logs creation
10. Product appears in both inventory and e-commerce catalog
```

**API Call**:
```http
POST /api/inventory/v1/products
Authorization: Bearer company_admin_token
Content-Type: application/json

{
  "name": "MacBook Pro 16\"",
  "sku": "MBP-16-2024",
  "companyId": "company123",
  "category": "electronics",
  "description": "Powerful laptop for professionals",
  "pricing": {
    "basePrice": 2499.99,
    "salePrice": 2299.99,
    "costPrice": 2000.00,
    "currency": "USD"
  },
  "inventory": {
    "quantity": 50,
    "lowStockThreshold": 10,
    "sku": "MBP-16-2024"
  },
  "images": ["url1", "url2"],
  "specifications": {
    "processor": "M3 Pro",
    "ram": "32GB",
    "storage": "1TB SSD"
  },
  "status": "active",
  "visibility": "public"
}

Response 201:
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "productId": "prod456",
    "sku": "MBP-16-2024",
    "name": "MacBook Pro 16\"",
    "inventory": {
      "quantity": 50,
      "available": 50,
      "reserved": 0
    }
  }
}
```

---

## Shop Operations

### UC-8: Shop Manager Processes In-Store Sale

**Actor**: Shop Manager/Staff

**Flow**:
```
1. Customer comes to physical shop
2. Staff scans products or adds manually
3. Shop Terminal → API Gateway → Sales Service: POST /api/orders
4. Set order source as 'in_store'
5. Sales Service creates order
6. Shop Terminal → Payment Service: Process payment (cash/card)
7. Payment confirmed immediately
8. Inventory Service deducts stock from shop warehouse
9. Receipt printed/emailed
10. Customer receives items
```

---

### UC-9: Transfer Stock Between Shops

**Actor**: Company Admin / Shop Manager

**Flow**:
```
1. Shop Manager requests stock transfer
2. Frontend → API Gateway → Inventory Service: POST /api/inventory/v1/transfers
3. Inventory Service validates source shop has stock
4. Inventory Service creates transfer with status='pending'
5. Inventory Service → RabbitMQ: transfer.created
6. Company Admin/Warehouse Manager receives approval request
7. Frontend → API Gateway → Inventory Service: PATCH /api/inventory/v1/transfers/:id/approve
8. Inventory Service deducts stock from source warehouse
9. Transfer status = 'in_transit'
10. Inventory Service → RabbitMQ: transfer.approved
11. Notification Service sends tracking info
12. Destination shop receives shipment
13. Frontend → Inventory Service: PATCH /api/inventory/v1/transfers/:id/complete
14. Inventory Service adds stock to destination warehouse
15. Inventory Service → RabbitMQ: transfer.completed
16. Audit Service logs entire transfer
```

**API Calls**:
```http
# Create transfer
POST /api/inventory/v1/transfers
Authorization: Bearer shop_manager_token
Content-Type: application/json

{
  "companyId": "company123",
  "sourceWarehouseId": "warehouse1",
  "destinationWarehouseId": "warehouse2",
  "items": [
    {
      "productId": "prod123",
      "quantity": 20,
      "notes": "Rebalancing inventory"
    }
  ],
  "notes": "Transfer for downtown store opening"
}

Response 201:
{
  "success": true,
  "message": "Transfer created successfully",
  "data": {
    "transferId": "transfer123",
    "status": "pending",
    "items": [...]
  }
}

# Approve transfer
PATCH /api/inventory/v1/transfers/transfer123/approve
Authorization: Bearer company_admin_token
Content-Type: application/json

{
  "trackingNumber": "TRACK123456"
}

# Complete transfer
PATCH /api/inventory/v1/transfers/transfer123/complete
Authorization: Bearer shop_manager_token
```

---

## Order Fulfillment Process

### UC-10: Complete Order Lifecycle

**Actors**: Customer, Shop Staff, Delivery Service

**Flow**:
```
1. Order created (status='pending')
2. Payment processed (status='confirmed')
3. Shop Manager → Sales Service: PATCH /api/orders/:id/status
4. Status = 'processing'
5. Sales Service → RabbitMQ: order.processing
6. Shop staff picks items from warehouse
7. Shop Manager updates: status='shipped'
8. Sales Service → RabbitMQ: order.shipped
9. Notification Service sends tracking email + SMS
10. WebSocket Service sends real-time update
11. Customer tracks order via tracking number
12. Delivery person updates: status='delivered'
13. Sales Service → RabbitMQ: order.delivered
14. Notification Service confirms delivery
15. After 7 days, status automatically becomes 'completed'
16. Analytics Service updates completion metrics
```

**Status Update API**:
```http
PATCH /api/orders/ORD-2024-001/status
Authorization: Bearer shop_manager_token
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "USPS1234567890",
  "carrier": "USPS",
  "estimatedDelivery": "2024-03-15"
}

Response 200:
{
  "success": true,
  "message": "Order status updated",
  "data": {
    "orderId": "ORD-2024-001",
    "status": "shipped",
    "trackingNumber": "USPS1234567890"
  }
}
```

---

## Inventory Management

### UC-11: Low Stock Alert and Reorder

**Actor**: System Automated + Company Admin

**Flow**:
```
1. Order placed, inventory reduced
2. Inventory Service checks if quantity < lowStockThreshold
3. Inventory Service creates alert
4. Inventory Service → RabbitMQ: inventory.low_stock
5. Notification Service ← RabbitMQ: Sends critical SMS + Email
6. WebSocket Service ← RabbitMQ: Real-time alert on dashboard
7. Company Admin sees alert
8. Company Admin creates purchase order or transfer
9. When stock replenished, alert marked as resolved
```

**Alert Event**:
```json
{
  "eventType": "inventory.low_stock",
  "data": {
    "productId": "prod123",
    "productName": "Dell XPS 15",
    "currentQuantity": 5,
    "lowStockThreshold": 10,
    "warehouseId": "warehouse1",
    "shopId": "shop1",
    "companyId": "company123",
    "alertId": "alert123"
  },
  "priority": "critical",
  "timestamp": "2024-03-10T10:30:00Z"
}
```

---

## Notification Scenarios

### UC-12: Critical Notification Flow (Order Confirmation)

**Trigger**: Order successfully created and paid

**Flow**:
```
1. Payment Service → RabbitMQ: payment.success
2. Notification Service ← RabbitMQ: Receives event
3. Notification Service determines priority='critical'
4. Notification Service sends:
   a) SMS to customer phone
   b) Email to customer email
   c) Firebase push notification to mobile app
5. Notification Service logs delivery status
6. Customer receives all 3 notifications within seconds
```

**Notification Channels by Priority**:
- **Critical**: SMS + Email + Push (order confirmation, payment issues)
- **Important**: Email + Push (order updates, low stock)
- **Normal**: Push only (recommendations, new products)

---

### UC-13: Scheduled Notification (Debt Payment Reminder)

**Trigger**: Payment due date approaching

**Flow**:
```
1. Debt Service checks payment schedules daily
2. Finds payment due in 3 days
3. Debt Service → RabbitMQ: debt.payment_due
4. Notification Service ← RabbitMQ: Schedules notification
5. Notification Service schedules SMS + Email for 2 days before
6. Scheduled job sends reminder
7. If not paid by due date, sends overdue notice
```

---

## Analytics and Reporting

### UC-14: Company Dashboard Analytics

**Actor**: Company Admin

**Flow**:
```
1. Company Admin logs in
2. Frontend → API Gateway → Analytics Service: GET /api/analytics/dashboard?companyId=company123
3. Analytics Service aggregates data from multiple sources:
   - Sales Service: Total orders, revenue
   - Inventory Service: Stock levels, low stock count
   - Customer Service: New customers, repeat customers
   - Payment Service: Payment success rate
4. Analytics Service returns dashboard metrics
5. Frontend displays charts and graphs
6. Real-time updates via WebSocket
```

**Dashboard API**:
```http
GET /api/analytics/dashboard?companyId=company123&period=30d
Authorization: Bearer company_admin_token

Response 200:
{
  "success": true,
  "data": {
    "period": "30d",
    "revenue": {
      "total": 125000.50,
      "growth": 15.5,
      "trend": [...]
    },
    "orders": {
      "total": 450,
      "completed": 420,
      "cancelled": 15,
      "pending": 15
    },
    "customers": {
      "new": 89,
      "returning": 156,
      "totalActive": 245
    },
    "inventory": {
      "lowStockItems": 12,
      "outOfStockItems": 3,
      "totalProducts": 234
    },
    "topProducts": [...],
    "revenueByShop": [...]
  }
}
```

---

## Complete User Scenarios

### Scenario A: First-time Customer Purchase

```
1. Customer discovers site → browses products
2. Creates account → receives welcome email
3. Searches for "running shoes"
4. Views product details → sees recommendations
5. Adds to cart → continues shopping
6. Adds another item → goes to cart
7. Proceeds to checkout → enters shipping address
8. Pays with credit card → payment processed
9. Receives order confirmation (SMS + Email + Push)
10. Tracks order status in real-time
11. Receives shipping notification with tracking
12. Order delivered → receives delivery confirmation
13. Writes review → gets loyalty points
```

### Scenario B: Company Onboarding

```
1. Super Admin (You) creates company account
2. Sets up company profile and subscription
3. Creates initial shop locations
4. Assigns company admin
5. Company admin logs in → sets up branding
6. Creates shop managers for each location
7. Bulk imports product catalog
8. Sets up warehouses and initial inventory
9. Configures payment methods
10. Sets up notification preferences
11. Trains shop staff → assigns roles
12. Goes live → starts accepting orders
13. Monitors analytics dashboard
```

### Scenario C: Daily Shop Operations

```
1. Shop Manager logs in → sees daily dashboard
2. Reviews new online orders for pickup
3. Processes in-store sales via POS
4. Receives low stock alert for popular item
5. Requests stock transfer from main warehouse
6. Updates inventory after receiving shipment
7. Processes returns and refunds
8. Reviews daily sales report
9. Closes day → generates end-of-day report
```

---

## Event Relationships

```
user.registered
  → notification.send (welcome email)
  → analytics.track (new user)

order.created
  → inventory.reserve (hold stock)
  → payment.initiate
  → notification.send (order confirmation)
  → audit.log (order created)

payment.success
  → order.update (status confirmed)
  → inventory.deduct (finalize stock reduction)
  → notification.send (payment receipt)
  → analytics.track (revenue)
  → debt.record (if applicable)

inventory.low_stock
  → notification.send (critical alert to admin)
  → websocket.broadcast (real-time alert)

order.shipped
  → notification.send (tracking info)
  → websocket.broadcast (status update)
  → analytics.track (fulfillment)

order.delivered
  → notification.send (delivery confirmation)
  → analytics.track (completion)
  → order.update (status completed)
```

---

## API Gateway Routing Summary

All client requests go through the API Gateway at `http://localhost:8000`:

| Route | Service | Auth Required | Rate Limit |
|-------|---------|---------------|------------|
| `/api/auth/*` | Auth Service | No | 5/15min |
| `/api/companies/*` | Company Service | Yes | 100/15min |
| `/api/shops/*` | Shop Service | Yes | 100/15min |
| `/api/products/*` | Ecommerce Service | Optional | 100/15min |
| `/api/cart/*` | Ecommerce Service | Yes | 100/15min |
| `/api/orders/*` | Sales Service | Yes | 100/15min |
| `/api/payments/*` | Payment Service | Yes | 100/15min |
| `/api/inventory/*` | Inventory Service | Yes | 100/15min |
| `/api/notifications/*` | Notification Service | Yes | 100/15min |
| `/api/audit/*` | Audit Service | Yes | 100/15min |
| `/api/analytics/*` | Analytics Service | Yes | 100/15min |
| `/api/debts/*` | Debt Service | Yes | 100/15min |

---

This documentation provides comprehensive use cases covering all major workflows in the e-commerce and inventory management platform.
