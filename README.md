# Inventory Management & Automated Reorder System

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.21-FF4500?style=for-the-badge)](https://bullmq.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A production-grade, distributed **Inventory Management and Automated Reorder System** engineered with Node.js, TypeScript, PostgreSQL, Prisma ORM, BullMQ, Redis, Socket.IO, and Next.js 14 App Router.

Repository: [https://github.com/SanketP2003/Inventory-Management](https://github.com/SanketP2003/Inventory-Management)  
Author: **Sanket Patil** ([@SanketP2003](https://github.com/SanketP2003))

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [System Architecture](#-system-architecture)
3. [Design Decisions & Core Mechanisms](#-design-decisions--core-mechanisms)
4. [Technology Stack](#-technology-stack)
5. [Prerequisites](#-prerequisites)
6. [Installation & Setup](#-installation--setup)
7. [Running the Application](#-running-the-application)
8. [End-to-End Verification Guide](#-end-to-end-verification-guide)
9. [REST API Documentation](#-rest-api-documentation)
10. [Environment Variables Reference](#-environment-variables-reference)
11. [Project Structure](#-project-structure)
12. [Requirements Traceability Matrix](#-requirements-traceability-matrix)
13. [Author & License](#-author--license)

---

## ✨ Key Features

- **⚡ Real-Time Inventory Tracking**: Instant live stock synchronization across connected browser clients using WebSockets (Socket.IO) and Redis Pub/Sub.
- **🔒 Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: Eliminates race conditions during concurrent stock modifications and ensures duplicate reorders cannot be spawned simultaneously.
- **🛡️ High-Value Order Security (Bcrypt OTP)**: Reorders exceeding the configurable approval threshold (`$5,000` default) require 6-digit OTP verification with 5-minute expiry, a 5-attempt brute-force lockout, and resend protection.
- **📬 Distributed Asynchronous Job Queue (BullMQ + Redis)**: Decoupled background worker with idempotent job execution, supplier latency simulation (1–3s), transient failure simulation (~20%), and 3 retries with exponential backoff.
- **🔄 Automated Stock Replenishment**: Upon successful reorder completion, the worker atomically increments the product inventory in PostgreSQL and broadcasts the update.
- **🧱 Referential Integrity**: Protects audit logs and accounting history by restricting product deletions if associated reorder records exist (`409 Conflict`).
- **🎨 Sleek Dark Dashboard**: Built with Next.js 14 App Router, Tailwind CSS, Lucide icons, toast alerts, status badges, and an interactive real-time event stream.

---

## 🏛️ System Architecture

The application is structured into decoupled, event-driven processes:

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

## 💡 Design Decisions & Core Mechanisms

### 1. Pessimistic Row Locking & Race Condition Prevention
When stock is checked or updated, `ProductRepository.findByIdForUpdate` triggers:
```sql
SELECT * FROM "products" WHERE "id" = $id FOR UPDATE
```
within an atomic Prisma transaction (`$transaction`). If multiple API calls attempt to update stock simultaneously, subsequent transactions block until the first commit completes. Duplicate reorders are atomically prevented by checking for existing active reorders in `PENDING_APPROVAL`, `QUEUED`, or `PROCESSING` states.

### 2. High-Value OTP Approval Workflow
- Configured by `REORDER_APPROVAL_LIMIT` (default: `$5000.00`).
- If `reorderQuantity * costPrice > REORDER_APPROVAL_LIMIT`, the reorder status is set to `PENDING_APPROVAL`.
- A 6-digit cryptographically random OTP is generated, hashed with **bcrypt**, and stored with a 5-minute expiry. Plaintext OTPs are never stored in the database.
- OTPs are logged to the backend console (simulating SMS/Email dispatch). If `DEV_EXPOSE_OTP=true`, the OTP is included in developer notifications for streamlined automated testing.
- After 5 consecutive invalid OTP attempts, the reorder is locked (`OTP_LOCKED`). Users can request a fresh code via `POST /api/reorders/:id/otp/resend`.

### 3. Asynchronous BullMQ Queue & Resilient Worker
- Operates as an independent process (`npm run worker`), decoupled from the Express API.
- Idempotent: checks current database status before processing.
- Simulates supplier API latency between 1,000ms and 3,000ms.
- Simulates a 20% transient supplier failure rate. BullMQ retries up to 3 times with exponential backoff (`delay: 1500ms`).
- On successful completion, the reorder transitions to `COMPLETED` and atomically increments the product stock.
- On terminal failure (after 3 attempts), the reorder transitions to `FAILED` with an audit error reason.
- Every state transition (`PROCESSING`, `COMPLETED`, `FAILED`) publishes an event to Redis channel `inventory:reorder-events`, relayed to the browser via Socket.IO.

### 4. Referential Integrity on Deletion
Products with associated reorder history cannot be deleted. Attempting to delete returns `409 Conflict` (`PRODUCT_HAS_REORDERS`), ensuring compliance, financial integrity, and complete audit trails.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js 20+, TypeScript, Express 4, Prisma ORM 5, PostgreSQL 16 |
| **Async Queue** | BullMQ 5, Redis 7 (ioredis) |
| **Real-Time Layer** | Socket.IO 4, Redis Pub/Sub |
| **Validation & Security** | Zod 3, Helmet, CORS, Bcrypt, Morgan |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React, Socket.IO Client |
| **Infrastructure** | Docker Compose (PostgreSQL 16 Alpine, Redis 7 Alpine) |

---

## 📋 Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **Docker & Docker Compose**: For containerized PostgreSQL and Redis

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SanketP2003/Inventory-Management.git
cd Inventory-Management
```

### 2. Start Infrastructure (PostgreSQL & Redis)
Launch the database and queue broker via Docker Compose:
```bash
docker-compose up -d
```
Verify containers are healthy:
- PostgreSQL 16 running on `localhost:5432`
- Redis 7 running on `localhost:6379`

### 3. Configure Environment Variables
Copy the sample environment configuration files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env.local
```

### 4. Install Dependencies & Seed Database
```bash
# Backend dependencies
cd backend
npm install

# Apply database migrations
npm run migrate

# Seed 10 production-sample inventory products
npm run seed

# Frontend dependencies
cd ../frontend
npm install
```

---

## 🏃 Running the Application

Open **3 separate terminal windows** to run the decoupled processes:

### Terminal 1: Backend API Process
```bash
cd backend
npm run dev
```
> Listens on `http://localhost:5000` with Express, Socket.IO, and Redis Pub/Sub relay.

### Terminal 2: BullMQ Worker Process
```bash
cd backend
npm run worker
```
> Connects to Redis `reorder-queue` and processes supplier orders asynchronously.

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm run dev
```
> Accessible in the browser at `http://localhost:3000`.

---

## 🧪 End-to-End Verification Guide

### Test 1: Low-Stock Event & Auto-Queued Reorder (Total Value ≤ $5,000)

1. Open `http://localhost:3000/inventory` in your browser.
2. Locate **Logitech MX Master 3S** (SKU: `ACC-LOGI-MX3S`):
   - Current Stock: `25`, Threshold: `10`, Cost: `$79.99`, Reorder Qty: `30`
   - Total Reorder Value = `30 * 79.99 = $2,399.70` (Below `$5,000` approval limit).
3. Click the **Stock** button and set the quantity to `5` (below threshold `10`).
4. Click **Confirm Update**:
   - A floating toast notification appears: `⚠️ Low Stock Detected: Logitech MX Master 3S`.
   - The Stock Status badge updates to `Low Stock`.
   - In **Terminal 1 (API)**, notice the low-stock event and automatic `QUEUED` reorder creation.
   - In **Terminal 2 (Worker)**, observe the job being processed:
     ```text
     [Worker] Processing reorder job ... (Reorder ID: ...) - Attempt 1/3
     [Worker] Calling supplier API for Logitech Logistics... (Simulated latency: 2100ms)
     [Worker] Reorder successfully completed! Replenished 30 units.
     ```
   - In the browser, navigate to `/reorders` to observe the state transition to `PROCESSING` then `COMPLETED` in real time.
   - In `/inventory`, the stock will automatically increase by 30 units (`35 units, In Stock`).

---

### Test 2: High-Value Reorder & OTP Approval Flow (Total Value > $5,000)

1. Open `http://localhost:3000/inventory`.
2. Locate **Dell UltraSharp 32-inch 4K Monitor** (SKU: `MON-DELL-U3223`):
   - Cost: `$799.50`, Reorder Qty: `15`, Threshold: `8`.
   - Total Reorder Value = `15 * 799.50 = $11,992.50` (Exceeds `$5,000` approval threshold).
3. Click **Stock** and update quantity from `4` to `3`.
4. Observe the console output in **Terminal 1 (API)**:
   ```text
   ================================================================
   [SIMULATED SMS/EMAIL] HIGH-VALUE REORDER APPROVAL REQUIRED
   Product: Dell UltraSharp 32-inch 4K Monitor (SKU: MON-DELL-U3223)
   Quantity: 15 | Total Value: $11992.50 (Limit: $5000)
   Generated OTP: >>> 837192 <<< (Valid for 5 minutes)
   ================================================================
   ```
5. Navigate to `http://localhost:3000/reorders`:
   - The reorder is flagged with status `PENDING APPROVAL`.
   - Click the amber **Approve** button on that row.
6. **Test Incorrect OTP**:
   - Enter `111111` and click **Approve & Enqueue**.
   - Observe error message: `Invalid OTP. You have 4 attempt(s) remaining.`
7. **Test OTP Resend**:
   - Click **Resend new OTP**. A new OTP code is printed to the server terminal.
8. **Test Valid OTP Approval**:
   - Enter the newly generated 6-digit OTP from the console and click **Approve & Enqueue**.
   - The status updates to `QUEUED`, enqueuing the job in BullMQ.
   - **Terminal 2 (Worker)** picks up the job, marks it `PROCESSING`, calls the supplier, and transitions to `COMPLETED`.

---

### Test 3: Real-Time Event Stream

1. Open `http://localhost:3000/notifications`.
2. Keep this tab open alongside `/inventory` or `/reorders`.
3. Every low-stock trigger and reorder lifecycle event (`PENDING_APPROVAL`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`) streams live into the feed without requiring manual refresh.

---

### Test 4: Concurrency & Referential Deletion Guard

1. Navigate to `/inventory` and attempt to delete a product with an active or completed reorder record.
2. Notice the API returns `409 Conflict` (`PRODUCT_HAS_REORDERS`), preventing broken audit trails.

---

## 📡 REST API Documentation

### Standard Response Envelope

**Success**:
```json
{
  "data": { ... }
}
```

**Error**:
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

---

### Products API

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/products` | Retrieve all inventory products | `200` |
| `POST` | `/api/products` | Create product (Zod validated; checks initial low-stock) | `201`, `400`, `409`, `422` |
| `GET` | `/api/products/:id` | Get single product by UUID | `200`, `404` |
| `PUT` | `/api/products/:id` | Update product details | `200`, `400`, `404`, `409`, `422` |
| `PATCH` | `/api/products/:id/stock` | Atomic stock update (`SELECT ... FOR UPDATE` & low-stock check) | `200`, `400`, `404`, `422` |
| `DELETE` | `/api/products/:id` | Delete product (rejected if reorders exist) | `204`, `404`, `409` |

#### Example: Update Stock (`PATCH /api/products/:id/stock`)
```json
{
  "quantity": 5
}
```

---

### Reorders API

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/reorders` | List reorders (supports `?status=...&page=1&limit=10`) | `200`, `422` |
| `GET` | `/api/reorders/:id` | Get reorder details with product association | `200`, `404` |
| `POST` | `/api/reorders/:id/approve` | Submit 6-digit OTP to approve high-value reorder | `200`, `400`, `404`, `409`, `422` |
| `POST` | `/api/reorders/:id/otp/resend` | Issue and log a fresh 6-digit OTP | `200`, `404`, `409` |
| `GET` | `/api/health` | Service health check (PostgreSQL + Redis ping) | `200`, `503` |

#### Example: Approve Reorder (`POST /api/reorders/:id/approve`)
```json
{
  "otp": "837192"
}
```

---

## ⚙️ Environment Variables Reference

| Variable | Scope | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Backend | `postgresql://inventory_user:inventory_secret_pw@localhost:5432/inventory_db?schema=public` | PostgreSQL connection string |
| `REDIS_URL` | Backend | `redis://localhost:6379` | Redis connection string for BullMQ and Pub/Sub |
| `PORT` | Backend | `5000` | HTTP port for the Express API |
| `NODE_ENV` | Backend | `development` | Runtime environment (`development`, `production`, `test`) |
| `REORDER_APPROVAL_LIMIT` | Backend | `5000` | Monetary threshold triggering OTP requirement ($) |
| `DEV_EXPOSE_OTP` | Backend | `true` | Include plaintext OTP in notification payloads for testing |
| `CORS_ORIGIN` | Backend | `http://localhost:3000` | Permitted origin for CORS headers |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:5000/api` | REST API URL accessible by Next.js |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | `http://localhost:5000` | Socket.IO server URL for browser connection |

---

## 📂 Project Structure

```
Inventory-Management/
├── docker-compose.yml              # PostgreSQL 16 & Redis 7 container services
├── .env.example                    # Root environment configuration reference
├── README.md                       # System documentation & setup guide
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Prisma Schema (models, relations, indexes)
│   │   ├── migrations/             # SQL migration history
│   │   │   └── 20241010000000_init/
│   │   │       └── migration.sql   # PostgreSQL table DDL
│   │   └── seed.ts                 # Database seed script (10 products)
│   ├── src/
│   │   ├── config/env.ts           # Typed environment config with Zod
│   │   ├── controllers/            # Express controllers (Products, Reorders, Health)
│   │   ├── middleware/             # Error handler, Zod request validator, Logger
│   │   ├── queue/                  # BullMQ queue, Redis connection factory, Worker
│   │   ├── repositories/           # Prisma data access & FOR UPDATE queries
│   │   ├── routes/                 # Express API routes
│   │   ├── services/               # Low-stock logic, OTP service, Reorder service
│   │   ├── sockets/                # Socket.IO & Redis Pub/Sub relay
│   │   ├── utils/                  # Structured logger & AppError subclasses
│   │   ├── validators/             # Zod input validation schemas
│   │   ├── app.ts                  # Express application setup
│   │   ├── server.ts               # Primary API server entry point
│   │   └── worker.ts               # Standalone BullMQ worker process entry point
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── inventory/page.tsx   # Live inventory management dashboard
    │   │   ├── reorders/page.tsx    # Automated reorders pipeline & approval
    │   │   ├── notifications/page.tsx # Real-time event stream feed
    │   │   ├── layout.tsx           # Global layout with providers & navigation
    │   │   └── globals.css          # Tailwind CSS styles & theme
    │   ├── components/              # Modals (Product, StockUpdate, OTP), Navbar, Toasts
    │   ├── context/SocketContext.tsx# Auto-reconnecting Socket.IO context provider
    │   └── lib/                     # API client and TypeScript models
    ├── package.json
    └── tailwind.config.ts
```

---

## 🎯 Requirements Traceability Matrix

| System Requirement | Implementation Source File(s) |
|---|---|
| PostgreSQL + Prisma Schema & Migrations | [`backend/prisma/schema.prisma`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/prisma/schema.prisma)<br>[`backend/prisma/migrations/20241010000000_init/migration.sql`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/prisma/migrations/20241010000000_init/migration.sql) |
| DB Indexes (`sku`, `status`, `productId`) | [`backend/prisma/schema.prisma:32,54,55`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/prisma/schema.prisma#L32-L55) |
| Pessimistic Concurrency (`SELECT ... FOR UPDATE`) | [`backend/src/repositories/product.repository.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/repositories/product.repository.ts)<br>[`backend/src/repositories/reorder.repository.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/repositories/reorder.repository.ts) |
| Low-Stock Detection in DB Transaction | [`backend/src/services/lowstock.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/lowstock.service.ts)<br>[`backend/src/services/product.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/product.service.ts) |
| High-Value OTP Reorder Approval (Bcrypt, 5-min expiry) | [`backend/src/services/otp.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/otp.service.ts)<br>[`backend/src/services/reorder.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/reorder.service.ts) |
| OTP Resend & 5-Attempt Lockout | [`backend/src/services/reorder.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/reorder.service.ts)<br>[`backend/src/routes/reorder.routes.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/routes/reorder.routes.ts) |
| BullMQ Worker (1-3s delay, ~20% failure, 3 retries, backoff) | [`backend/src/queue/reorder.worker.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/queue/reorder.worker.ts)<br>[`backend/src/worker.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/worker.ts) |
| Real-Time Relay (Worker → Redis Pub/Sub → Socket.IO → Browser) | [`backend/src/sockets/pubsub.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/sockets/pubsub.ts)<br>[`backend/src/sockets/socket.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/sockets/socket.ts) |
| Standardized REST Error Responses & Status Codes | [`backend/src/middleware/error.middleware.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/middleware/error.middleware.ts)<br>[`backend/src/controllers/`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/controllers/) |
| Safe Deletion Guard with Reorder Check (409 Conflict) | [`backend/src/services/product.service.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/src/services/product.service.ts) |
| Frontend `/inventory` with Modals & Dynamic Badges | [`frontend/src/app/inventory/page.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/app/inventory/page.tsx)<br>[`frontend/src/components/ProductModal.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/components/ProductModal.tsx) |
| Frontend `/reorders` with OTP Modal & Details Drawer | [`frontend/src/app/reorders/page.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/app/reorders/page.tsx)<br>[`frontend/src/components/OtpApprovalModal.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/components/OtpApprovalModal.tsx) |
| Frontend `/notifications` Live Event Stream Feed | [`frontend/src/app/notifications/page.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/app/notifications/page.tsx) |
| Global Top Navigation, Bell Counter & Socket Provider | [`frontend/src/components/Navbar.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/components/Navbar.tsx)<br>[`frontend/src/context/SocketContext.tsx`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/frontend/src/context/SocketContext.tsx) |
| Database Seeding (10 Products) | [`backend/prisma/seed.ts`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/backend/prisma/seed.ts) |
| Dockerized Services (PostgreSQL 16 + Redis 7) | [`docker-compose.yml`](file:///c:/Users/2019s/OneDrive/Desktop/SANKET/Inventory%20Management/docker-compose.yml) |

---

## 👤 Author & License

- **Author**: Sanket Patil ([@SanketP2003](https://github.com/SanketP2003))
- **Repository**: [https://github.com/SanketP2003/Inventory-Management](https://github.com/SanketP2003/Inventory-Management)
- **License**: Licensed under the [MIT License](LICENSE).