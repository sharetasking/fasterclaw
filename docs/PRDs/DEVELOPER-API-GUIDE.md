# API Contract Guide for Developers

**TL;DR: Don't create types. Don't write fetch calls. Use Server Actions.**

---

## The Architecture

```
Component (client) → Server Action → @fasterclaw/api-client → API
```

**All API calls go through Server Actions.** No exceptions.

- Components call Server Actions
- Server Actions use the generated `@fasterclaw/api-client`
- Client-side fetch calls are not allowed

This keeps the contract tight - there's one path to the API, and it's fully typed end-to-end.

---

## Stop Doing This

### ❌ Creating Your Own Types

```typescript
// BAD - You made an orphaned type that will drift from the API
interface User {
  id: string;
  email: string;
  name: string;
}

// BAD - Type assertion is a lie waiting to happen
const user = (await res.json()) as User;
```

### ❌ Writing Manual Fetches

```typescript
// BAD - No validation, no type safety, no error handling
const res = await fetch("/api/users", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
```

### ❌ Calling the API Client from Client Components

```typescript
"use client";

// BAD - Don't use the API client directly in client components
import { getInstances } from "@fasterclaw/api-client";

function MyComponent() {
  useEffect(() => {
    getInstances({ client }); // NO - this bypasses the Server Action layer
  }, []);
}
```

---

## Do This Instead

### ✅ Import Types from the Generated Client

```typescript
// GOOD - Types are generated from the actual API contract
import { type User, type Instance } from "@fasterclaw/api-client";
```

### ✅ Call Server Actions from Components

```typescript
"use client";

// GOOD - Components call Server Actions, not the API directly
import { getInstances } from "@/actions/instances.actions";

function MyComponent() {
  const [instances, setInstances] = useState<Instance[]>([]);

  useEffect(() => {
    getInstances().then(setInstances);
  }, []);
}
```

### ✅ Server Actions Use the Generated Client

```typescript
// apps/web/src/actions/instances.actions.ts
"use server";

import { getInstances as getInstancesApi, type Instance } from "@fasterclaw/api-client";
import { createAuthenticatedClient } from "@/lib/api-client";

export async function getInstances(): Promise<Instance[]> {
  const client = await createAuthenticatedClient();
  const { data } = await getInstancesApi({ client });
  return data ?? [];
}
```

---

## Why This Matters

When you create your own types or fetch calls:

1. **Your types will drift** - The API changes, your types don't, bugs happen at runtime
2. **No validation** - The API returns garbage, you render garbage
3. **No error handling** - 4xx/5xx responses break your app
4. **Duplicate work** - We already generated a perfect client for you

When you use the generated client:

1. **Types are always correct** - Generated from the same schemas the API uses
2. **Automatic validation** - Request bodies are validated before sending
3. **Typed errors** - `error` is typed with the actual error responses
4. **Instant feedback** - TypeScript yells if the API contract changes

---

## Quick Reference

| What You Need                              | Where to Get It                                                |
| ------------------------------------------ | -------------------------------------------------------------- |
| API types (User, Instance, etc.)           | `import { type X } from "@fasterclaw/api-client"`              |
| Calling API from components                | `import { action } from "@/actions/*.actions"`                 |
| Inside Server Actions only                 | `import { method } from "@fasterclaw/api-client"`              |
| Authenticated client (Server Actions only) | `import { createAuthenticatedClient } from "@/lib/api-client"` |

---

## Adding a New Endpoint (The Right Way)

Don't just add types and fetch calls. Follow the contract flow:

```
1. packages/shared/        → Define Zod schema
2. packages/contracts/     → Register in generator.ts
3. pnpm build              → Regenerate client
4. apps/api/               → Implement route
5. apps/web/               → Use generated client method
```

See [CONTRACT-ARCHITECTURE.md](./CONTRACT-ARCHITECTURE.md) for the full guide.

---

## Available API Methods

These are generated automatically. Use them:

**Auth:**

- `postAuthRegister({ body })` - Register
- `postAuthLogin({ body })` - Login
- `getAuthMe({ client })` - Get current user
- `patchAuthProfile({ client, body })` - Update profile
- `patchAuthPassword({ client, body })` - Change password
- `deleteAuthAccount({ client })` - Delete account

**Instances:**

- `postInstances({ client, body })` - Create instance
- `getInstances({ client })` - List instances
- `getInstancesById({ client, path: { id } })` - Get instance
- `postInstancesByIdStart({ client, path: { id } })` - Start instance
- `postInstancesByIdStop({ client, path: { id } })` - Stop instance
- `deleteInstancesById({ client, path: { id } })` - Delete instance

**Billing:**

- `postBillingCheckout({ client, body })` - Create checkout session
- `postBillingPortal({ client })` - Create portal session
- `getBillingInvoices({ client })` - Get invoices
- `getBillingSubscription({ client })` - Get subscription

---

## Common Patterns

### Full Flow: Component → Server Action → API

```typescript
// 1. Component calls Server Action
// apps/web/src/app/(dashboard)/dashboard/agents/page.tsx
import { getInstances } from "@/actions/instances.actions";
import { type Instance } from "@fasterclaw/api-client";

export default async function AgentsPage() {
  const instances = await getInstances();
  return <InstanceList instances={instances} />;
}
```

```typescript
// 2. Server Action uses generated client
// apps/web/src/actions/instances.actions.ts
"use server";

import { getInstances as getInstancesApi, type Instance } from "@fasterclaw/api-client";
import { createAuthenticatedClient } from "@/lib/api-client";

export async function getInstances(): Promise<Instance[]> {
  const client = await createAuthenticatedClient();
  const { data, error } = await getInstancesApi({ client });

  if (error) {
    throw new Error("Failed to fetch instances");
  }

  return data ?? [];
}
```

### Client Component with Server Action

```typescript
"use client";

import { startInstance } from "@/actions/instances.actions";

function InstanceControls({ id }: { id: string }) {
  const handleStart = async () => {
    const success = await startInstance(id);
    if (success) {
      // refresh or update UI
    }
  };

  return <button onClick={handleStart}>Start</button>;
}
```

### Handling Errors in Server Actions

```typescript
"use server";

export async function login(email: string, password: string) {
  const { data, error } = await postAuthLogin({ body: { email, password } });

  if (error) {
    // Return error to component, don't throw
    return { success: false, error: error.message };
  }

  return { success: true, token: data.token };
}
```

---

## Questions?

- Full architecture docs: [CONTRACT-ARCHITECTURE.md](./CONTRACT-ARCHITECTURE.md)
- OpenAPI spec: `packages/contracts/openapi.json`
- Generated client source: `packages/api-client/src/generated/`
