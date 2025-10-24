# System Architecture Diagrams

## High-Level System Architecture

```
                                    ┌─────────────────────┐
                                    │   CLIENT LAYER      │
                                    ├─────────────────────┤
                                    │ - Web Application   │
                                    │ - Mobile Apps       │
                                    │ - Admin Dashboard   │
                                    │ - Company Portal    │
                                    │ - Shop POS Terminal │
                                    └──────────┬──────────┘
                                               │
                                               │ HTTPS/WSS
                                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                                │
│                         (Port 8000)                                       │
├───────────────────────────────────────────────────────────────────────────┤
│  • Request Routing          • Authentication          • Rate Limiting     │
│  • Load Balancing          • CORS Handling           • Request Logging   │
└────────────┬──────────────────────────────────────────────────────────────┘
             │
             │ Internal HTTP/REST
             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        MICROSERVICES LAYER                                │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Service   │  │ Company Service │  │  Shop Service   │
│    :8001        │  │     :8002       │  │     :8003       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Registration  │  │ • Company CRUD  │  │ • Shop CRUD     │
│ • Login/Logout  │  │ • Settings Mgmt │  │ • Staff Mgmt    │
│ • JWT Tokens    │  │ • Subscriptions │  │ • Locations     │
│ • User Profile  │  │ • Multi-tenant  │  │ • Hours Mgmt    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ E-commerce Svc  │  │  Sales Service  │  │ Payment Service │
│    :8004        │  │     :8005       │  │     :8006       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Product Cat.  │  │ • Order Mgmt    │  │ • Stripe        │
│ • Cart/Wishlist │  │ • Fulfillment   │  │ • PayPal        │
│ • Recommends    │  │ • Tracking      │  │ • Refunds       │
│ • Search        │  │ • Returns       │  │ • Transactions  │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│Inventory Service│  │ Notification    │  │  WebSocket Svc  │
│    :8007        │  │  Service :8008  │  │     :8009       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Stock Mgmt    │  │ • Email (SMTP)  │  │ • Real-time     │
│ • Warehouses    │  │ • SMS (Twilio)  │  │ • Live Updates  │
│ • Transfers     │  │ • Push (Firebase)│  │ • Rooms         │
│ • Alerts        │  │ • Scheduling    │  │ • Presence      │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Audit Service  │  │Analytics Service│  │  Debt Service   │
│    :8010        │  │     :8011       │  │     :8012       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Activity Log  │  │ • Reports       │  │ • Debt Tracking │
│ • Compliance    │  │ • Dashboards    │  │ • Payment Plans │
│ • History       │  │ • Forecasting   │  │ • Collections   │
│ • Security      │  │ • Insights      │  │ • Reminders     │
└─────────────────┘  └─────────────────┘  └─────────────────┘

                              │
                              │ Async Events
                              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        EVENT BUS LAYER                                    │
│                    RabbitMQ (Ports 5672, 15672)                          │
├───────────────────────────────────────────────────────────────────────────┤
│  Exchange: ecommerce_exchange (Topic)                                    │
│  Queues: product.events, inventory.events, order.events, payment.events  │
│         user.events, company.events, shop.events, notification.events    │
│         audit.events, analytics.events, debt.events, auth.events         │
└───────────────────────────────────────────────────────────────────────────┘

                              │
                              │ Database Connections
                              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                         │
│                     MongoDB (Port 27017)                                  │
├───────────────────────────────────────────────────────────────────────────┤
│  Databases:                                                               │
│  • authdb          • companydb       • shopdb         • ecommercedb      │
│  • salesdb         • paymentdb       • inventorydb    • notificationdb   │
│  • auditdb         • analyticsdb     • debtdb                            │
└───────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐           ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │           │   API    │         │   Auth   │         │ MongoDB  │
│          │           │ Gateway  │         │ Service  │         │  authdb  │
└────┬─────┘           └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                      │                     │                     │
     │ POST /api/auth/login │                     │                     │
     │─────────────────────>│                     │                     │
     │                      │                     │                     │
     │                      │ POST /auth/login    │                     │
     │                      │────────────────────>│                     │
     │                      │                     │                     │
     │                      │                     │ Find user by email  │
     │                      │                     │────────────────────>│
     │                      │                     │                     │
     │                      │                     │ User data           │
     │                      │                     │<────────────────────│
     │                      │                     │                     │
     │                      │                     │ Verify password     │
     │                      │                     │ Generate JWT        │
     │                      │                     │ Create refresh token│
     │                      │                     │                     │
     │                      │                     │ Save refresh token  │
     │                      │                     │────────────────────>│
     │                      │                     │                     │
     │                      │ Return user + token │                     │
     │                      │<────────────────────│                     │
     │                      │                     │                     │
     │ User data + JWT token│                     │                     │
     │<─────────────────────│                     │                     │
     │                      │                     │                     │
     │ Store token          │                     │                     │
     │ in local storage     │                     │                     │
     │                      │                     │                     │
```

