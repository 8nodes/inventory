# E-Commerce + Inventory Management Platform - Microservices Architecture

## System Overview

This is a comprehensive, enterprise-grade microservices-based e-commerce and inventory management platform designed to handle complex multi-tenant operations with real-time communication, robust authentication, and scalable architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                             │
│  (Web App, Mobile App, Admin Dashboard, Company Portal, Shop Terminal)  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    API GATEWAY :8000    │
                    │  - Routing              │
                    │  - Rate Limiting        │
                    │  - Auth Verification    │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼──────────┐  ┌───────▼──────────┐  ┌──────▼────────────┐
│  AUTH SERVICE      │  │  COMPANY SERVICE │  │  SHOP SERVICE     │
│  :8001             │  │  :8002           │  │  :8003            │
│  - Authentication  │  │  - Company Mgmt  │  │  - Shop Mgmt      │
│  - User Mgmt       │  │  - Multi-tenant  │  │  - Staff Mgmt     │
│  - JWT Tokens      │  │  - Super Admin   │  │  - Locations      │
└────────────────────┘  └──────────────────┘  └───────────────────┘

┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ ECOMMERCE SERVICE   │  │  SALES SERVICE     │  │ PAYMENT SERVICE  │
│ :8004               │  │  :8005             │  │ :8006            │
│ - Product Catalog   │  │  - Order Mgmt      │  │ - Payment Gateway│
│ - Cart & Wishlist   │  │  - Order Tracking  │  │ - Stripe/PayPal  │
│ - Recommendations   │  │  - Returns         │  │ - Refunds        │
│ - Search & Filter   │  │  - Fulfillment     │  │ - Transactions   │
└─────────────────────┘  └────────────────────┘  └──────────────────┘

┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ INVENTORY SERVICE   │  │ NOTIFICATION SVC   │  │ WEBSOCKET SVC    │
│ :8007               │  │ :8008              │  │ :8009            │
│ - Stock Mgmt        │  │ - Email (SMTP)     │  │ - Real-time      │
│ - Warehouses        │  │ - SMS              │  │ - Push Updates   │
│ - Transfers         │  │ - Firebase Push    │  │ - Live Events    │
│ - Alerts            │  │ - Scheduling       │  │ - Chat           │
└─────────────────────┘  └────────────────────┘  └──────────────────┘

┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│  AUDIT SERVICE      │  │  ANALYTICS SVC     │  │  DEBT SERVICE    │
│  :8010              │  │  :8011             │  │  :8012           │
│  - Activity Logs    │  │  - Reports         │  │  - Debt Tracking │
│  - Compliance       │  │  - Insights        │  │  - Payment Plans │
│  - Change History   │  │  - Dashboards      │  │  - Collections   │
│  - Security Events  │  │  - Forecasting     │  │  - Reminders     │
└─────────────────────┘  └────────────────────┘  └──────────────────┘

                    ┌────────────────────────┐
                    │   EVENT BUS (RabbitMQ) │
                    │   :5672 / :15672       │
                    │   - Message Broker     │
                    │   - Event Distribution │
                    └────────────────────────┘

                    ┌────────────────────────┐
                    │   DATABASE (MongoDB)   │
                    │   :27017               │
                    │   - Multi-database     │
                    │   - Service Isolation  │
                    └────────────────────────┘
