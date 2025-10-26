# E-Commerce & Sales Services Documentation

## Overview

This document provides comprehensive documentation for the E-Commerce and Sales services, two critical microservices that power the customer-facing product catalog, shopping experience, order management, and fulfillment processes.

---

## Table of Contents

1. [E-Commerce Service](#e-commerce-service)
2. [Sales Service](#sales-service)
3. [Integration Guide](#integration-guide)
4. [API Examples](#api-examples)
5. [Event-Driven Communication](#event-driven-communication)

---

## E-Commerce Service

**Port**: 8004
**Purpose**: Customer-facing product catalog, shopping cart, wishlist, reviews, and ML-based recommendations

### Features

#### 1. Advanced Search, Sort & Filter

The e-commerce service provides enterprise-grade product search capabilities:

**Search Parameters**:
- `query` - Full-text search across product names and descriptions
- `category` - Filter by category ID
- `subcategory` - Filter by subcategory ID
- `minPrice` / `maxPrice` - Price range filtering
- `brand` - Filter by brand name
- `rating` - Minimum rating filter (1-5)
- `inStock` - Filter for in-stock items only
- `tags` - Filter by product tags
- `sortBy` - Sort options:
  - `relevance` (default) - Search relevance score
  - `price_asc` - Price low to high
  - `price_desc` - Price high to low
  - `rating` - Highest rated first
  - `newest` - Most recent products
  - `popular` - Best sellers

**Example Search Request**:
```http
GET /api/products/search?query=laptop&minPrice=500&maxPrice=2000&brand=Dell&sortBy=price_asc&page=1&limit=20
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "pages": 8
    },
    "filters": {
      "appliedFilters": {...},
      "availableFilters": {...}
    }
  }
}
```

#### 2. ML-Based Recommendation Engine

The recommendation engine uses multiple algorithms to provide personalized product suggestions:

**Recommendation Types**:

##### a) Personalized Recommendations
Uses collaborative filtering based on user behavior and viewing history.

```http
GET /api/products/recommendations?type=personalized&limit=10
Authorization: Bearer <token>
```

**Algorithm**:
1. Analyzes user's recent product views
2. Finds similar users who viewed the same products
3. Recommends products those similar users also viewed
4. Ranks by relevance score (view count + unique user count)

##### b) Trending Products
Shows products with highest view counts in recent days.

```http
GET /api/products/recommendations?type=trending&limit=20
```

##### c) Similar Products
Content-based filtering for product similarity.

```http
GET /api/products/recommendations?type=similar&productId=<id>&limit=5
```

##### d) Frequently Bought Together
Products often purchased together (order co-occurrence).

```http
GET /api/products/recommendations?type=frequently_bought&productId=<id>&limit=5
```

##### e) New Arrivals
Recently added products.

```http
GET /api/products/recommendations?type=new_arrivals&limit=10
```

##### f) Best Sellers
Top-selling products based on sales data.

```http
GET /api/products/recommendations?type=best_sellers&limit=10
```

#### 3. Shopping Cart Management

Full-featured shopping cart with real-time updates.

**Cart Operations**:

```http
# Get Cart
GET /api/cart
Authorization: Bearer <token>

# Add Item to Cart
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "648f1234abcd5678efgh9012",
  "quantity": 2
}

# Update Cart Item Quantity
PUT /api/cart/items/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 5
}

# Remove Item from Cart
DELETE /api/cart/items/:productId
Authorization: Bearer <token>

# Clear Cart
DELETE /api/cart
Authorization: Bearer <token>
```

**Cart Response Structure**:
```json
{
  "success": true,
  "data": {
    "_id": "cart_id",
    "userId": "user_id",
    "items": [
      {
        "productId": "product_id",
        "productName": "Laptop XYZ",
        "productImage": "image_url",
        "sku": "LAP-001",
        "quantity": 2,
        "price": 999.99,
        "subtotal": 1999.98,
        "companyId": "company_id"
      }
    ],
    "total": 1999.98,
    "itemCount": 1,
    "lastModified": "2024-10-26T10:30:00Z"
  }
}
```

#### 4. Wishlist Management

Save products for later with notification preferences.

```http
# Get Wishlist
GET /api/wishlist
Authorization: Bearer <token>

# Add to Wishlist
POST /api/wishlist/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "648f1234abcd5678efgh9012",
  "notifyOnPriceChange": true,
  "notifyOnBackInStock": true
}

# Remove from Wishlist
DELETE /api/wishlist/items/:productId
Authorization: Bearer <token>

# Move to Cart
POST /api/wishlist/items/:productId/move-to-cart
Authorization: Bearer <token>
```

#### 5. Product Reviews & Ratings

Customer review system with moderation.

```http
# Get Product Reviews
GET /api/reviews/products/:productId?page=1&limit=10&rating=5&sort=-createdAt

# Get Review Summary
GET /api/reviews/products/:productId/summary

# Create Review
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id",
  "rating": 5,
  "title": "Excellent Product!",
  "comment": "This product exceeded my expectations...",
  "images": ["image_url_1", "image_url_2"]
}

# Update Review
PUT /api/reviews/:reviewId
Authorization: Bearer <token>

# Delete Review
DELETE /api/reviews/:reviewId
Authorization: Bearer <token>

# Mark Review as Helpful
POST /api/reviews/:reviewId/helpful
Content-Type: application/json

{
  "helpful": true
}

# Get My Reviews
GET /api/reviews/my-reviews?page=1&limit=10
Authorization: Bearer <token>
```

**Review Summary Response**:
```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalReviews": 247,
    "ratingsDistribution": {
      "1": 5,
      "2": 10,
      "3": 25,
      "4": 82,
      "5": 125
    }
  }
}
```

#### 6. Product View Tracking

Automatic tracking for recommendation engine.

**Tracked Data**:
- User ID (if authenticated)
- Product ID
- View timestamp
- Duration
- Source (search, category, recommendation, direct)
- Device type
- Referrer

**Recently Viewed**:
```http
GET /api/products/recently-viewed?limit=10
Authorization: Bearer <token>
```

#### 7. Autocomplete & Suggestions

Fast search suggestions as users type.

```http
GET /api/products/autocomplete?query=lap&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "Laptop",
      "Laptop Bag",
      "Laptop Stand",
      "Laptop Charger"
    ]
  }
}
```

---

## Sales Service

**Port**: 8005
**Purpose**: Order management, order lifecycle, tracking, fulfillment, returns, and refunds

### Features

#### 1. Order Management

Complete order lifecycle management from creation to delivery.

**Order States**:
- `pending` - Order created, awaiting payment
- `confirmed` - Payment received, ready for processing
- `processing` - Order being prepared
- `shipped` - Order dispatched with tracking
- `delivered` - Order received by customer
- `cancelled` - Order cancelled
- `returned` - Order returned by customer

**Payment States**:
- `pending` - Awaiting payment
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Full refund processed
- `partially_refunded` - Partial refund processed

#### 2. Order APIs

##### Create Order

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "648f1234abcd5678efgh9012",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "billingAddress": { ... },
  "paymentMethod": "credit_card",
  "customerNotes": "Please deliver after 5 PM"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-241026-0001",
    "customerId": "user_id",
    "customerEmail": "john@example.com",
    "items": [...],
    "pricing": {
      "subtotal": 1999.98,
      "tax": 199.99,
      "shipping": 0,
      "discount": 0,
      "total": 2199.97
    },
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "2024-10-26T10:30:00Z"
  }
}
```

##### Get Orders

```http
GET /api/orders?status=delivered&page=1&limit=10
Authorization: Bearer <token>
```

##### Get Order by ID

```http
GET /api/orders/:id
Authorization: Bearer <token>
```

##### Update Order Status

```http
PATCH /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "processing",
  "note": "Order is being prepared for shipment"
}
```

##### Cancel Order

```http
POST /api/orders/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

**Cancellation Rules**:
- Only `pending` and `confirmed` orders can be cancelled
- Automatic inventory restoration
- Refund processing if payment was made

#### 3. Order Tracking

##### Track Order

```http
GET /api/orders/:id/tracking
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-241026-0001",
    "status": "shipped",
    "trackingNumber": "1Z999AA10123456784",
    "shippingCarrier": "UPS",
    "estimatedDeliveryDate": "2024-10-30T00:00:00Z",
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2024-10-26T10:30:00Z",
        "note": "Order created"
      },
      {
        "status": "confirmed",
        "timestamp": "2024-10-26T10:35:00Z",
        "note": "Payment confirmed"
      },
      {
        "status": "processing",
        "timestamp": "2024-10-26T11:00:00Z",
        "note": "Order is being prepared"
      },
      {
        "status": "shipped",
        "timestamp": "2024-10-26T15:00:00Z",
        "note": "Order shipped"
      }
    ]
  }
}
```

##### Add Tracking Information

```http
POST /api/orders/:id/tracking
Authorization: Bearer <token>
Content-Type: application/json

{
  "trackingNumber": "1Z999AA10123456784",
  "shippingCarrier": "UPS",
  "estimatedDeliveryDate": "2024-10-30"
}
```

#### 4. Returns & Refunds

Complete return request system with approval workflow.

##### Create Return Request

```http
POST /api/returns
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 1,
      "reason": "Wrong size",
      "condition": "unopened"
    }
  ],
  "reason": "size_issue",
  "detailedReason": "Ordered wrong size, need to exchange",
  "images": ["image_url_1", "image_url_2"]
}
```

**Return Rules**:
- Only delivered orders can be returned
- 30-day return window from delivery date
- Return quantity cannot exceed ordered quantity

**Response**:
```json
{
  "success": true,
  "message": "Return request created successfully",
  "data": {
    "_id": "return_id",
    "returnNumber": "RET-2410-0001",
    "orderId": "order_id",
    "orderNumber": "ORD-241026-0001",
    "status": "requested",
    "refundAmount": 999.99,
    "items": [...],
    "createdAt": "2024-10-28T10:00:00Z"
  }
}
```

##### Get Returns

```http
GET /api/returns?status=requested&page=1&limit=10
Authorization: Bearer <token>
```

##### Get Return by ID

```http
GET /api/returns/:id
Authorization: Bearer <token>
```

##### Approve Return

```http
POST /api/returns/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Return approved. Please ship the item back."
}
```

##### Reject Return

```http
POST /api/returns/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Return window expired"
}
```

##### Update Return Status

```http
PATCH /api/returns/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "received",
  "notes": "Return item received at warehouse"
}
```

**Return Lifecycle**:
1. `requested` - Customer initiates return
2. `approved` - Company approves return
3. `rejected` - Company rejects return
4. `received` - Return item received at warehouse
5. `inspected` - Item inspected for condition
6. `refunded` - Refund processed
7. `completed` - Return process completed

---

## Integration Guide

### Setting Up E-Commerce Service

1. **Environment Variables**:
```env
PORT=8004
MONGODB_URI=mongodb://mongodb:27017/ecommercedb
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your-secret-key
INVENTORY_SERVICE_URL=http://inventory-service:8007
NODE_ENV=production
LOG_LEVEL=info
```

2. **Install Dependencies**:
```bash
cd services/ecommerce-service
npm install
```

3. **Start Service**:
```bash
npm start
```

### Setting Up Sales Service

1. **Environment Variables**:
```env
PORT=8005
MONGODB_URI=mongodb://mongodb:27017/salesdb
RABBITMQ_URL=amqp://rabbitmq:5672
JWT_SECRET=your-secret-key
INVENTORY_SERVICE_URL=http://inventory-service:8007
NODE_ENV=production
LOG_LEVEL=info
```

2. **Install Dependencies**:
```bash
cd services/sales-service
npm install
```

3. **Start Service**:
```bash
npm start
```

---

## API Examples

### Complete Shopping Flow

#### 1. Browse Products
```bash
curl -X GET "http://localhost:8004/api/products/search?query=laptop&minPrice=500&maxPrice=2000&sortBy=price_asc&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### 2. View Product Details
```bash
curl -X GET "http://localhost:8004/api/products/648f1234abcd5678efgh9012" \
  -H "Authorization: Bearer <token>"
```

#### 3. Get Recommendations
```bash
curl -X GET "http://localhost:8004/api/products/recommendations?type=personalized&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### 4. Add to Cart
```bash
curl -X POST "http://localhost:8004/api/cart/items" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "648f1234abcd5678efgh9012",
    "quantity": 2
  }'
```

#### 5. View Cart
```bash
curl -X GET "http://localhost:8004/api/cart" \
  -H "Authorization: Bearer <token>"
```

#### 6. Create Order
```bash
curl -X POST "http://localhost:8005/api/orders" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "648f1234abcd5678efgh9012",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "fullName": "John Doe",
      "phone": "+1234567890",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

#### 7. Track Order
```bash
curl -X GET "http://localhost:8005/api/orders/order_id/tracking" \
  -H "Authorization: Bearer <token>"
```

#### 8. Request Return
```bash
curl -X POST "http://localhost:8005/api/returns" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_id",
    "items": [
      {
        "productId": "product_id",
        "quantity": 1,
        "reason": "Wrong size",
        "condition": "unopened"
      }
    ],
    "reason": "size_issue",
    "detailedReason": "Ordered wrong size"
  }'
```

---

## Event-Driven Communication

### E-Commerce Service Events

**Published Events**:
- `product.viewed` - User views product
- `cart.item_added` - Item added to cart
- `cart.updated` - Cart quantity updated
- `cart.item_removed` - Item removed from cart
- `cart.cleared` - Cart cleared
- `wishlist.item_added` - Item added to wishlist
- `wishlist.item_removed` - Item removed from wishlist
- `review.created` - New review created
- `review.deleted` - Review deleted

**Event Example**:
```json
{
  "event": "product.viewed",
  "userId": "user_id",
  "productId": "product_id",
  "companyId": "company_id",
  "timestamp": "2024-10-26T10:30:00Z"
}
```

### Sales Service Events

**Published Events**:
- `order.created` - New order created
- `order.confirmed` - Order payment confirmed
- `order.processing` - Order being processed
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered
- `order.cancelled` - Order cancelled
- `order.returned` - Order returned
- `return.requested` - Return requested
- `return.approved` - Return approved
- `return.rejected` - Return rejected
- `return.received` - Return received
- `return.refunded` - Refund processed

**Consumed Events**:
- `payment.success` - Payment successful (updates order status)
- `payment.failed` - Payment failed (updates order status)

**Order Created Event Example**:
```json
{
  "event": "order.created",
  "orderId": "order_id",
  "orderNumber": "ORD-241026-0001",
  "customerId": "user_id",
  "companyId": "company_id",
  "total": 2199.97,
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "timestamp": "2024-10-26T10:30:00Z"
}
```

---

## Performance Optimization

### E-Commerce Service

1. **Product View Caching**: Recently viewed products cached for fast access
2. **Recommendation Pre-computation**: Popular recommendations cached
3. **Search Indexing**: Full-text search indexes on product fields
4. **Image Lazy Loading**: Product images loaded on demand

### Sales Service

1. **Order Number Generation**: Optimized daily sequence generation
2. **Status History**: Indexed for fast tracking queries
3. **Order Pagination**: Efficient pagination for large order lists
4. **Return Window Validation**: Cached delivery dates

---

## Security

### Authentication
- JWT token-based authentication
- Token verification on all protected endpoints
- Optional authentication for public product browsing

### Data Validation
- Input validation on all endpoints
- Stock availability checks before cart/order operations
- Price verification from inventory service
- Return eligibility validation

### Event Publishing
- Secure RabbitMQ connections
- Event payload validation
- Persistent message delivery

---

## Monitoring & Logging

### Health Checks

```http
GET /health
```

Both services expose health check endpoints for monitoring.

### Logging

All critical operations logged:
- Order creation and status changes
- Payment events
- Return requests
- Cart operations
- Product views and recommendations

---

## Future Enhancements

1. **E-Commerce Service**:
   - Advanced ML models (neural networks for recommendations)
   - Real-time inventory synchronization
   - Product comparison feature
   - Price drop alerts
   - Saved payment methods

2. **Sales Service**:
   - Multi-warehouse fulfillment routing
   - Split shipments
   - Partial returns
   - Gift wrapping options
   - Order scheduling
   - Subscription orders

---

## Support

For issues or questions:
- Review logs in `logs/ecommerce.log` and `logs/sales.log`
- Check RabbitMQ management console for event flow
- Verify MongoDB connections and data integrity
- Ensure inventory service is running and accessible
