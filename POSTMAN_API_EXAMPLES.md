# Inventory Service - Postman API Examples

This document provides ready-to-use examples for testing the Inventory Service API with Postman.

## Environment Setup

Create a Postman environment with these variables:

```
base_url = http://localhost:8007/inventory
company_id = your_company_id
product_id = (will be set dynamically)
warehouse_id = (will be set dynamically)
order_id = (will be set dynamically)
```

---

## 1. Products API

### 1.1 Create Product

**POST** `{{base_url}}/v1/products`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "MacBook Pro 16-inch",
  "sku": "MBP-16-2024",
  "asin": "B09JQK5MZT",
  "companyId": "{{company_id}}",
  "description": "Apple MacBook Pro 16-inch with M3 Pro chip, 18GB RAM, 512GB SSD",
  "category": "64f1234567890abcdef12345",
  "brand": "Apple",
  "pricing": {
    "basePrice": 2499.00,
    "salePrice": 2299.00,
    "costPrice": 1800.00,
    "currency": "USD"
  },
  "inventory": {
    "quantity": 50,
    "lowStockThreshold": 10,
    "sku": "MBP-16-2024"
  },
  "status": "active",
  "visibility": "public",
  "featured": true,
  "images": [
    {
      "url": "https://example.com/macbook-1.jpg",
      "altText": "MacBook Pro front view"
    }
  ],
  "specifications": {
    "processor": "M3 Pro",
    "ram": "18GB",
    "storage": "512GB SSD",
    "display": "16-inch Liquid Retina XDR"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Successfully created 1 products",
  "data": {
    "created": [
      {
        "_id": "64f9876543210abcdef98765",
        "name": "MacBook Pro 16-inch",
        "sku": "MBP-16-2024",
        "pricing": {
          "basePrice": 2499,
          "salePrice": 2299,
          "costPrice": 1800,
          "currency": "USD"
        },
        "inventory": {
          "quantity": 50,
          "lowStockThreshold": 10
        },
        "status": "active",
        "availability": "in_stock",
        "createdAt": "2024-10-23T10:30:00.000Z"
      }
    ],
    "failed": []
  }
}
```

**Test Script:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.data.created.length > 0) {
        pm.environment.set("product_id", response.data.created[0]._id);
    }
}
```

---

### 1.2 Get All Products

**GET** `{{base_url}}/v1/products?companyId={{company_id}}&page=1&limit=20&status=active`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f9876543210abcdef98765",
      "name": "MacBook Pro 16-inch",
      "sku": "MBP-16-2024",
      "pricing": {
        "basePrice": 2499,
        "salePrice": 2299
      },
      "inventory": {
        "quantity": 50
      },
      "availability": "in_stock",
      "featured": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

### 1.3 Get Product by ID

**GET** `{{base_url}}/v1/products/{{product_id}}`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "64f9876543210abcdef98765",
    "name": "MacBook Pro 16-inch",
    "sku": "MBP-16-2024",
    "description": "Apple MacBook Pro 16-inch with M3 Pro chip",
    "pricing": {
      "basePrice": 2499,
      "salePrice": 2299,
      "costPrice": 1800
    },
    "inventory": {
      "quantity": 50,
      "lowStockThreshold": 10,
      "perWarehouse": []
    },
    "category": {
      "_id": "64f1234567890abcdef12345",
      "name": "Laptops",
      "slug": "laptops"
    }
  }
}
```

---

### 1.4 Update Inventory

**PATCH** `{{base_url}}/v1/products/{{product_id}}/inventory`

**Body:**
```json
{
  "quantity": 25,
  "operation": "decrement",
  "reason": "Sold 25 units"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "data": {
    "id": "64f9876543210abcdef98765",
    "oldQuantity": 50,
    "newQuantity": 25,
    "stockStatus": "in_stock"
  }
}
```

---

### 1.5 Search Products

**GET** `{{base_url}}/v1/products/search?q=macbook&page=1&limit=10`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f9876543210abcdef98765",
      "name": "MacBook Pro 16-inch",
      "sku": "MBP-16-2024",
      "pricing": {
        "basePrice": 2499,
        "salePrice": 2299
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  },
  "searchQuery": "macbook"
}
```

---

### 1.6 Get Low Stock Products

