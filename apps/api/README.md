# FasterClaw API

Fastify-based API for FasterClaw - Deploy and manage OpenClaw instances on Fly.io.

## Architecture

This API is built following patterns from Launchier's core API:
- Contract-first development with Zod schemas
- Type-safe routes using `fastify-type-provider-zod`
- JWT authentication with Bearer tokens
- Stripe integration for billing
- Fly.io Machines API integration for instance management

## Project Structure

```
apps/api/
├── src/
│   ├── plugins/           # Fastify plugins
│   │   ├── cors.ts        # CORS configuration for fasterclaw.com
│   │   ├── cookie.ts      # Cookie parsing
│   │   └── jwt.ts         # JWT authentication
│   ├── routes/            # API routes
│   │   ├── health.ts      # Health check endpoint
│   │   ├── auth.ts        # Authentication (register, login, me)
│   │   ├── instances.ts   # Instance CRUD operations
│   │   └── billing.ts     # Stripe billing & webhooks
│   ├── services/          # External service integrations
│   │   ├── stripe.ts      # Stripe SDK wrapper
│   │   └── fly.ts         # Fly.io Machines API client
│   ├── app.ts             # Fastify app factory
│   └── index.ts           # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Health
- `GET /health` - Health check

### Authentication
- `POST /auth/register` - Create account (email, password, name)
- `POST /auth/login` - Login, returns JWT
- `GET /auth/me` - Get current user (protected)

### Instances
All instance routes require authentication (`Authorization: Bearer <token>`)

- `POST /instances` - Create new OpenClaw instance
- `GET /instances` - List user's instances
- `GET /instances/:id` - Get instance by ID
- `POST /instances/:id/start` - Start stopped instance
- `POST /instances/:id/stop` - Stop running instance
- `DELETE /instances/:id` - Delete instance

### Billing
- `POST /billing/checkout` - Create Stripe checkout session
- `GET /billing/subscription` - Get subscription status (protected)
- `POST /billing/webhook` - Stripe webhook handler

## Environment Variables

Required:
- `API_JWT_SECRET` - Secret for signing JWTs
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `FLY_API_TOKEN` - Fly.io API token

Optional:
- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `FLY_ORG_SLUG` - Fly.io organization slug (default: personal)
- `LOG_LEVEL` - Logging level (info, debug, warn, error)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3001/docs
- Health check: http://localhost:3001/health

## Authentication Flow

1. User registers via `POST /auth/register` or logs in via `POST /auth/login`
2. API returns JWT token in response
3. Client includes token in subsequent requests: `Authorization: Bearer <token>`
4. Protected routes use `preHandler: [app.authenticate]` to verify tokens

## Fly.io Integration

The Fly.io service (`src/services/fly.ts`) provides methods to:
- `createApp(name)` - Create a Fly app
- `createMachine(appName, config)` - Create machine with OpenClaw image
- `startMachine(appName, machineId)` - Start stopped machine
- `stopMachine(appName, machineId)` - Stop running machine
- `deleteMachine(appName, machineId)` - Delete machine
- `deleteApp(appName)` - Delete Fly app

## Stripe Integration

The Stripe service (`src/services/stripe.ts`) handles:
- Customer creation and management
- Checkout session creation
- Webhook signature verification
- Subscription lifecycle events

### Webhook Events
The API handles these Stripe webhook events:
- `checkout.session.completed` - Create subscription record
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Mark subscription as canceled
- `invoice.payment_succeeded` - Confirm payment
- `invoice.payment_failed` - Mark subscription as past due

## Database

The API uses Prisma client from `@fasterclaw/db` workspace package. Required models:
- `User` - User accounts with authentication
- `Instance` - OpenClaw instances
- `Subscription` - Stripe subscriptions

## Type Safety

All routes use Zod schemas for request/response validation:
- Request bodies are validated automatically
- Response schemas ensure type safety
- TypeScript types are inferred from Zod schemas

## Error Handling

Standard HTTP error responses:
- `400` - Bad request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal server error
