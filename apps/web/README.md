# FasterClaw Web App

Next.js 14 web application for FasterClaw - Deploy Claude AI instances in under 1 minute.

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### Development

```bash
# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (public)/            # Public routes (sign-in, create-account, pricing)
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── Layout/              # Dashboard layout components
│   ├── Sidebar/             # Sidebar navigation
│   └── Providers/           # Theme and toast providers
├── actions/                 # Server actions
│   ├── auth.actions.ts      # Authentication
│   ├── instances.actions.ts # Instance management
│   └── billing.actions.ts   # Billing & subscriptions
├── lib/                     # Utilities
│   ├── utils.ts             # General utilities
│   └── api.ts               # API client helper
└── middleware.ts            # Auth middleware
```

## Features

### Landing Page
- Hero section with CTAs
- Features showcase
- Pricing tiers ($39/$79/$149)
- Responsive design

### Authentication
- Sign in page
- Create account page
- Password validation
- Cookie-based auth

### Dashboard
- Instance list with stats
- Create new instance wizard
- Instance detail view with metrics
- Settings page (profile, password, API keys)

### Components
- Collapsible sidebar with theme toggle
- Responsive layout
- Dark mode support
- Toast notifications

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI + custom styling)
- **Icons**: Lucide React
- **State**: Zustand
- **Theme**: next-themes
- **Notifications**: react-hot-toast

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Integration

The app connects to the Fastify backend API. Server actions in `src/actions/` handle:

- Authentication (login, register, logout)
- Instance management (CRUD operations)
- Billing (checkout, subscriptions, invoices)

API client helper (`src/lib/api.ts`) provides:
- Type-safe API calls
- Automatic auth token handling
- Error handling

## Navigation

**Sidebar navigation:**
- Dashboard (home icon) → `/dashboard`
- Instances (server icon) → `/dashboard`
- Billing (credit-card icon) → `/dashboard/billing`
- Settings (settings icon) → `/dashboard/settings`

**Public routes:**
- `/` - Landing page
- `/sign-in` - Sign in
- `/create-account` - Registration
- `/pricing` - Pricing page

**Protected routes:**
- `/dashboard` - Instance list
- `/dashboard/instances/new` - Create instance
- `/dashboard/instances/[id]` - Instance details
- `/dashboard/settings` - Account settings

## Build

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

## Type Checking

```bash
pnpm typecheck
```

## Linting

```bash
pnpm lint
```
