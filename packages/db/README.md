# @fasterclaw/db

Prisma-based database package for FasterClaw - a managed OpenClaw hosting service.

## Database Models

- **User**: Customer accounts with authentication and Stripe billing
- **Instance**: OpenClaw bot instances running on Fly.io
- **Subscription**: Stripe subscription management and plan limits

## Setup

1. Set your DATABASE_URL environment variable:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/fasterclaw"
```

2. Generate the Prisma Client:
```bash
pnpm db:generate
```

3. Run migrations:
```bash
pnpm db:migrate
```

## Scripts

- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:migrate` - Run migrations in development
- `pnpm db:migrate:deploy` - Run migrations in production
- `pnpm db:push` - Push schema changes without migrations
- `pnpm db:studio` - Open Prisma Studio GUI

## Usage

```typescript
import { prisma } from '@fasterclaw/db';

// Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    passwordHash: hashedPassword,
    name: 'John Doe',
  },
});

// Create an instance
const instance = await prisma.instance.create({
  data: {
    userId: user.id,
    name: 'My Bot',
    telegramBotToken: 'token',
  },
});
```
