# Nexus Inventory Management & Automated Reorder System

A production-grade, distributed **Inventory Management and Automated Reorder System** built with Node.js, TypeScript, PostgreSQL, Prisma, BullMQ, Redis, Socket.IO, and Next.js (App Router).

---

## 📑 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Design Decisions & Assumptions](#design-decisions--assumptions)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Running the Application](#running-the-application)
7. [End-to-End Verification Guide](#end-to-end-verification-guide)
8. [REST API Documentation](#rest-api-documentation)
9. [Project Structure](#project-structure)
10. [Requirements Traceability Matrix](#requirements-traceability-matrix)

---

## 🏛️ Architecture Overview

The system is organized into a decoupled, event-driven multi-process architecture:

```
+---------------------------------------------------------------------------------------+
|                                    NEXT.JS FRONTEND                                   |
|   /inventory                 /reorders                    /notifications              |
|   (Live Table Sync)          (Approval Modals)            (Socket.IO Event Stream)    |
+--------------------------^-----------------------------------^------------------------+
                           | HTTP / REST                       | WebSockets (Socket.IO)
                           v                                   |
+--------------------------------------------------------------+------------------------+
|                                     BACKEND API PROCESS                               |
|  - Express REST Endpoints (Zod validation, Helmet, CORS, centralized errors)          |
|  - LowStockService (Pessimistic row locking: SELECT ... FOR UPDATE, duplicate guard)   |
|  - OTP Authorization Service (Bcrypt hash, 5-min expiry, 5-attempt lockout)           |
|  - Socket.IO Server & Redis Pub/Sub Relay                                             |
+--------------------------+-----------------------------------^------------------------+
                           |                                   | Redis Pub/Sub
                           | Enqueue Job                       | ("inventory:reorder-events")
                           v                                   |
+--------------------------+-----------------------------------+------------------------+
|                      REDIS 7 (BullMQ Queue & Pub/Sub Broker)                          |
|  - Queue: "reorder-queue"                                                             |
|  - Channel: "inventory:reorder-events"                                                |
+--------------------------^------------------------------------------------------------+
                           |
                           v
+---------------------------------------------------------------------------------------+
|                                   BULLMQ WORKER PROCESS                               |
|  - Standalone Worker: "reorder-worker"                                                |
|  - Idempotent Job Processing with State Guard                                         |
|  - Simulated Supplier API (1-3s latency, ~20% simulated transient failure)            |
|  - 3 Attempts with Exponential Backoff (1.5s, 3s, 6s)                                 |
|  - Status Transitions: QUEUED -> PROCESSING -> COMPLETED (or FAILED)                 |
|  - Stock Auto-Replenishment upon order completion                                     |
+---------------------------------------------------------------------------------------+
                           |
                           | Reads & Writes (Prisma ORM)
                           v
+---------------------------------------------------------------------------------------+
|                                  POSTGRESQL 16 DATABASE                               |
|  - Tables: "products", "reorders"                                                     |
|  - Indexes: products(sku), reorders(status), reorders(productId)                      |
|  - Constraints: ON DELETE RESTRICT on product-reorder relation                        |
+---------------------------------------------------------------------------------------+
```

---

## 💡 Design Decisions & Assumptions

1. **Pessimistic Row Locking & Race Condition Prevention**:
   - When evaluating stock or updating quantities, `ProductRepository.findByIdForUpdate` executes `SELECT * FROM "products" WHERE "id" = $id FOR UPDATE` within a Prisma transaction (`$transaction`).
   - Duplicate reorder prevention verifies whether an active reorder exists (`PENDING_APPROVAL`, `QUEUED`, or `PROCESSING`). If an active reorder exists for that product, redundant reorder creation is atomically blocked.

2. **Deletion Referential Integrity**:
   - To preserve accounting and audit trails, products with existing reorder records cannot be deleted. Attempting to delete a product that has reorder records returns `409 Conflict` (`PRODUCT_HAS_REORDERS`).

3. **High-Value OTP Security**:
   - Configurable via `REORDER_APPROVAL_LIMIT` (default: `$5000.00`).
   - If `quantityOrdered * costPrice > REORDER_APPROVAL_LIMIT`, status is set to `PENDING_APPROVAL`.
   - A 6-digit cryptographically random OTP is generated and its **bcrypt hash** is saved in PostgreSQL with a 5-minute expiry.
   - The plain OTP is never stored in the database. It is printed to the server console to simulate SMS/email dispatch.
   - If `DEV_EXPOSE_OTP=true`, the raw OTP is included in the development notification payload for simplified manual and automated testing.
   - Max failed attempts is capped at 5. On the 5th failed attempt, the reorder approval is locked (`OTP_LOCKED`).
   - Users can invoke `POST /api/reorders/:id/otp/resend` to issue a fresh OTP and reset attempt counters.

4. **BullMQ Worker Process**:
   - Runs as a standalone process (`npm run worker`), completely decoupled from the API.
   - Reorder jobs are idempotent: the worker verifies current database status before executing.
   - Simulates supplier API latency between 1.0s and 3.0s.
   - Simulates a 20% transient failure rate. BullMQ executes 3 attempts with exponential backoff (`delay: 1500ms`).
   - On the 3rd failed attempt, the worker transitions the reorder to `FAILED` and sets `failureReason`.
   - On successful completion, the worker transitions the reorder to `COMPLETED` and atomically increments the product's quantity.
   - All state transitions (`PROCESSING`, `COMPLETED`, `FAILED`) publish events to Redis channel `inventory:reorder-events`, which the API server relays to connected browser clients over Socket.IO.

---

## 🛠️ Technology Stack

- **Backend**: Node.js 20+, TypeScript (strict mode), Express, Prisma ORM, PostgreSQL 16
- **Queue & Async Processing**: BullMQ, Redis 7 (ioredis)
- **Real-Time Communication**: Socket.IO, Redis Pub/Sub
- **Validation**: Zod (strict schema validation on all inputs)
- **Security & Logging**: Helmet, CORS, Morgan / custom structured logger, Bcrypt
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React icons
- **Infra**: Docker Compose for PostgreSQL 16 and Redis 7

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher (`node -v`)
- **npm**: v10.x or higher (`npm -v`)
- **Docker & Docker Compose**: (Recommended for running Postgres and Redis)

---

## 🚀 Installation & Setup

### 1. Start Infrastructure Services

Run Docker Compose from the root directory:
```bash
docker-compose up -d
```
This starts:
- **PostgreSQL 16** on `localhost:5432`
- **Redis 7** on `localhost:6379`

### 2. Configure Environment Files

Root `.env.example`, `backend/.env.example`, and `frontend/.env.example` are pre-configured. Copy them:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

### 3. Install Dependencies & Initialize Database

```bash
# 1. Install Backend Dependencies
cd backend
npm install

# 2. Run Prisma Migrations
npm run migrate

# 3. Seed Database with 10 Production Products
npm run seed

# 4. Install Frontend Dependencies
cd ../frontend
npm install
```

---

## 🏃 Running the Application

Open 3 separate terminal tabs to run the processes:

### Terminal 1: Backend API Process
```bash
cd backend
npm run dev
```
*Listens on `http://localhost:5000` with Socket.IO and Redis Pub/Sub relay.*

### Terminal 2: BullMQ Worker Process
```bash
cd backend
npm run worker
```
*Connects to Redis `reorder-queue` and processes supplier order fulfillment.*

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm run dev
```
*Accessible in the browser at `http://localhost:3000`.*

---

## 🧪 End-to-End Verification Guide

### Test 1: Low-Stock Event & Auto-Queued Reorder (Total Value <= $5000)

1. Open `http://localhost:3000/inventory` in your browser.
2. Locate **Logitech MX Master 3S** (SKU: `ACC-LOGI-MX3S`).
   - Current Stock: `25`, Threshold: `10`, Cost: `$79.99`, Reorder Qty: `30`
   - Total Reorder Value = `30 * 79.99 = $2,399.70` (Below `$5000` approval limit).
3. Click the **Stock** button and set the quantity to `5` (below the threshold of `10`).
4. Click **Confirm Update**:
   - A floating toast immediately appears: `⚠️ Low Stock Detected: Logitech MX Master 3S`.
   - The Stock Status badge updates to `Low Stock`.
   - In Terminal 1 (API), notice the low-stock event and automatic `QUEUED` reorder creation.
   - In Terminal 2 (Worker), observe:
     ```
     [Worker] Processing reorder job (Reorder ID: ...) - Attempt 1/3
     [Worker] Calling supplier API for Logitech Logistics... (Simulated latency: 2100ms)
     [Worker] Reorder successfully completed! Replenished 30 units.
     ```
   - In the browser, navigate to `/reorders` or watch the table update live without page refresh to `PROCESSING` then `COMPLETED`!
   - In `/inventory`, the stock will automatically increase by 30 units (now 35 units, In Stock).

---

### Test 2: High-Value Reorder & OTP Approval Flow (Total Value > $5000)

1. Open `http://localhost:3000/inventory`.
2. Locate **Dell UltraSharp 32-inch 4K Monitor** (SKU: `MON-DELL-U3223`).
   - Cost: `$799.50`, Reorder Qty: `15`, Threshold: `8`.
   - Total Reorder Value = `15 * 799.50 = $11,992.50` (Exceeds `$5000` limit!).
3. Click **Stock** and change quantity from `4` to `3`.
4. Observe the console output in Terminal 1 (API):
   ```
   ================================================================
   [SIMULATED SMS/EMAIL] HIGH-VALUE REORDER APPROVAL REQUIRED
   Product: Dell UltraSharp 32-inch 4K Monitor (SKU: MON-DELL-U3223)
   Quantity: 15 | Total Value: $11992.50 (Limit: $5000)
   Generated OTP: >>> 837192 <<< (Valid for 5 minutes)
   ================================================================
   ```
5. Navigate to `http://localhost:3000/reorders`:
   - The reorder appears with status `PENDING APPROVAL`.
   - Click the amber **Approve** button on that row.
6. **Test Incorrect OTP**:
   - Enter `111111` and click **Approve & Enqueue**.
   - Notice the error badge: `Invalid OTP. You have 4 attempt(s) remaining.`
7. **Test OTP Resend**:
   - Click **Resend new OTP**.
   - A new code is dispatched and printed to the server console.
8. **Test Valid OTP Approval**:
   - Enter the newly generated 6-digit code from the console and click **Approve & Enqueue**.
   - The status updates to `QUEUED`, enqueuing the job in BullMQ.
   - Terminal 2 (Worker) picks up the job, marks it `PROCESSING`, calls the supplier, and updates to `COMPLETED`.

---

### Test 3: Real-Time Event Stream

1. Open `http://localhost:3000/notifications`.
2. Keep this tab open while modifying stock in another tab.
3. Every low-stock alert and reorder state change (`PENDING_APPROVAL`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) streams live into the feed with zero page refresh!

---

## 📡 REST API Documentation

All API responses follow consistent JSON formats:

**Success Response**:
```json
{ "data": { ... } }
```

**Consistent Error Envelope**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "sku", "message": "SKU is required" }
    ]
  }
}
```

### Products Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/products` | Retrieve all inventory products | `200` |
| `POST` | `/api/products` | Create product (Zod validated, checks initial low-stock) | `201`, `400`, `409`, `422` |
| `GET` | `/api/products/:id` | Get product by UUID | `200`, `404` |
| `PUT` | `/api/products/:id` | Update product details | `200`, `400`, `404`, `409`, `422` |
| `PATCH`| `/api/products/:id/stock` | Update stock quantity (atomic transaction & low-stock check) | `200`, `400`, `404`, `422` |
| `DELETE`| `/api/products/:id` | Delete product (blocked if reorders exist) | `204`, `404`, `409` |