**GET** `{{base_url}}/v1/products/low-stock?companyId={{company_id}}&threshold=15`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f9876543210abcdef98765",
      "name": "MacBook Pro 16-inch",
      "sku": "MBP-16-2024",
      "inventory": {
        "quantity": 8,
        "lowStockThreshold": 10
      }
    }
  ],
  "count": 1
}
```

---

## 2. Reservations API

### 2.1 Create Reservation

**POST** `{{base_url}}/v1/reservations`

**Body:**
```json
{
  "productId": "{{product_id}}",
  "orderId": "ORD-2024-001",
  "customerId": "CUST-123",
  "quantity": 2,
  "expirationMinutes": 15
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Stock reservation created successfully",
  "data": {
    "_id": "64f9999999999abcdef99999",
    "productId": "64f9876543210abcdef98765",
    "orderId": "ORD-2024-001",
    "customerId": "CUST-123",
    "quantity": 2,
    "status": "active",
    "expiresAt": "2024-10-23T10:45:00.000Z",
    "createdAt": "2024-10-23T10:30:00.000Z"
  }
}
```

**Test Script:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("reservation_id", response.data._id);
}
```

---

### 2.2 Get Available Stock

**GET** `{{base_url}}/v1/reservations/available-stock?productId={{product_id}}`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "productId": "64f9876543210abcdef98765",
    "warehouseId": null,
    "totalStock": 50,
    "reserved": 2,
    "available": 48
  }
}
```

---

### 2.3 Fulfill Reservation

**PATCH** `{{base_url}}/v1/reservations/{{reservation_id}}/fulfill`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Reservation fulfilled successfully",
  "data": {
    "_id": "64f9999999999abcdef99999",
    "status": "fulfilled",
    "fulfilledAt": "2024-10-23T10:35:00.000Z"
  }
}
```

---

### 2.4 Cancel Reservation

**PATCH** `{{base_url}}/v1/reservations/{{reservation_id}}/cancel`

**Body:**
```json
{
  "reason": "Customer cancelled order"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Reservation cancelled successfully",
  "data": {
    "_id": "64f9999999999abcdef99999",
    "status": "cancelled",
    "cancelledAt": "2024-10-23T10:35:00.000Z",
    "reason": "Customer cancelled order"
  }
}
```

---

## 3. Warehouse Transfers API

### 3.1 Create Warehouse

**POST** `{{base_url}}/v1/warehouses`

**Body:**
```json
{
  "name": "Main Warehouse - New York",
  "companyId": "{{company_id}}",
  "location": {
    "address": "123 Storage Avenue",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "contact": {
    "name": "John Warehouse",
    "phone": "+1-555-0123",
    "email": "warehouse.ny@example.com"
  },
  "capacity": {
    "maxProducts": 10000,
    "currentOccupancy": 0
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Warehouse created successfully",
  "data": {
    "_id": "64f8888888888abcdef88888",
    "name": "Main Warehouse - New York",
    "location": {
      "city": "New York",
      "state": "NY"
    }
  }
}
```

**Test Script:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("warehouse_id", response.data._id);
}
```

---

### 3.2 Create Transfer

**POST** `{{base_url}}/v1/transfers`

**Body:**
```json
{
  "companyId": "{{company_id}}",
  "sourceWarehouseId": "64f8888888888abcdef88888",
  "destinationWarehouseId": "64f7777777777abcdef77777",
  "items": [
    {
      "productId": "{{product_id}}",
      "quantity": 10,
      "notes": "High priority transfer"
    }
  ],
  "notes": "Rebalancing inventory between warehouses"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Stock transfer created successfully",
  "data": {
    "_id": "64f6666666666abcdef66666",
    "transferNumber": "TRF-1698067200000-000001",
    "sourceWarehouseId": "64f8888888888abcdef88888",
    "destinationWarehouseId": "64f7777777777abcdef77777",
    "status": "pending",
    "items": [
      {
        "productId": "64f9876543210abcdef98765",
        "quantity": 10
      }
    ],
    "initiatedAt": "2024-10-23T10:30:00.000Z"
  }
}
```

**Test Script:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("transfer_id", response.data._id);
}
```

---

### 3.3 Approve Transfer

**PATCH** `{{base_url}}/v1/transfers/{{transfer_id}}/approve`

**Body:**
```json
{
  "trackingNumber": "UPS123456789"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Transfer approved and stock deducted from source warehouse",
  "data": {
    "_id": "64f6666666666abcdef66666",
    "status": "in_transit",
    "approvedBy": "user123",
    "approvedAt": "2024-10-23T10:35:00.000Z",
    "trackingNumber": "UPS123456789"
  }
}
```

---

### 3.4 Complete Transfer

