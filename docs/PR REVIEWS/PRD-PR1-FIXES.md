# PRD: PR #1 Required Fixes

**PR:** https://github.com/sharetasking/fasterclaw/pull/1
**Date:** 2026-02-10
**Priority:** High - Security issues present

---

## Executive Summary

PR #1 introduces valuable features (Fly.io status sync, Telegram/AI model support, retry logic) but contains several critical security vulnerabilities and bugs that must be addressed before merging.

---

## Critical Fixes (Must Complete Before Merge)

### 1. Remove Telegram Bot Token from API Responses

**Priority:** P0 - Security Critical
**Effort:** Small

**Problem:**
The `telegramBotToken` field is included in all instance API responses, exposing user secrets to the frontend and potentially to any client with access.

**Files to Modify:**

- `apps/api/src/routes/instances.ts`

**Requirements:**

1. Create a new Zod schema `instanceResponseSchema` that omits `telegramBotToken`
2. Use this schema for all response definitions (GET /instances, GET /instances/:id, POST /instances, POST /instances/:id/sync)
3. Update Prisma queries to use `select` to exclude the token field, OR transform the response before sending
4. If users need to see/edit their token, create a separate secure endpoint with proper authorization

**Example Implementation:**

```typescript
const instanceResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  flyMachineId: z.string().nullable(),
  flyAppName: z.string().nullable(),
  status: z.string(),
  region: z.string(),
  ipAddress: z.string().nullable(),
  aiModel: z.string(),
  hasTelegramToken: z.boolean(), // Indicator only, not the actual value
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

---

### 2. Remove Committed Local Settings File

**Priority:** P0 - Security Critical
**Effort:** Small

**Problem:**
`.claude/settings.local.json` contains developer-specific paths and database credentials.

**Requirements:**

1. Add `.claude/settings.local.json` to `.gitignore`
2. Remove file from git tracking: `git rm --cached .claude/settings.local.json`
3. Document that developers should create this file locally if needed

---

### 3. Fix 'stopping' State Mapping Bug

**Priority:** P0 - Functional Bug
**Effort:** Small

**Problem:**
In `mapFlyState()`, the Fly.io `'stopping'` state is incorrectly mapped to `'CREATING'`, causing machines that are shutting down to appear as if they're being created.

**File:** `apps/api/src/routes/instances.ts`

**Requirements:**

1. Add `'STOPPING'` as a valid instance status in the application
2. Map `'stopping'` → `'STOPPING'`
   OR if `'STOPPING'` isn't supported, map `'stopping'` → `'STOPPED'`

**Implementation:**

```typescript
function mapFlyState(flyState: string): string {
  switch (flyState) {
    case "started":
      return "RUNNING";
    case "stopped":
    case "suspended":
      return "STOPPED";
    case "stopping":
      return "STOPPING"; // or 'STOPPED' if STOPPING not supported
    case "destroyed":
      return "DELETED";
    case "created":
    case "replacing":
      return "CREATING";
    default:
      return "UNKNOWN";
  }
}
```

---

## High Priority Fixes

### 4. Prevent Error Detail Leakage

**Priority:** P1 - Security
**Effort:** Small

**Problem:**
`getErrorMessage()` returns raw Fly.io API error details to clients, potentially exposing infrastructure information.

**File:** `apps/api/src/routes/instances.ts`

**Requirements:**

1. Log detailed error information server-side using the Fastify logger
2. Return a generic user-friendly message to clients
3. Keep specific messages only for known error codes (404, 422, 429)

**Implementation:**

```typescript
function getErrorMessage(error: unknown, fallback: string, logger?: FastifyBaseLogger): string {
  if (error instanceof FlyApiError) {
    // Log full details server-side
    logger?.error({ status: error.status, detail: error.detail }, "Fly.io API error");

    if (error.status === 404) return "Machine not found";
    if (error.status === 422) return "Invalid configuration";
    if (error.status === 429) return "Rate limited, please try again later";
    return "An infrastructure error occurred. Please try again.";
  }
  if (error instanceof Error) {
    logger?.error(error, "Unexpected error");
    return fallback;
  }
  return fallback;
}
```

---

### 5. Fix Shutdown Handler Race Condition

**Priority:** P1 - Reliability
**Effort:** Small

**Problem:**
The shutdown handler can be invoked multiple times and doesn't handle `app.close()` rejection.

**File:** `apps/api/src/index.ts`

**Requirements:**

1. Add idempotency guard to prevent double-shutdown
2. Wrap `app.close()` in try/catch
3. Ensure `process.exit()` is called in finally block

**Implementation:**

```typescript
let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  app.log.info("Shutting down gracefully...");

  try {
    clearInterval(syncInterval);
    await app.close();
    app.log.info("Server closed");
  } catch (err) {
    app.log.error(err, "Error during shutdown");
  } finally {
    process.exit(0);
  }
};

process.once("SIGTERM", shutdown); // Use 'once' instead of 'on'
process.once("SIGINT", shutdown);
```

---

### 6. Add Subscription Gating for Instance Creation

**Priority:** P1 - Business Logic
**Effort:** Medium

**Problem:**
Users can create unlimited instances without an active subscription. The `instanceLimit` from subscriptions is never enforced.

**File:** `apps/api/src/routes/instances.ts`

**Requirements:**

1. Before creating an instance, verify user has an active subscription
2. Count existing instances and compare against `instanceLimit`
3. Return appropriate error messages if checks fail

**Implementation:**

```typescript
// In POST /instances handler, before creating instance:
const subscription = await prisma.subscription.findUnique({
  where: { userId },
  select: { status: true, instanceLimit: true },
});

