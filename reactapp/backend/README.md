# Inventory backend

Node.js + TypeScript + Express API for products, stock movements and approval-controlled reorder requests.

## Local setup

1. Start PostgreSQL and Redis, then create a database (for example `inventory`).
2. Copy `.env.example` to `.env` and update `DATABASE_URL` and `REDIS_URL`.
3. Install and build:

```bash
npm install
npm run db:migrate
npm run dev
# in another terminal:
npm run worker
```

The API runs on `http://localhost:4000`; health is `GET /health`. Socket.IO clients connect to the same origin and listen for `low-stock` events.

## API

- `GET/POST/PATCH/DELETE /api/products`
- `GET /api/stock/low-stock`
- `GET /api/stock/:productId/movements`
- `POST /api/stock/:productId/adjust` with `{ "quantity": -2, "reason": "sale" }`
- `GET/POST /api/reorders`
- `POST /api/reorders/:id/otp/request`
- `POST /api/reorders/:id/otp/verify` with `{ "code": "123456" }`

In development the OTP response includes `development_code` so the flow can be tested without an SMS provider. Production should replace that response with an email/SMS integration. Use a reverse proxy, authentication/authorization, and TLS before production deployment.