```

## Services Overview

### 1. API Gateway (:8000)
**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Request routing to appropriate services
- Authentication verification
- Rate limiting and throttling
- Load balancing
- Request/response transformation
- CORS handling

**Key Features**:
- JWT token validation
- Service health monitoring
- Request logging
- Error handling

**Routes**:
- `/api/auth/*` → Auth Service
- `/api/companies/*` → Company Service
- `/api/shops/*` → Shop Service
- `/api/products/*` → E-commerce Service
- `/api/orders/*` → Sales Service
- `/api/payments/*` → Payment Service
- `/api/inventory/*` → Inventory Service
- `/api/notifications/*` → Notification Service
- `/api/audit/*` → Audit Service
- `/api/analytics/*` → Analytics Service
- `/api/debts/*` → Debt Service

---

### 2. Auth Service (:8001)
**Purpose**: Centralized authentication and user management

**Responsibilities**:
- User registration and login
- Password management
- Token generation and validation
- Role-based access control (RBAC)
- Session management

**User Roles**:
1. **Super Admin** - Platform owner, manages all companies
2. **Company Admin** - Manages company operations and shops
3. **Shop Manager** - Manages shop operations
4. **Shop Staff** - Limited shop operations
5. **Customer** - E-commerce users

**Endpoints**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/logout` - Logout user
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile
- `POST /auth/change-password` - Change password
- `GET /auth/verify` - Verify token

**Events Published**:
- `user.registered`
- `user.updated`
- `user.logged_in`
- `user.logged_out`

---

### 3. Company Service (:8002)
**Purpose**: Multi-tenant company management

**Responsibilities**:
- Company CRUD operations
- Company settings and configuration
- Subscription management
- Company-level permissions
- Branding and customization

**Data Model**:
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  logo: String,
  description: String,
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  address: Object,
  settings: {
    currency: String,
    timezone: String,
    taxRate: Number
  },
  subscription: {
    plan: String,
    status: String,
    expiresAt: Date
  },
  ownerId: ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Endpoints**:
- `GET /companies` - List companies (Super Admin)
- `POST /companies` - Create company (Super Admin)
- `GET /companies/:id` - Get company details
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company
- `PATCH /companies/:id/settings` - Update settings
- `GET /companies/:id/stats` - Company statistics

**Events Published**:
- `company.created`
- `company.updated`
- `company.deleted`

---

### 4. Shop Service (:8003)
**Purpose**: Multi-shop management for companies

**Responsibilities**:
- Shop CRUD operations
- Staff assignment
- Shop inventory allocation
- Location management
- Operating hours

**Data Model**:
```javascript
{
  _id: ObjectId,
  name: String,
  companyId: ObjectId,
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contactInfo: Object,
  operatingHours: Array,
  managerId: ObjectId,
  staffIds: [ObjectId],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Endpoints**:
- `GET /shops` - List shops
- `POST /shops` - Create shop
- `GET /shops/:id` - Get shop details
- `PUT /shops/:id` - Update shop
- `DELETE /shops/:id` - Delete shop
- `POST /shops/:id/staff` - Assign staff
- `GET /shops/:id/performance` - Shop performance

**Events Published**:
- `shop.created`
- `shop.updated`
- `shop.deleted`
- `shop.staff_assigned`

---

### 5. E-commerce Service (:8004)
**Purpose**: Customer-facing product catalog and shopping

**Responsibilities**:
- Product browsing and search
- Shopping cart management
- Wishlist management
- Product recommendations
- Reviews and ratings

**Key Features**:
- **Advanced Search**: Full-text search with filters
- **Smart Filters**: Price range, category, brand, ratings
- **Sorting**: Price, popularity, newest, rating
- **Recommendations**:
  - Collaborative filtering (users who bought this also bought)
  - Content-based filtering (similar products)
  - Trending products
  - Personalized suggestions

**Data Models**:
```javascript
// Cart
{
  userId: ObjectId,
  items: [{
    productId: ObjectId,
    quantity: Number,
    price: Number,
    shopId: ObjectId
  }],
  total: Number,
  updatedAt: Date
}

// Wishlist
{
  userId: ObjectId,
  products: [ObjectId],
  updatedAt: Date
}

// Product View (for recommendations)
{
  userId: ObjectId,
  productId: ObjectId,
  viewedAt: Date,
  duration: Number
}
```

**Endpoints**:
- `GET /products` - List/search products
- `GET /products/:id` - Get product details
- `GET /products/recommendations` - Get recommendations
- `GET /cart` - Get cart
- `POST /cart/items` - Add to cart
- `PUT /cart/items/:id` - Update cart item
- `DELETE /cart/items/:id` - Remove from cart
- `GET /wishlist` - Get wishlist
- `POST /wishlist/items` - Add to wishlist
- `DELETE /wishlist/items/:id` - Remove from wishlist

**Events Published**:
- `product.viewed`
- `cart.item_added`
- `cart.updated`
- `wishlist.item_added`

**Events Consumed**:
- `product.created`
- `product.updated`
- `inventory.updated`

---

### 6. Sales Service (:8005)
**Purpose**: Order processing and fulfillment

**Responsibilities**:
- Order creation and management
- Order status tracking
- Order fulfillment
- Returns and refunds
- Invoicing

**Order Lifecycle**:
```
pending → confirmed → processing → shipped → delivered → completed
                          ↓
                    cancelled/returned
```

**Data Model**:
```javascript
{
  _id: ObjectId,
  orderNumber: String,
  customerId: ObjectId,
  companyId: ObjectId,
  shopId: ObjectId,
  items: [{
    productId: ObjectId,
    quantity: Number,
    price: Number,
    subtotal: Number
  }],
  pricing: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    total: Number
  },
  shippingAddress: Object,
  billingAddress: Object,
  status: String,
  paymentStatus: String,
  paymentId: ObjectId,
  trackingNumber: String,
  notes: String,
  statusHistory: Array,
  createdAt: Date,
  updatedAt: Date
}
```

**Endpoints**:
- `POST /orders` - Create order
- `GET /orders` - List orders
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id/status` - Update order status
- `POST /orders/:id/cancel` - Cancel order
- `POST /orders/:id/return` - Return order
- `GET /orders/:id/tracking` - Get tracking info
- `GET /orders/:id/invoice` - Generate invoice

**Events Published**:
- `order.created`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`
- `order.returned`

**Events Consumed**:
- `payment.success`
- `payment.failed`
- `inventory.updated`

---

### 7. Payment Service (:8006)
**Purpose**: Payment processing and transaction management

**Responsibilities**:
- Payment gateway integration
- Transaction processing
- Refund management
- Payment method storage
- Transaction history

**Supported Gateways**:
- Stripe
- PayPal
- (Extensible for more)

**Data Model**:
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,
  customerId: ObjectId,
  companyId: ObjectId,
  amount: Number,
  currency: String,
  paymentMethod: String,
  gateway: String,
  gatewayTransactionId: String,
  status: String, // pending, processing, completed, failed, refunded
  metadata: Object,
  createdAt: Date,
  completedAt: Date
}
```

**Endpoints**:
- `POST /payments/intent` - Create payment intent
- `POST /payments/process` - Process payment
- `POST /payments/:id/refund` - Refund payment
- `GET /payments/:id` - Get payment details
- `GET /payments/history` - Payment history
- `POST /payments/webhooks/stripe` - Stripe webhook
- `POST /payments/webhooks/paypal` - PayPal webhook

**Events Published**:
- `payment.initiated`
- `payment.processing`
- `payment.success`
- `payment.failed`
- `payment.refunded`

**Events Consumed**:
- `order.created`
- `order.cancelled`

---

### 8. Inventory Service (:8007)
**Purpose**: Stock and warehouse management (Already implemented)

**Responsibilities**:
- Product inventory tracking
- Multi-warehouse management
- Stock transfers
- Low stock alerts
- Inventory adjustments
- Stock reservations

**See**: `INVENTORY_SERVICE_DOCUMENTATION.md` for complete details

---

### 9. Notification Service (:8008)
**Purpose**: Multi-channel notification delivery

**Responsibilities**:
- Email notifications (SMTP)
- SMS notifications
- Firebase push notifications
- Notification scheduling
- Template management
- Delivery tracking

**Notification Types**:
1. **Critical** - Immediate SMS + Email (order confirmations, payment issues)
2. **Important** - Email + Push (order updates, low stock alerts)
3. **Informational** - Push only (recommendations, promotions)

**Data Model**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String, // email, sms, push
  priority: String, // critical, high, normal, low
  channel: String,
  subject: String,
  content: String,
  metadata: Object,
  status: String, // pending, sent, failed, delivered
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date
}
```

**Endpoints**:
- `POST /notifications/send` - Send notification
- `POST /notifications/schedule` - Schedule notification
- `GET /notifications` - List notifications
- `GET /notifications/:id` - Get notification details
- `GET /notifications/templates` - List templates
- `POST /notifications/templates` - Create template

**Events Consumed**:
- `user.registered`
- `order.created`
- `order.shipped`
- `payment.success`
- `payment.failed`
- `inventory.low_stock`
- `inventory.out_of_stock`

---

### 10. WebSocket Service (:8009)
**Purpose**: Real-time bidirectional communication

**Responsibilities**:
- Real-time notifications
- Live order tracking
- Live inventory updates
- Chat support
- Real-time analytics updates

**Features**:
- Socket.IO implementation
- Room-based communication
- Authentication
- Presence detection
- Message persistence

**Events**:
- `order:status_updated`
- `inventory:stock_updated`
- `notification:new`
- `chat:message`
- `analytics:dashboard_update`

**Client Connection**:
```javascript
const socket = io('ws://localhost:8009', {
  auth: {
    token: 'jwt-token'
  }
});

socket.on('order:status_updated', (data) => {
  // Handle order update
});
```

---

### 11. Audit Service (:8010)
**Purpose**: Activity logging and compliance

**Responsibilities**:
- Audit trail logging
- User activity tracking
- System event logging
- Compliance reporting
- Security event monitoring

**Data Model**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  companyId: ObjectId,
  action: String,
  resource: String,
  resourceId: ObjectId,
  changes: Object,
  ipAddress: String,
  userAgent: String,
  timestamp: Date,
  metadata: Object
}
```

**Endpoints**:
- `GET /audit/logs` - List audit logs
- `GET /audit/logs/:id` - Get log details
- `GET /audit/user/:userId` - User activity
- `GET /audit/resource/:resourceType/:resourceId` - Resource history
- `GET /audit/export` - Export logs

**Events Consumed**: All events from all services

---

### 12. Analytics Service (:8011)
**Purpose**: Business intelligence and reporting

**Responsibilities**:
- Sales analytics
- Inventory analytics
- Customer behavior analysis
- Revenue forecasting
- Dashboard data
- Custom reports

**Key Metrics**:
- Total revenue
- Orders per day/week/month
- Average order value
- Customer lifetime value
- Inventory turnover
- Best-selling products
- Revenue by shop/company

**Endpoints**:
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/sales` - Sales analytics
- `GET /analytics/inventory` - Inventory analytics
- `GET /analytics/customers` - Customer analytics
- `GET /analytics/products` - Product performance
- `POST /analytics/reports` - Generate custom report

**Events Consumed**:
- All order events
- All payment events
- All inventory events
- All user events

---

### 13. Debt Service (:8012)
**Purpose**: Debt and payment plan management

**Responsibilities**:
- Company debt tracking
- Payment schedule management
- Overdue payment alerts
- Payment history
- Collection management

**Data Model**:
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  type: String, // subscription, purchase, loan
  amount: Number,
  amountPaid: Number,
  amountRemaining: Number,
  dueDate: Date,
  status: String, // pending, partial, paid, overdue
  paymentSchedule: [{
    amount: Number,
    dueDate: Date,
    paidAt: Date,
    status: String
  }],
  notes: String,
  createdAt: Date
}
```

**Endpoints**:
- `GET /debts` - List debts
- `POST /debts` - Create debt record
- `GET /debts/:id` - Get debt details
- `POST /debts/:id/payment` - Record payment
- `GET /debts/overdue` - List overdue debts
- `GET /debts/company/:companyId` - Company debts

**Events Published**:
- `debt.created`
- `debt.payment_due`
- `debt.overdue`
- `debt.paid`

---

## Event-Driven Architecture

### RabbitMQ Configuration

All services communicate asynchronously through RabbitMQ using a topic exchange pattern.

**Exchange**: `ecommerce_exchange` (Type: topic)

**Queues**:
- `product.events`
- `inventory.events`
- `order.events`
- `payment.events`
- `user.events`
- `company.events`
- `shop.events`
- `notification.events`
- `audit.events`
- `analytics.events`
- `debt.events`
- `auth.events`

### Event Flow Examples

#### Order Creation Flow
```
1. Customer → API Gateway → Sales Service: POST /orders
2. Sales Service → RabbitMQ: order.created
3. Inventory Service ← RabbitMQ: Deduct stock
4. Payment Service ← RabbitMQ: Process payment
5. Notification Service ← RabbitMQ: Send confirmation
6. Audit Service ← RabbitMQ: Log action
7. Analytics Service ← RabbitMQ: Update metrics
8. WebSocket Service ← RabbitMQ: Notify real-time
```

#### Payment Success Flow
```
1. Payment Gateway → Payment Service: Webhook
2. Payment Service → RabbitMQ: payment.success
3. Sales Service ← RabbitMQ: Update order status
4. Notification Service ← RabbitMQ: Send receipt
5. Company Service ← RabbitMQ: Update revenue
6. Analytics Service ← RabbitMQ: Update reports
```

---

## Authentication & Authorization

### JWT Token Structure
```javascript
{
  userId: "user_id",
  email: "user@example.com",
  role: "company_admin",
  companyId: "company_id",
  shopIds: ["shop1_id", "shop2_id"],
  iat: timestamp,
  exp: timestamp
}
```

### Role Permissions

| Resource | Super Admin | Company Admin | Shop Manager | Shop Staff | Customer |
|----------|-------------|---------------|--------------|------------|----------|
| Companies | CRUD | Read Own | - | - | - |
| Shops | CRUD | CRUD (Own) | Read (Assigned) | Read (Assigned) | - |
| Products | CRUD | CRUD (Own) | CRUD (Shop) | Update (Shop) | Read |
| Orders | Read All | Read (Company) | Read (Shop) | Read (Shop) | Read Own |
| Inventory | Read All | CRUD (Company) | Update (Shop) | Read (Shop) | - |
| Users | CRUD | CRUD (Company) | Read (Shop) | - | Update Own |
| Analytics | All | Company | Shop | Shop | - |

---

## Database Design

Each service has its own MongoDB database for data isolation:

- `authdb` - User authentication data
- `companydb` - Company information
- `shopdb` - Shop data
- `ecommercedb` - Products, cart, wishlist
- `salesdb` - Orders and transactions
- `paymentdb` - Payment records
- `inventorydb` - Stock and warehouses
- `notificationdb` - Notification logs
- `auditdb` - Audit trails
- `analyticsdb` - Analytics data
- `debtdb` - Debt records

---

## Deployment

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Scale specific service
docker-compose up -d --scale ecommerce-service=3
```

### Environment Variables

See `.env.example` for all required environment variables.

---

## Monitoring & Health Checks

All services expose health check endpoints:
- `GET /health` - Service health status

Monitor via API Gateway:
```bash
curl http://localhost:8000/api/health/all
```

---

## Security Features

1. **JWT Authentication**: All protected endpoints
2. **Rate Limiting**: Gateway-level throttling
3. **CORS**: Configured per service
4. **Helmet.js**: Security headers
5. **Data Isolation**: Company/shop level
6. **Audit Logging**: All critical operations
7. **Password Hashing**: Bcrypt
8. **Token Refresh**: Refresh token mechanism

---

## Performance Optimization

1. **Caching**: Redis for frequently accessed data
2. **Database Indexing**: All query fields
3. **Pagination**: All list endpoints
4. **Lazy Loading**: Product images
5. **CDN**: Static assets
6. **Connection Pooling**: MongoDB
7. **Message Queue**: Async processing

---

## Future Enhancements

1. GraphQL Gateway
2. Redis Caching Layer
3. Elasticsearch for Search
4. Kubernetes Deployment
5. Service Mesh (Istio)
6. Distributed Tracing (Jaeger)
7. API Versioning
8. Auto-scaling
9. Disaster Recovery
10. Multi-region Support