if (!subscription || subscription.status !== "active") {
  return reply.code(403).send({
    error: "Active subscription required to create instances",
  });
}

const instanceCount = await prisma.instance.count({
  where: { userId, status: { notIn: ["DELETED", "FAILED"] } },
});

if (instanceCount >= subscription.instanceLimit) {
  return reply.code(403).send({
    error: `Instance limit of ${subscription.instanceLimit} reached. Upgrade your plan for more.`,
  });
}
```

---

### 7. Use Valid Claude Model Identifiers

**Priority:** P1 - Functionality
**Effort:** Small

**Problem:**
The model identifiers used (`claude-haiku-4`, `claude-sonnet-4`, `claude-opus-4`) are not valid Anthropic model IDs.

**File:** `apps/web/src/app/(dashboard)/dashboard/agents/new/page.tsx`

**Requirements:**
Update to valid model IDs (verify against current Anthropic API documentation):

- `claude-3-5-haiku-latest` (or specific version `claude-3-5-haiku-20241022`)
- `claude-sonnet-4-0` (or specific version `claude-sonnet-4-20250514`)
- `claude-opus-4-0` (or specific version `claude-opus-4-20250514`)

**Implementation:**

```typescript
const personalities = [
  {
    value: "quick",
    label: "Quick & Efficient",
    description: "Fast responses, great for simple tasks",
    icon: Zap,
    model: "claude-3-5-haiku-latest",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Best mix of speed and capability",
    icon: Sparkles,
    model: "claude-sonnet-4-0",
    recommended: true,
  },
  {
    value: "powerful",
    label: "Most Capable",
    description: "Handles complex conversations",
    icon: Brain,
    model: "claude-opus-4-0",
  },
];
```

---

## Medium Priority Fixes

### 8. Add Backend PATCH /instances/:id Endpoint

**Priority:** P2 - Functionality
**Effort:** Medium

**Problem:**
Frontend has `updateInstance()` action but no corresponding backend endpoint.

**File:** `apps/api/src/routes/instances.ts`

**Requirements:**

1. Add PATCH /instances/:id endpoint
2. Define Zod schema for allowed update fields (name, aiModel only - NOT telegramBotToken for security)
3. Add authorization check (user owns instance)
4. Return updated instance (without secrets)

---

### 9. Fail Fast on Missing Required Environment Variables

**Priority:** P2 - Reliability
**Effort:** Small

**Problem:**
`GEMINI_API_KEY` defaults to empty string if not set, causing silent runtime failures.

**File:** `apps/api/src/routes/instances.ts`

**Requirements:**

1. Check for required env vars before creating machine
2. Fail provisioning with clear error if missing
3. Consider validating at startup and refusing to start if critical vars missing

**Implementation:**

```typescript
// Before createMachine:
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  await prisma.instance.update({
    where: { id: instance.id },
    data: { status: "FAILED" },
  });
  throw new Error("GEMINI_API_KEY not configured");
}
```

---

### 10. Add Initial Status Sync on Startup

**Priority:** P2 - Reliability
**Effort:** Small

**Problem:**
First background sync runs 60 seconds after startup. Crashed instances stuck in transitional states won't be corrected immediately.

**File:** `apps/api/src/index.ts`

**Requirements:**
Run an initial sync immediately after server starts:

```typescript
// After setting up the interval:
syncAllInstanceStatuses(app.log).catch((err) => {
  app.log.error(err, "Initial status sync failed");
});
```

---

### 11. Add Polling Timeout in Frontend

**Priority:** P2 - UX
**Effort:** Small

**Problem:**
If provisioning gets stuck, the frontend polls forever.

**File:** `apps/web/src/app/(dashboard)/dashboard/agents/[id]/agent-actions.tsx`

**Requirements:**

1. Add a maximum polling duration (e.g., 5 minutes)
2. After timeout, stop polling and show message to user
3. Provide manual refresh button

---

## Low Priority Fixes

### 12. Fix Documentation Error

**Priority:** P3 - Documentation
**Effort:** Trivial

**File:** `IMPLEMENTATION_STATUS.md:47`

**Change:** "Next.js 16 App Router setup" → "Next.js 15 App Router setup"

---

### 13. Add Jitter to Retry Backoff

**Priority:** P3 - Performance
**Effort:** Small

**Problem:**
Deterministic backoff can cause thundering herd when many instances retry simultaneously.

**File:** `apps/api/src/services/fly.ts`

**Implementation:**

```typescript
const jitter = Math.random() * 0.3 * backoff; // 0-30% jitter
await sleep(backoff + jitter);
```

---

## Testing Requirements

Before merging, verify:

1. [ ] Create instance without subscription - should fail with 403
2. [ ] Create instance at limit - should fail with 403
3. [ ] Instance list endpoint does NOT return telegramBotToken
4. [ ] Rapid Ctrl+C during running server - should shutdown cleanly once
5. [ ] Fly.io 500 error - should retry 3 times then return generic error
6. [ ] Machine in 'stopping' state - should show as STOPPING or STOPPED, not CREATING
7. [ ] Agent creation - should work with valid model IDs

---

## Summary

| Priority | Count | Description                        |
| -------- | ----- | ---------------------------------- |
| P0       | 3     | Security critical + functional bug |
| P1       | 4     | High priority security/reliability |
| P2       | 4     | Medium priority functionality      |
| P3       | 2     | Low priority improvements          |

**Recommendation:** Do not merge until P0 and P1 items are resolved.
