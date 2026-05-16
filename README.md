# RealNest API

A production-grade REST API for a real estate platform supporting 
property listings, viewing bookings, and agent subscriptions.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (ioredis) |
| Queue | BullMQ |
| Payments | Stripe |
| Image Storage | Cloudinary |
| Email | Nodemailer (SMTP) |
| Logging | Pino |
| Documentation | Swagger/OpenAPI |
| Container | Docker + Docker Compose |
| Deployment | Railway |

## Features

### Authentication & Authorization
- JWT access tokens + refresh token rotation
- Email verification with OTP
- Password reset via email
- Role-based access control (Buyer, Agent, Admin)
- Redis token blacklisting on logout
- Rate limiting (global, auth, per-user)

### Property Management
- Full CRUD for property listings
- Advanced search with filters (city, price, type, category, bedrooms)
- Featured listings with Stripe one-time payments
- Image upload via Cloudinary (up to 10 images per property)
- Property status lifecycle (Draft → Active → Sold/Rented)
- Redis caching with stampede prevention

### Booking System
- Viewing appointment scheduling
- Conflict detection (pessimistic locking)
- Auto-cancel if agent doesn't confirm within 48 hours (BullMQ delayed job)
- 24-hour reminder emails (BullMQ delayed job)
- Dynamic viewing duration (property override → agent default → system default)

### Subscription System (Agents)
- Three plans: Free Trial, Basic ($29/mo), Premium ($79/mo)
- Stripe recurring subscriptions
- Dunning management for failed payments
- Grace period on subscription expiry
- Usage tracking per billing cycle (PackageRecord)
- Auto-deactivate listings on plan downgrade

### Payments
- Stripe subscription billing
- One-time featured listing payments
- Full webhook handling with idempotency
- Dead letter queue for failed webhooks
- Webhook replay via admin endpoint
- Complete payment history

### Background Jobs (BullMQ)
- Email delivery (OTP, reset, booking notifications)
- Booking auto-cancel (48hr no confirmation)
- Viewing reminders (24hr before)
- Featured listing expiry (30-day delayed job)
- Subscription expiry warnings (7-day reminder)
- Dead letter queue for failed jobs
- Bull Board monitoring dashboard at /admin/queues

### Admin Dashboard
- User management (activate/deactivate, role changes)
- Property management (view all, force deactivate)
- Revenue analytics (monthly breakdown)
- Booking statistics
- Failed webhook management with replay
- Queue monitoring via Bull Board

### Observability
- Structured JSON logging with Pino
- Request ID tracing across all log lines
- Health check endpoint (/health) with dependency status
- Database, Redis, and queue latency monitoring

## Architecture

src/
config/          → env, database, redis, stripe, cloudinary
modules/
auth/          → register, login, verify, refresh, logout
properties/    → CRUD, search, images, featured
bookings/      → schedule, confirm, cancel, complete
reviews/       → create, list
saved/         → save, unsave, list
subscriptions/ → plans, billing, usage
payments/      → webhook handling, history
uploads/       → Cloudinary integration
admin/         → users, analytics, webhooks
shared/
errors/        → custom error classes
middleware/    → auth, validation, rate limiting
repository/    → base repository pattern
services/      → cache, health
utils/         → helpers, mailer, templates
jobs/
queues/        → email, featured expiry, DLQ
workers/       → email worker
processors/    → email processor
types/           → Express type extensions

## API Documentation

Full Swagger documentation available at:
https://realnest-api.railway.app/api/docs


## Getting Started

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Stripe account (test keys)
- Cloudinary account
- SMTP credentials

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/realnest-api
cd realnest-api

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Run migrations
npx prisma migrate dev

# Start development server + worker
npm run dev:all
```

### Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
REFRESHTOKEN_NAME=...
REFRESHTOKEN_EXPIRES_IN=7
BCRYPT_ROUNDS=10
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTENDURL=http://localhost:5173
ALLOWED_ORIGIN=http://localhost:5173


### Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

## Key Engineering Decisions

**Pessimistic Locking** — Booking conflict detection uses `SELECT FOR UPDATE` 
to prevent double-booking under concurrent load.

**Cache Stampede Prevention** — Redis SET NX locking prevents thundering 
herd when cache expires under high traffic.

**Idempotent Webhooks** — All Stripe webhooks are processed exactly once 
using Redis SET NX on the event ID. Transient failures return 500 for 
Stripe retry. Permanent failures go to dead letter queue.

**Refresh Token Rotation** — Every token refresh issues a new refresh token 
and invalidates the old one. Stolen tokens are automatically invalidated.

**Subscription Grace Period** — Failed payments trigger a 7-day grace period 
before listings are deactivated, preventing false positives from temporary 
card issues.

**Worker Separation** — HTTP server and BullMQ worker run as separate 
processes, allowing independent scaling and preventing heavy jobs from 
affecting API response times.

## Live API