### Reorders Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/reorders` | List reorders (supports `?status=...&page=1&limit=10`) | `200`, `422` |
| `GET` | `/api/reorders/:id` | Get reorder details with product data | `200`, `404` |
| `POST` | `/api/reorders/:id/approve` | Submit 6-digit OTP to approve high-value reorder | `200`, `400`, `404`, `409`, `422` |
| `POST` | `/api/reorders/:id/otp/resend` | Issue and log a fresh 6-digit OTP | `200`, `404`, `409` |
| `GET` | `/api/health` | Service health check (PostgreSQL + Redis ping) | `200`, `503` |

---

## 📂 Project Structure

```
.
├── docker-compose.yml              # PostgreSQL 16 & Redis 7 services
├── .env.example                    # Root environment configuration
├── README.md                       # Comprehensive system guide
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma Schema (models, enums, indexes)
│   │   ├── migrations/             # Committed SQL migration directory
│   │   │   └── 20241010000000_init/
│   │   │       └── migration.sql   # Exact PostgreSQL DDL
│   │   └── seed.ts                 # Database seed script (10 items)
│   ├── src/
│   │   ├── config/env.ts           # Typed environment config with Zod
│   │   ├── controllers/            # HTTP controller handlers
│   │   ├── middleware/             # Error handler, Zod validator, Logger
│   │   ├── queue/                  # BullMQ queue, Redis factory, Worker
│   │   ├── repositories/           # Prisma queries & FOR UPDATE locks
│   │   ├── routes/                 # Express route definitions
│   │   ├── services/               # Low-stock logic, OTP service, Reorders
│   │   ├── sockets/                # Socket.IO & Redis Pub/Sub relay
│   │   ├── utils/                  # AppError subclasses, logger
│   │   ├── validators/             # Zod input validation schemas
│   │   ├── app.ts                  # Express application setup
│   │   ├── server.ts               # Primary API server entry point
│   │   └── worker.ts               # Standalone BullMQ worker process
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── inventory/page.tsx   # Live Inventory management page
    │   │   ├── reorders/page.tsx    # Automated Reorders pipeline page
    │   │   ├── notifications/page.tsx # Real-time event stream feed
    │   │   ├── layout.tsx           # Providers, Navbar, ToastContainer
    │   │   └── globals.css          # Styling & sleek dark theme
    │   ├── components/              # Modals, Navigation, Toasts
    │   ├── context/SocketContext.tsx# Auto-reconnecting Socket.IO provider
    │   └── lib/                     # API client and TypeScript models
    ├── package.json
    └── tailwind.config.ts
```

