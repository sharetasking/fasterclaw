# FasterClaw - 3-Day Build Plan

## What We're Building

A managed hosting service for [OpenClaw](https://github.com/openclaw/openclaw) - users sign up, connect Telegram, and get a running AI assistant in under 1 minute. Competitor to SimpleClaw.

## Tech Stack (Copy from Launchier)

| Layer            | Choice                      | Copy From                                                            |
| ---------------- | --------------------------- | -------------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router)     | Fresh, but copy patterns                                             |
| **Backend**      | Fastify + Zod               | `packages/core/api`                                                  |
| **Database**     | Neon PostgreSQL + Prisma    | `packages/core/db`                                                   |
| **Auth**         | NextAuth (cookie-based JWT) | `apps/web/src/middleware.ts`, `packages/core/api/src/plugins/jwt.ts` |
| **Payments**     | Stripe                      | `packages/core/api/src/routes/billing.ts`, `services/stripe.ts`      |
| **Provisioning** | Fly.io Machines API         | New (REST API)                                                       |
| **UI**           | Tailwind + shadcn/ui        | `apps/web/src/components/`                                           |
| **Deploy**       | Vercel (web) + Fly.io (API) | Same as Launchier                                                    |

## What to Copy from Launchier

### Frontend (apps/web)

- `middleware.ts` - Auth middleware pattern
- `components/Providers/` - Theme + Toast setup
- `components/Layout/` - Dashboard layout with sidebar
- `components/Sidebar/` - Collapsible sidebar
- `actions/` pattern - Server actions structure
- `store/` - Zustand UI state pattern

### Backend (packages/core/api)

- `plugins/jwt.ts` - JWT authentication
- `plugins/cors.ts` - CORS setup
- `plugins/cookie.ts` - Cookie parsing
- `routes/auth.ts` - Auth routes (register, login, me)
- `routes/billing.ts` - Stripe checkout, subscription status
- `services/stripe.ts` - Stripe helpers
- `app.ts` - App factory pattern

## Core User Flow

```
Sign Up (email/password) → Pick Plan (Stripe) → Enter Telegram Token → Deploy Instance (Fly.io) → Done
```