**PATCH** `{{base_url}}/v1/transfers/{{transfer_id}}/complete`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Transfer completed and stock added to destination warehouse",
  "data": {
    "_id": "64f6666666666abcdef66666",
    "status": "completed",
    "completedBy": "user123",
    "completedAt": "2024-10-23T11:00:00.000Z"
  }
}
```

---

### 3.5 Cancel Transfer

**PATCH** `{{base_url}}/v1/transfers/{{transfer_id}}/cancel`

**Body:**
```json
{
  "reason": "Destination warehouse is full"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Transfer cancelled successfully",
  "data": {
    "_id": "64f6666666666abcdef66666",
    "status": "cancelled",
    "cancelledAt": "2024-10-23T10:40:00.000Z",
    "cancellationReason": "Destination warehouse is full"
  }
}
```

---

## 4. Batch Operations API

### 4.1 Batch Update Inventory

**POST** `{{base_url}}/v1/batch/inventory`

**Body:**
```json
{
  "companyId": "{{company_id}}",
  "updates": [
    {
      "productId": "64f9876543210abcdef98765",
      "quantity": 100,
      "operation": "set",
      "reason": "Physical inventory count"
    },
    {
      "productId": "64f9876543210abcdef98766",
      "quantity": 50,
      "operation": "increment",
      "reason": "New shipment received"
    },
    {
      "productId": "64f9876543210abcdef98767",
      "quantity": 10,
      "operation": "decrement",
      "reason": "Damaged units removed"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Processed 3 updates: 3 successful, 0 failed",
  "data": {
    "successful": [
      {
        "productId": "64f9876543210abcdef98765",
        "oldQuantity": 50,
        "newQuantity": 100,
        "operation": "set"
      },
      {
        "productId": "64f9876543210abcdef98766",
        "oldQuantity": 100,
        "newQuantity": 150,
        "operation": "increment"
      },
      {
        "productId": "64f9876543210abcdef98767",
        "oldQuantity": 50,
        "newQuantity": 40,
        "operation": "decrement"
      }
    ],
    "failed": []
  }
}
```

---

### 4.2 Batch Update Prices

**POST** `{{base_url}}/v1/batch/prices`

**Body:**
```json
{
  "companyId": "{{company_id}}",
  "updates": [
    {
      "productId": "64f9876543210abcdef98765",
      "basePrice": 2399.00,
      "salePrice": 2199.00
    },
    {
      "productId": "64f9876543210abcdef98766",
      "basePrice": 1299.00,
      "salePrice": 1099.00,
      "costPrice": 800.00
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Processed 2 price updates: 2 successful, 0 failed",
  "data": {
    "successful": [
      {
        "productId": "64f9876543210abcdef98765",
        "oldPricing": {
          "basePrice": 2499,
          "salePrice": 2299
        },
        "newPricing": {
          "basePrice": 2399,
          "salePrice": 2199
        }
      }
    ],
    "failed": []
  }
}
```

---

### 4.3 Batch Update Status

**POST** `{{base_url}}/v1/batch/status`

**Body:**
```json
{
  "productIds": [
    "64f9876543210abcdef98765",
    "64f9876543210abcdef98766",
    "64f9876543210abcdef98767"
  ],
  "status": "active",
  "visibility": "public"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Processed 3 status updates: 3 successful, 0 failed",
  "data": {
    "successful": [
      {
        "productId": "64f9876543210abcdef98765",
        "oldStatus": "draft",
        "oldVisibility": "private",
        "newStatus": "active",
        "newVisibility": "public"
      }
    ],
    "failed": []
  }
}
```

---

### 4.4 Batch Import Products

**POST** `{{base_url}}/v1/batch/import`

**Body:**
```json
{
  "companyId": "{{company_id}}",
  "products": [
    {
      "name": "iPhone 15 Pro",
      "sku": "IPH-15-PRO-256",
      "asin": "B0CHX1W1XY",
      "pricing": {
        "basePrice": 999.00,
        "currency": "USD"
      },
      "inventory": {
        "quantity": 200,
        "lowStockThreshold": 20
      },
      "status": "active",
      "visibility": "public"
    },
    {
      "name": "Samsung Galaxy S24",
      "sku": "SAM-S24-512",
      "asin": "B0CMDWC5V6",
      "pricing": {
        "basePrice": 899.00,
        "currency": "USD"
      },
      "inventory": {
        "quantity": 150,
        "lowStockThreshold": 15
      },
      "status": "active",
      "visibility": "public"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Processed 2 imports: 2 successful, 0 failed, 0 duplicates",
  "data": {
    "successful": [
      {
        "productId": "64f9876543210abcdef98768",
        "name": "iPhone 15 Pro",
        "sku": "IPH-15-PRO-256"
      },
      {
        "productId": "64f9876543210abcdef98769",
        "name": "Samsung Galaxy S24",
        "sku": "SAM-S24-512"
      }
    ],
    "failed": [],
    "duplicates": []
  }
}
```

---

## 5. Alerts API

### 5.1 Get All Alerts

**GET** `{{base_url}}/v1/alerts?companyId={{company_id}}&isResolved=false&page=1&limit=20`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f5555555555abcdef55555",
      "companyId": "company123",
      "type": "low_stock",
      "productId": {
        "_id": "64f9876543210abcdef98765",
        "name": "MacBook Pro 16-inch",
        "slug": "macbook-pro-16-inch"
      },
      "threshold": 10,
      "message": "Stock for product MacBook Pro 16-inch is low: 8 units remaining",
      "isResolved": false,
      "createdAt": "2024-10-23T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

### 5.2 Resolve Alert

**PATCH** `{{base_url}}/v1/alerts/{{alert_id}}/resolve`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "_id": "64f5555555555abcdef55555",
    "isResolved": true,
    "resolvedBy": "user123",
    "resolvedAt": "2024-10-23T11:00:00.000Z"
  }
}
```

---

## 6. Stock Changes API

### 6.1 Get Stock History

**GET** `{{base_url}}/v1/stock-changes/history?productId={{product_id}}&startDate=2024-10-01&endDate=2024-10-31`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f4444444444abcdef44444",
      "productId": {
        "_id": "64f9876543210abcdef98765",
        "name": "MacBook Pro 16-inch"
      },
      "changeType": "sale",
      "quantity": -2,
      "previousStock": 50,
      "newStock": 48,
      "reason": "Order ORD-2024-001 placed",
      "orderId": "ORD-2024-001",
      "userId": "order-service",
      "changeDate": "2024-10-23T10:30:00.000Z"
    },
    {
      "_id": "64f4444444444abcdef44445",
      "productId": {
        "_id": "64f9876543210abcdef98765",
        "name": "MacBook Pro 16-inch"
      },
      "changeType": "restock",
      "quantity": 100,
      "previousStock": 48,
      "newStock": 148,
      "reason": "Purchase PUR-2024-050 received from supplier",
      "userId": "purchase-service",
      "changeDate": "2024-10-23T14:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

## Common Test Scripts

### Save Product ID from Response
```javascript
if (pm.response.code === 201 || pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data._id) {
        pm.environment.set("product_id", response.data._id);
    }
}
```

### Verify Success Response
```javascript
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has success property", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('success');
    pm.expect(response.success).to.be.true;
});
```

### Verify Pagination
```javascript
pm.test("Response has pagination", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('pagination');
    pm.expect(response.pagination).to.have.all.keys('page', 'limit', 'total', 'pages');
});
```

### Verify Error Response
```javascript
pm.test("Error response has correct structure", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('success');
    pm.expect(response.success).to.be.false;
    pm.expect(response).to.have.property('message');
});
```

---

## Workflow Examples

### Complete Order Fulfillment Workflow

1. **Create Reservation** (when customer adds to cart)
2. **Check Available Stock** (before checkout)
3. **Fulfill Reservation** (when order is placed)
4. **Update Inventory** (automatic via order event)

### Transfer Workflow

1. **Create Source Warehouse**
2. **Create Destination Warehouse**
3. **Create Transfer** (with items)
4. **Approve Transfer** (deducts from source)
5. **Complete Transfer** (adds to destination)

### Bulk Import Workflow

1. **Batch Import Products** (CSV/Excel data)
2. **Batch Update Prices** (adjust pricing)
3. **Batch Update Status** (activate products)
4. **Get All Products** (verify import)

---

## Tips for Using Postman

1. **Use Environment Variables**: Store base_url, company_id, and other frequently used values
2. **Chain Requests**: Use test scripts to save IDs for subsequent requests
3. **Collections**: Organize requests by feature (Products, Reservations, etc.)
4. **Pre-request Scripts**: Set up authentication tokens or timestamps
5. **Tests**: Add assertions to verify response structure and data
6. **Mock Servers**: Create mock responses for testing without backend

## Error Codes Reference

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or validation error
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]
}
```