---

## 🎯 Requirements Traceability Matrix

| Requirement | Implementation File(s) |
|---|---|
| PostgreSQL + Prisma Schema & Migrations | `backend/prisma/schema.prisma`<br>`backend/prisma/migrations/20241010000000_init/migration.sql` |
| DB Indexes (`sku`, `status`, `productId`) | `backend/prisma/schema.prisma:34,57,58` |
| Low-stock detection in DB transaction | `backend/src/services/lowstock.service.ts`<br>`backend/src/services/product.service.ts` |
| Duplicate reorder guard (`SELECT ... FOR UPDATE`) | `backend/src/repositories/product.repository.ts:32-41`<br>`backend/src/repositories/reorder.repository.ts:89-106` |
| Socket.IO `low-stock` event & Reorder creation | `backend/src/services/lowstock.service.ts:46-75`<br>`backend/src/sockets/socket.ts:56-62` |
| High-value approval (> limit, bcrypt OTP, 5-min expiry) | `backend/src/services/otp.service.ts`<br>`backend/src/services/lowstock.service.ts:58-75` |
| OTP approval & resend endpoints (5-attempt lockout) | `backend/src/services/reorder.service.ts:30-145`<br>`backend/src/routes/reorder.routes.ts` |
| BullMQ Worker (1-3s delay, ~20% failure, 3 retries, backoff) | `backend/src/queue/reorder.worker.ts`<br>`backend/src/worker.ts` |
| Worker → Browser real-time relay via Redis Pub/Sub | `backend/src/sockets/pubsub.ts`<br>`backend/src/sockets/socket.ts:38-44` |
| REST API (`{ error: { code, message, details? } }`, status codes) | `backend/src/middleware/error.middleware.ts`<br>`backend/src/controllers/`<br>`backend/src/routes/` |
| Safe product deletion with reorder block (409 Conflict) | `backend/src/services/product.service.ts:98-112` |
| Frontend `/inventory` with modals & badges | `frontend/src/app/inventory/page.tsx`<br>`frontend/src/components/ProductModal.tsx`<br>`frontend/src/components/StockUpdateModal.tsx` |
| Frontend `/reorders` with OTP modal & details drawer | `frontend/src/app/reorders/page.tsx`<br>`frontend/src/components/OtpApprovalModal.tsx`<br>`frontend/src/components/ReorderDetailsModal.tsx` |
| Frontend `/notifications` live stream | `frontend/src/app/notifications/page.tsx` |
| Global Top-Nav, bell counter, toasts, socket provider | `frontend/src/components/Navbar.tsx`<br>`frontend/src/components/ToastContainer.tsx`<br>`frontend/src/context/SocketContext.tsx` |
| Seed script with 10 products | `backend/prisma/seed.ts` |
| Docker Compose (Postgres 16 + Redis 7) | `docker-compose.yml` |
#   I n v e n t o r y - M a n a g e m e n t  
 