## Database Schema

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  passwordHash     String
  name             String?
  stripeCustomerId String?
  subscription     Subscription?
  instances        Instance[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model Instance {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  flyMachineId  String?  @unique
  flyAppName    String?  @unique
  status        String   @default("pending") // pending, provisioning, running, stopped, error
  telegramBotToken String?
  aiModel       String   @default("claude-sonnet-4")
  region        String   @default("iad")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  stripeSubscriptionId String @unique
  stripePriceId     String
  status            String
  currentPeriodEnd  DateTime
  createdAt         DateTime @default(now())
}
```

## API Routes (Fastify)

```
# Auth (copy from Launchier)
POST /auth/register          - Create account
POST /auth/login             - Login, get JWT
GET  /auth/me                - Get current user

# Instances
POST /instances              - Create new instance
GET  /instances              - List user's instances
GET  /instances/:id          - Get instance details
POST /instances/:id/start    - Start instance
POST /instances/:id/stop     - Stop instance
DELETE /instances/:id        - Delete instance

# Billing (copy from Launchier)
POST /billing/checkout       - Create Stripe checkout session
GET  /billing/subscription   - Get subscription status
POST /billing/webhook        - Stripe webhook handler
```

## Fly.io Provisioning Logic

```typescript
// Simplified flow
async function provisionInstance(instance: Instance, telegramToken: string) {
  // 1. Create Fly app
  const app = await fly.apps.create({ name: `fc-${instance.id}` });

  // 2. Create machine with OpenClaw Docker image
  const machine = await fly.machines.create(app.name, {
    config: {
      image: "openclaw/openclaw:latest", // or build our own
      env: {
        TELEGRAM_BOT_TOKEN: telegramToken,
        AI_MODEL: instance.aiModel,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, // shared or user's
      },
      services: [{ ports: [{ port: 443 }], protocol: "tcp" }],
    },
    region: instance.region,
  });

  // 3. Update DB
  await prisma.instance.update({
    where: { id: instance.id },
    data: { flyMachineId: machine.id, flyAppName: app.name, status: "running" },
  });
}
```

---

## 3-Day Dev Split (3 Developers)

### Dev 1: Frontend & Landing Page

| Day       | Tasks                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 1** | - Project setup (Next.js 16, Tailwind, shadcn/ui) <br> - Copy Providers, Layout, Sidebar from Launchier <br> - Landing page (hero, features, pricing, CTA)                       |
| **Day 2** | - Auth pages (sign-in, create-account) - copy patterns from Launchier <br> - Dashboard layout with instance list <br> - "Create Instance" wizard (model, region, Telegram token) |
| **Day 3** | - Instance detail page (status, controls, logs link) <br> - Settings/account page <br> - Responsive polish, deploy to Vercel                                                     |

### Dev 2: Backend & Provisioning (Fastify)

| Day       | Tasks                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 1** | - Copy Fastify app factory from Launchier <br> - Copy JWT + CORS + Cookie plugins <br> - Neon DB setup + Prisma schema <br> - Auth routes (copy from Launchier, simplify) |
| **Day 2** | - Instance CRUD routes <br> - Fly.io API client (create app, create machine, start/stop) <br> - Instance provisioning service                                             |
| **Day 3** | - Health check / status sync job <br> - Error handling & retry logic <br> - Deploy API to Fly.io                                                                          |

### Dev 3: Billing & Integrations

| Day       | Tasks                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Day 1** | - Copy Stripe service + billing routes from Launchier <br> - Stripe products/prices setup <br> - Checkout session creation |
| **Day 2** | - Stripe webhook handler <br> - Subscription sync to DB <br> - Gate instance creation on active subscription               |
| **Day 3** | - Telegram bot token validation endpoint <br> - Billing portal integration <br> - E2E testing, bug fixes                   |

---

## Pricing Tiers (Suggested)

SimpleClaw averages ~$50/user. Position FasterClaw as premium with better value:

| Plan         | Price   | Instances | Features                                                    |
| ------------ | ------- | --------- | ----------------------------------------------------------- |
| **Starter**  | $39/mo  | 1         | Telegram, Claude Sonnet, 24/7 uptime                        |
| **Pro**      | $79/mo  | 3         | + Discord, model choice (Opus/GPT-5), priority provisioning |
| **Business** | $149/mo | 10        | + WhatsApp, dedicated support, custom domain                |

**Why higher pricing works:**

- AI API costs (Anthropic) are real - you need margin
- Fly.io compute costs ~$5-15/instance/mo
- Premium positioning = better customers, less support
- SimpleClaw proving $50+ market exists

---

## Day-by-Day Milestones

### End of Day 1

- Monorepo scaffolded, copying Launchier patterns
- Landing page live (Vercel)
- Auth working (register/login)
- DB schema deployed (Neon)
- Stripe products created

### End of Day 2

- Dashboard UI with instance list
- Instance CRUD working
- Fly.io provisioning working
- Checkout flow complete

### End of Day 3

- Full flow: Sign up → Pay → Deploy → Running bot
- Instance management (start/stop/delete)
- Production deploy (Vercel + Fly.io)

---

## Key Files to Create/Copy

### From Launchier → FasterClaw

| Launchier File                             | FasterClaw File                      | Notes                              |
| ------------------------------------------ | ------------------------------------ | ---------------------------------- |
| `apps/web/src/middleware.ts`               | `apps/web/src/middleware.ts`         | Adapt routes                       |
| `apps/web/src/components/Providers/`       | `apps/web/src/components/Providers/` | Remove PostHog/FB                  |
| `apps/web/src/components/Layout/`          | `apps/web/src/components/Layout/`    | Simplify                           |
| `apps/web/src/components/Sidebar/`         | `apps/web/src/components/Sidebar/`   | Update nav items                   |
| `packages/core/api/src/app.ts`             | `apps/api/src/app.ts`                | Strip unused routes                |
| `packages/core/api/src/plugins/jwt.ts`     | `apps/api/src/plugins/jwt.ts`        | Copy directly                      |
| `packages/core/api/src/plugins/cors.ts`    | `apps/api/src/plugins/cors.ts`       | Update domains                     |
| `packages/core/api/src/plugins/cookie.ts`  | `apps/api/src/plugins/cookie.ts`     | Copy directly                      |
| `packages/core/api/src/routes/auth.ts`     | `apps/api/src/routes/auth.ts`        | Simplify (no OAuth needed for MVP) |
| `packages/core/api/src/routes/billing.ts`  | `apps/api/src/routes/billing.ts`     | Adapt for plans                    |
| `packages/core/api/src/services/stripe.ts` | `apps/api/src/services/stripe.ts`    | Update price IDs                   |

### New Files to Create

| File                                                 | Purpose                                  |
| ---------------------------------------------------- | ---------------------------------------- |
| `apps/api/src/services/fly.ts`                       | Fly.io Machines API client               |
| `apps/api/src/routes/instances.ts`                   | Instance CRUD + lifecycle                |
| `apps/web/src/app/page.tsx`                          | Landing page                             |
| `apps/web/src/app/dashboard/page.tsx`                | Instance list                            |
| `apps/web/src/app/dashboard/instances/[id]/page.tsx` | Instance detail                          |
| `packages/db/prisma/schema.prisma`                   | DB schema (User, Instance, Subscription) |

---

## Environment Variables

```bash
# Web App (.env.local)
API_URL=http://localhost:5050
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# API (.env)
DATABASE_URL=postgresql://...@neon.tech/fasterclaw

# JWT
JWT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_TEAM=

# Fly.io
FLY_API_TOKEN=
FLY_ORG_SLUG=

# AI (injected into user instances)
ANTHROPIC_API_KEY=
```

---

## Decisions Made

- **AI API keys**: FasterClaw provides keys (users pay you, you pay Anthropic). Future: option for users to swap in their own key.
- **Domain**: Ready to go
- **Docker image**: Use official `openclaw/openclaw` image for MVP
- **Regions**: Start with `iad` (Virginia), expand later

---

## Project Structure (Monorepo like Launchier)

```
fasterclaw/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/     # Copy Sidebar, Layout from Launchier
│   │   │   ├── actions/        # Server actions
│   │   │   └── middleware.ts   # Copy auth pattern
│   │   └── package.json
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   ├── plugins/        # Copy jwt, cors, cookie from Launchier
│       │   ├── services/       # fly.ts, stripe.ts
│       │   └── app.ts
│       └── package.json
├── packages/
│   └── db/                     # Prisma schema + client
│       ├── prisma/schema.prisma
│       └── src/client.ts
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Quick Start Commands

```bash
# Create monorepo structure
mkdir fasterclaw && cd fasterclaw
pnpm init
echo 'packages:\n  - "apps/*"\n  - "packages/*"' > pnpm-workspace.yaml

# Create web app
mkdir -p apps/web
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --eslint --app

# Create API app (copy structure from Launchier)
mkdir -p apps/api/src/{routes,plugins,services}

# Create DB package
mkdir -p packages/db/prisma
cd packages/db && pnpm init && pnpm add @prisma/client && pnpm add -D prisma

# Add shadcn to web
cd apps/web
npx shadcn@latest init
npx shadcn@latest add button card input label tabs badge dialog toast
```