## Order Creation Flow

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Customer │  │   API    │  │  Sales   │  │RabbitMQ  │  │Inventory │  │ Payment  │
│          │  │ Gateway  │  │ Service  │  │   Bus    │  │ Service  │  │ Service  │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │              │              │              │
     │ POST        │              │              │              │              │
     │ /api/orders │              │              │              │              │
     │────────────>│              │              │              │              │
     │             │              │              │              │              │
     │             │ POST /orders │              │              │              │
     │             │─────────────>│              │              │              │
     │             │              │              │              │              │
     │             │              │ Create order │              │              │
     │             │              │ status=      │              │              │
     │             │              │ 'pending'    │              │              │
     │             │              │              │              │              │
     │             │              │ Publish      │              │              │
     │             │              │ order.created│              │              │
     │             │              │─────────────>│              │              │
     │             │              │              │              │              │
     │             │              │              │ order.created│              │
     │             │              │              │─────────────>│              │
     │             │              │              │              │              │
     │             │              │              │              │ Reserve stock│
     │             │              │              │              │ for order    │
     │             │              │              │              │              │
     │             │              │              │ order.created│              │
     │             │              │              │──────────────────────────────>│
     │             │              │              │              │              │
     │             │              │              │              │   Prepare    │
     │             │              │              │              │   payment    │
     │             │              │              │              │   intent     │
     │             │              │              │              │              │
     │             │              │ Order details│              │              │
     │             │<─────────────│              │              │              │
     │             │              │              │              │              │
     │ Order ID +  │              │              │              │              │
     │ payment URL │              │              │              │              │
     │<────────────│              │              │              │              │
     │             │              │              │              │              │
     │ Process     │              │              │              │              │
     │ payment     │              │              │              │              │
     │             │              │              │              │              │
```

## Event-Driven Communication Pattern

```
                          ┌─────────────────────┐
                          │   RabbitMQ Exchange │
                          │  ecommerce_exchange │
                          │     (Topic)         │
                          └──────────┬──────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
                ▼                    ▼                    ▼
        ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
        │product.events│     │ order.events │    │payment.events│
        │    Queue     │     │    Queue     │    │    Queue     │
        └──────┬───────┘     └──────┬───────┘    └──────┬───────┘
               │                    │                    │
               │                    │                    │
        ┌──────▼───────┐     ┌──────▼───────┐    ┌──────▼───────┐
        │  Ecommerce   │     │  Inventory   │    │    Sales     │
        │   Service    │     │   Service    │    │   Service    │
        │  (Consumer)  │     │  (Consumer)  │    │  (Consumer)  │
        └──────────────┘     └──────────────┘    └──────────────┘

Event Flow Example:
1. Sales Service publishes: order.created
2. Event goes to Exchange with routing key: "order.created"
3. Exchange routes to queues bound to "order.*" or "order.created"
4. Multiple services consume: Inventory, Payment, Notification, Audit, Analytics
5. Each service processes independently and may publish new events
```

## Multi-Tenant Data Isolation

```
┌───────────────────────────────────────────────────────────────────┐
│                         Super Admin Layer                         │
├───────────────────────────────────────────────────────────────────┤
│  • Manage all companies                                           │
│  • Create/Delete companies                                        │
│  • View global analytics                                          │
│  • System administration                                          │
└───────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
┌───────────────────▼────────┐   ┌─────────────▼──────────────┐
│      Company A              │   │      Company B             │
│  (companyId: 123)          │   │  (companyId: 456)         │
├────────────────────────────┤   ├────────────────────────────┤
│ Company Admin: admin_a     │   │ Company Admin: admin_b    │
│                            │   │                            │
│ Shops:                     │   │ Shops:                     │
│  ├─ Shop A1 (Downtown)     │   │  ├─ Shop B1 (Midtown)     │
│  │   ├─ Manager: mgr_a1    │   │  │   ├─ Manager: mgr_b1   │
│  │   └─ Staff: [...]       │   │  │   └─ Staff: [...]      │
│  │                         │   │  │                         │
│  └─ Shop A2 (Uptown)       │   │  └─ Shop B2 (Downtown)    │
│      ├─ Manager: mgr_a2    │   │      ├─ Manager: mgr_b2   │
│      └─ Staff: [...]       │   │      └─ Staff: [...]      │
│                            │   │                            │
│ Products: [prod_a1, ...]   │   │ Products: [prod_b1, ...]  │
│ Orders: [ord_a1, ...]      │   │ Orders: [ord_b1, ...]     │
│ Inventory: [...]           │   │ Inventory: [...]          │
└────────────────────────────┘   └────────────────────────────┘

Data Isolation Rules:
• Every query filtered by companyId
• Company A cannot see Company B's data
• Shop managers only see their shop's data
• Customers only see their own orders
```

## Recommendation System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Recommendation Engine                         │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│ Collaborative       │    │  Content-Based      │
│ Filtering           │    │  Filtering          │
├─────────────────────┤    ├─────────────────────┤
│ • User purchase     │    │ • Product           │
│   history           │    │   attributes        │
│ • Similar users     │    │ • Category          │
│ • Co-purchase       │    │ • Specifications    │
│   patterns          │    │ • Price range       │
└──────────┬──────────┘    └──────────┬──────────┘
           │                          │
           └────────────┬─────────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │  Hybrid Algorithm   │
            └──────────┬──────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│  For You   │  │  Trending  │  │  Similar   │
│ (Personal) │  │ (Popular)  │  │ (Context)  │
└────────────┘  └────────────┘  └────────────┘

Data Sources:
• Product views (ProductView collection)
• Cart additions (cart.item_added events)
• Purchase history (order.completed events)
• Product ratings and reviews
• Browse patterns
```

## Notification Priority System

```
                    ┌──────────────────┐
                    │  Event Triggered │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Notification Svc │
                    │ Determines       │
                    │ Priority         │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  CRITICAL   │  │ IMPORTANT   │  │   NORMAL    │
    ├─────────────┤  ├─────────────┤  ├─────────────┤
    │ • Order     │  │ • Order     │  │ • Recommend │
    │   confirm   │  │   updates   │  │ • Promo     │
    │ • Payment   │  │ • Low stock │  │ • News      │
    │   failed    │  │ • Shipment  │  │             │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
     ┌─────┼─────┐         │                │
     │     │     │         │                │
     ▼     ▼     ▼         ▼                ▼
   ┌───┐ ┌───┐ ┌───┐     ┌───┐            ┌───┐
   │SMS│ │📧 │ │🔔 │     │📧 │            │🔔 │
   └───┘ └───┘ └───┘     └───┘            └───┘

Timeline:
• Critical: Sent immediately (< 1 second)
• Important: Sent within 5 seconds
• Normal: Batched every 1 minute
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Docker Host                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │  api-gateway     │  │  auth-service    │  │ company-service  ││
│  │  Container       │  │  Container       │  │  Container       ││
│  │  :8000          │  │  :8001          │  │  :8002          ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘│
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │  shop-service    │  │ ecommerce-svc    │  │  sales-service   ││
│  │  Container       │  │  Container       │  │  Container       ││
│  │  :8003          │  │  :8004          │  │  :8005          ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘│
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │ payment-service  │  │inventory-service │  │notification-svc  ││
│  │  Container       │  │  Container       │  │  Container       ││
│  │  :8006          │  │  :8007          │  │  :8008          ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘│
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │ websocket-svc    │  │  audit-service   │  │analytics-service ││
│  │  Container       │  │  Container       │  │  Container       ││
│  │  :8009          │  │  :8010          │  │  :8011          ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘│
│                                                                    │
│  ┌──────────────────┐                                             │
│  │  debt-service    │                                             │
│  │  Container       │                                             │
│  │  :8012          │                                             │
│  └──────────────────┘                                             │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │    MongoDB       │  │    RabbitMQ      │                      │
│  │  Container       │  │  Container       │                      │
│  │  :27017         │  │  :5672/:15672   │                      │
│  └──────────────────┘  └──────────────────┘                      │
│                                                                    │
│  Network: ecommerce-network (bridge)                              │
│  Volumes: mongodb_data, rabbitmq_data                             │
└────────────────────────────────────────────────────────────────────┘
```

## Scaling Strategy

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │   (Future: Nginx)│
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │Ecommerce │   │Ecommerce │   │Ecommerce │
      │Service-1 │   │Service-2 │   │Service-3 │
      └──────────┘   └──────────┘   └──────────┘

Horizontal Scaling:
• Stateless services can be scaled easily
• docker-compose up -d --scale ecommerce-service=3
• Load balancing across instances
• Session data stored in JWT (stateless)
```

---

This architecture provides a robust, scalable, and maintainable platform for e-commerce and inventory management operations.
