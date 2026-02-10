# PRD: FasterClaw API Architecture Refactor

**Version:** 1.0
**Created:** 2026-02-10
**Priority:** P0 (Critical - Blocks Production)
**Estimated Effort:** 3-5 days

---

## Executive Summary

This PRD addresses critical architectural gaps, security vulnerabilities, and code quality issues identified in PR #2 (Telegram & Stripe Implementation). The primary goals are:

1. **Implement a Zod-first, shared-package API contract** with OpenAPI-generated typed clients
2. **Encrypt all sensitive data** at rest (Telegram tokens, API keys)
3. **Fix race conditions and async bugs** (missing `await`, unhandled promise rejections)
4. **Address all CodeRabbit review comments**

---

## 1. Shared API Contract Package

### Problem

Currently, Zod schemas are defined only in the API (`apps/api/src/routes/*.ts`) and are not shared with the frontend. The web client uses a generic fetch wrapper with manual `<T>` generics, providing no compile-time type safety or runtime validation.

### Solution

Create a new `packages/api-contracts` package containing all Zod schemas, with OpenAPI spec generation and typed client generation.

### Implementation

#### 1.1 Create Package Structure

```
packages/
  api-contracts/
    package.json
    tsconfig.json
    src/
      index.ts                    # Re-exports all schemas
      schemas/
        auth.ts                   # Auth request/response schemas
        billing.ts                # Billing schemas
        instance.ts               # Instance schemas
        common.ts                 # Shared types (pagination, errors)
      openapi/
        spec.ts                   # OpenAPI spec generation
      client/
        index.ts                  # Generated typed client exports
```

#### 1.2 Schema Definition Pattern

```typescript
// packages/api-contracts/src/schemas/instance.ts
import { z } from "zod";

// Base schemas (shared between create/update/response)
export const instanceStatusSchema = z.enum([
  "CREATING",
  "PROVISIONING",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "FAILED",
  "DELETED",
  "UNKNOWN",
]);

export const aiProviderSchema = z.enum(["openai", "anthropic", "google"]);

export const aiModelSchema = z
  .string()
  .refine((val) => /^(gpt-|claude-|gemini-|o1-)/.test(val), { message: "Invalid AI model format" });

// Request schemas
export const createInstanceInputSchema = z.object({
  name: z.string().min(1).max(50),
  telegramBotToken: z.string().min(40).max(100),
  region: z.string().default("lax"),
  aiModel: aiModelSchema.default("claude-sonnet-4"),
});

export const updateInstanceInputSchema = createInstanceInputSchema.partial();

// Response schemas
export const instanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  flyAppName: z.string().nullable(),
  flyMachineId: z.string().nullable(),
  status: instanceStatusSchema,
  region: z.string(),
  aiModel: z.string(),
  ipAddress: z.string().nullable(),
  telegramBotToken: z.string().nullable(), // Masked in responses
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Inferred types
export type InstanceStatus = z.infer<typeof instanceStatusSchema>;
export type CreateInstanceInput = z.infer<typeof createInstanceInputSchema>;
export type UpdateInstanceInput = z.infer<typeof updateInstanceInputSchema>;
export type Instance = z.infer<typeof instanceSchema>;

// API endpoint definitions (for client generation)
export const instanceEndpoints = {
  list: { method: "GET", path: "/instances", response: z.array(instanceSchema) },
  get: { method: "GET", path: "/instances/:id", response: instanceSchema },
  create: {
    method: "POST",
    path: "/instances",
    body: createInstanceInputSchema,
    response: instanceSchema,
  },
  update: {
    method: "PATCH",
    path: "/instances/:id",
    body: updateInstanceInputSchema,
    response: instanceSchema,
  },
  delete: {
    method: "DELETE",
    path: "/instances/:id",
    response: z.object({ success: z.boolean() }),
  },
  start: { method: "POST", path: "/instances/:id/start", response: instanceSchema },
  stop: { method: "POST", path: "/instances/:id/stop", response: instanceSchema },
  sync: { method: "POST", path: "/instances/:id/sync", response: instanceSchema },
  validateTelegramToken: {
    method: "POST",
    path: "/instances/validate-telegram-token",
    body: z.object({ token: z.string() }),
    response: z.object({
      valid: z.boolean(),
      botUsername: z.string().optional(),
      botName: z.string().optional(),
      error: z.string().optional(),
    }),
  },
} as const;
```

#### 1.3 OpenAPI Spec Generation

```typescript
// packages/api-contracts/src/openapi/spec.ts
import { generateOpenApiSpec } from "@anatine/zod-openapi";
import { instanceEndpoints } from "../schemas/instance";
import { authEndpoints } from "../schemas/auth";
import { billingEndpoints } from "../schemas/billing";

export const openApiSpec = generateOpenApiSpec({
  openapi: "3.1.0",
  info: {
    title: "FasterClaw API",
    version: "1.0.0",
  },
  endpoints: {
    ...instanceEndpoints,
    ...authEndpoints,
    ...billingEndpoints,
  },
});
```

#### 1.4 Typed Client Generation

Use `openapi-typescript-codegen` or `zodios` to generate a typed client:

```typescript
// packages/api-contracts/src/client/index.ts
import { Zodios } from "@zodios/core";
import { instanceEndpoints, authEndpoints, billingEndpoints } from "../schemas";

export function createApiClient(baseUrl: string, getToken?: () => string | undefined) {
  return new Zodios(
    baseUrl,
    [
      ...Object.values(instanceEndpoints),
      ...Object.values(authEndpoints),
      ...Object.values(billingEndpoints),
    ],
    {
      axiosConfig: {
        headers: getToken ? { Authorization: `Bearer ${getToken()}` } : {},
      },
    }
  );
}

export type ApiClient = ReturnType<typeof createApiClient>;
```

#### 1.5 Update API to Use Shared Schemas

```typescript
// apps/api/src/routes/instances.ts
import {
  createInstanceInputSchema,
  instanceSchema,
  validateTelegramTokenResponseSchema,
} from "@fasterclaw/api-contracts";

app.post(
  "/instances",
  {
    schema: {
      body: createInstanceInputSchema,
      response: { 201: instanceSchema },
    },
  },
  handler
);
```

#### 1.6 Update Web Client

```typescript
// apps/web/src/lib/api-client.ts
import { createApiClient } from "@fasterclaw/api-contracts";

const getToken = () => {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(/auth_token=([^;]+)/)?.[1];
};

export const api = createApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  getToken
);

// Usage - fully typed!
const instances = await api.get("/instances"); // Instance[]
const newInstance = await api.post("/instances", {
  name: "test",
  telegramBotToken: "...", // Required - TypeScript enforces this
  region: "lax",
});
```

### Acceptance Criteria

- [ ] `packages/api-contracts` package created with all Zod schemas
- [ ] All API routes import schemas from `@fasterclaw/api-contracts`
- [ ] Web client uses generated typed client
- [ ] OpenAPI spec auto-generates on build
- [ ] TypeScript errors if request/response shapes mismatch

---

## 2. Sensitive Data Encryption

### Problem

Telegram bot tokens and AI provider API keys are stored/transmitted in plaintext:

- `telegramBotToken` stored unencrypted in PostgreSQL
- API keys passed as env vars to Fly.io machines (visible in logs/configs)

### Solution

Implement field-level encryption for sensitive database fields and use Fly.io secrets for API keys.

### Implementation

#### 2.1 Database Field Encryption

```typescript
// packages/db/src/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = scryptSync(process.env.ENCRYPTION_KEY!, "salt", 32);

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

#### 2.2 Prisma Middleware for Auto-Encryption

```typescript
// packages/db/src/middleware/encryption.ts
import { Prisma } from "@prisma/client";
import { encrypt, decrypt } from "../encryption";

const ENCRYPTED_FIELDS = {
  Instance: ["telegramBotToken"],
  User: ["stripeCustomerId"], // Consider encrypting this too
};

export const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[params.model as keyof typeof ENCRYPTED_FIELDS] || [];

  // Encrypt on create/update
  if (["create", "update", "upsert"].includes(params.action) && params.args.data) {
    for (const field of fieldsToEncrypt) {
      if (params.args.data[field]) {
        params.args.data[field] = encrypt(params.args.data[field]);
      }
    }
  }

  const result = await next(params);

  // Decrypt on read
  if (result && typeof result === "object") {
    const records = Array.isArray(result) ? result : [result];
    for (const record of records) {
      for (const field of fieldsToEncrypt) {
        if (record[field]) {
          try {
            record[field] = decrypt(record[field]);
          } catch {
            // Field may not be encrypted (legacy data)
          }
        }
      }
    }
  }

  return result;
};
```

#### 2.3 Fly.io Secrets (Not Env Vars)

Replace direct env var injection with Fly.io secrets:

```typescript
// apps/api/src/services/fly.ts
export async function setMachineSecrets(
  appName: string,
  secrets: Record<string, string>
): Promise<void> {
  await flyRequest(
    `/apps/${appName}/secrets`,
    {
      method: "POST",
      body: JSON.stringify(secrets),
    },
    "setSecrets"
  );
}

// apps/api/src/routes/instances.ts - in createMachine flow
await setMachineSecrets(flyAppName, {
  TELEGRAM_BOT_TOKEN: telegramBotToken,
  ...(aiProvider === "anthropic" && { ANTHROPIC_API_KEY: apiKey }),
  ...(aiProvider === "openai" && { OPENAI_API_KEY: apiKey }),
  ...(aiProvider === "google" && { GOOGLE_API_KEY: apiKey }),
});

// Then create machine WITHOUT secrets in config.env
const machine = await createMachine(flyAppName, {
  region,
  config: {
    image: "ghcr.io/openclaw/openclaw:latest",
    env: {
      AI_MODEL: aiModel,
      AI_PROVIDER: aiProvider,
      // NO secrets here - they're in Fly.io secrets
    },
    services: [
      /* ... */
    ],
  },
});
```

#### 2.4 Mask Tokens in API Responses

```typescript
// packages/api-contracts/src/schemas/instance.ts
export const instanceResponseSchema = instanceSchema.transform((instance) => ({
  ...instance,
  telegramBotToken: instance.telegramBotToken
    ? `${instance.telegramBotToken.slice(0, 10)}...${instance.telegramBotToken.slice(-4)}`
    : null,
}));
```

#### 2.5 Required Environment Variables

Add to `.env.example`:

```bash
# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

### Acceptance Criteria

- [ ] `ENCRYPTION_KEY` environment variable required
- [ ] `telegramBotToken` encrypted at rest in database
- [ ] API keys passed via Fly.io secrets, not env vars
- [ ] Tokens masked in all API responses
- [ ] Migration script to encrypt existing plaintext tokens

---

## 3. Fix Race Conditions & Async Bugs

### Problem

Multiple async/await bugs identified:

1. **Missing `await` on `response.json()`** - Bypasses retry logic (CodeRabbit)
2. **Fire-and-forget instance creation** - Background task not tracked
3. **Frontend updateInstance** calls non-existent PATCH endpoint (CodeRabbit)
4. **`mapFlyState` incorrectly maps `stopping`** to `CREATING` (CodeRabbit)
5. **Empty API key silently fails** - Should throw error (CodeRabbit)

### Implementation

#### 3.1 Fix Missing `await` in Fly Service

```typescript
// apps/api/src/services/fly.ts - Line 119
// BEFORE:
return response.json();

// AFTER:
return await response.json();
```

#### 3.2 Fix `mapFlyState` Function

```typescript
// apps/api/src/routes/instances.ts
function mapFlyState(flyState: string): InstanceStatus {
  switch (flyState) {
    case "started":
      return "RUNNING";
    case "starting":
      return "STARTING";
    case "stopping":
      return "STOPPING";
    case "stopped":
    case "suspended":
      return "STOPPED";
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

#### 3.3 Fail Fast on Missing API Keys

```typescript
// apps/api/src/routes/instances.ts
function getAPIKeyForProvider(provider: "openai" | "anthropic" | "google"): string {
  const keys: Record<typeof provider, string | undefined> = {
    openai: process.env.OPENAI_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GEMINI_API_KEY,
  };

  const key = keys[provider];
  if (!key) {
    throw new Error(
      `Missing API key for provider "${provider}". ` +
        `Set ${provider === "openai" ? "OPENAI_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"} env var.`
    );
  }
  return key;
}
```

#### 3.4 Add Missing PATCH Endpoint

```typescript
// apps/api/src/routes/instances.ts
app.patch(
  "/instances/:id",
  {
    schema: {
      tags: ["Instances"],
      summary: "Update an instance",
      params: z.object({ id: z.string() }),
      body: updateInstanceInputSchema,
      response: {
        200: instanceSchema,
        400: errorSchema,
        404: errorSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: [app.authenticate],
  },
  async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params;
    const updates = request.body;

    const instance = await prisma.instance.findFirst({
      where: { id, userId },
    });

    if (!instance) {
      return reply.code(404).send({ error: "Instance not found" });
    }

    // Only allow updates when instance is stopped
    if (instance.status !== "STOPPED" && Object.keys(updates).length > 0) {
      return reply.code(400).send({
        error: "Instance must be stopped before updating configuration",
      });
    }

    const updatedInstance = await prisma.instance.update({
      where: { id },
      data: updates,
    });

    return reply.send({
      ...updatedInstance,
      createdAt: updatedInstance.createdAt.toISOString(),
      updatedAt: updatedInstance.updatedAt.toISOString(),
    });
  }
);
```

#### 3.5 Track Background Instance Creation

```typescript
// apps/api/src/routes/instances.ts
// Use a proper job queue or at minimum track the promise
const provisioningPromises = new Map<string, Promise<void>>();

// In create handler:
const provisioningTask = (async () => {
  try {
    await createApp(flyAppName);
    await prisma.instance.update({ where: { id: instance.id }, data: { status: "PROVISIONING" } });

    // ... rest of provisioning
  } catch (error) {
    // ... error handling
  } finally {
    provisioningPromises.delete(instance.id);
  }
})();

provisioningPromises.set(instance.id, provisioningTask);

// Add endpoint to check provisioning status
app.get("/instances/:id/provisioning-status" /* ... */);
```

### Acceptance Criteria

- [ ] All `response.json()` calls use `await`
- [ ] `mapFlyState` correctly maps all Fly.io states
- [ ] Missing API keys throw clear errors at instance creation time
- [ ] PATCH `/instances/:id` endpoint exists and works
- [ ] Background provisioning tasks are tracked

---

## 4. CodeRabbit Specific Fixes

### 4.1 Remove Committed Local Settings

```bash
# Remove from git history
git rm --cached .claude/settings.local.json

# Add to .gitignore
echo ".claude/settings.local.json" >> .gitignore
```

### 4.2 Fix Invalid dotenv Version

```json
// apps/api/package.json
{
  "dependencies": {
    "dotenv": "^16.4.5" // Was: "^17.2.4" (doesn't exist)
  }
}
```

### 4.3 Add Docstrings (Coverage: 48% → 80%)

Add JSDoc comments to all exported functions in:

- `apps/api/src/services/fly.ts`
- `apps/api/src/services/stripe.ts`
- `apps/api/src/routes/*.ts`
- `apps/web/src/actions/*.ts`

Example:

````typescript
/**
 * Creates a new Fly.io application.
 *
 * @param appName - Unique name for the Fly.io application
 * @returns The created application object
 * @throws {FlyApiError} When the Fly.io API returns an error
 * @throws {Error} When FLY_API_TOKEN is not configured
 *
 * @example
 * ```typescript
 * const app = await createApp('my-openclaw-instance');
 * console.log(app.id); // 'app_xxxx'
 * ```
 */
export async function createApp(appName: string): Promise<FlyApp> {
  // ...
}
````

---

## 5. Migration Plan

### Phase 1: Shared Package (Day 1-2)

1. Create `packages/api-contracts` with Zod schemas
2. Configure turborepo to build contracts package first
3. Update API to import from `@fasterclaw/api-contracts`
4. Generate OpenAPI spec
5. Generate typed client

### Phase 2: Encryption (Day 2-3)

1. Add encryption utilities to `packages/db`
2. Create Prisma middleware
3. Write migration script for existing data
4. Update Fly.io integration to use secrets
5. Mask tokens in responses

### Phase 3: Bug Fixes (Day 3-4)

1. Fix all `await` issues
2. Fix `mapFlyState`
3. Add PATCH endpoint
4. Fail fast on missing API keys
5. Track provisioning tasks

### Phase 4: Cleanup & Testing (Day 4-5)

1. Remove committed local settings
2. Fix dotenv version
3. Add docstrings (80% coverage)
4. Write integration tests for encryption
5. Write E2E tests for typed client

---

## 6. Testing Requirements

### Unit Tests

- [ ] Encryption/decryption roundtrip
- [ ] `mapFlyState` all state mappings
- [ ] `getAPIKeyForProvider` error cases
- [ ] Schema validation edge cases

### Integration Tests

- [ ] Typed client generates correct requests
- [ ] Encrypted tokens persist and decrypt correctly
- [ ] PATCH endpoint updates instances

### E2E Tests

- [ ] Full instance lifecycle with encryption
- [ ] Subscription gating enforced
- [ ] Background provisioning completes

---

## 7. Success Metrics

| Metric              | Current         | Target                |
| ------------------- | --------------- | --------------------- |
| Type Safety         | Manual generics | 100% typed            |
| Encryption Coverage | 0%              | 100% sensitive fields |
| Docstring Coverage  | 48%             | 80%                   |
| Async Bug Count     | 5+              | 0                     |
| Test Coverage       | ~0%             | 60%                   |

---

## 8. Risks & Mitigations

| Risk                             | Likelihood | Impact | Mitigation                                       |
| -------------------------------- | ---------- | ------ | ------------------------------------------------ |
| Breaking existing data           | Medium     | High   | Write reversible migration, test on staging      |
| Client generation complexity     | Low        | Medium | Start with Zodios, fall back to manual if needed |
| Performance impact of encryption | Low        | Low    | Use AES-256-GCM (hardware accelerated)           |
| Fly.io secrets API changes       | Low        | Medium | Abstract behind service layer                    |

---

## Appendix: Files to Modify

### New Files

- `packages/api-contracts/package.json`
- `packages/api-contracts/src/schemas/*.ts`
- `packages/api-contracts/src/client/index.ts`
- `packages/db/src/encryption.ts`
- `packages/db/src/middleware/encryption.ts`

### Modified Files

- `apps/api/package.json` (fix dotenv version)
- `apps/api/src/routes/instances.ts` (use shared schemas, add PATCH, fix mapFlyState)
- `apps/api/src/routes/billing.ts` (use shared schemas)
- `apps/api/src/routes/auth.ts` (use shared schemas)
- `apps/api/src/services/fly.ts` (fix await, add setMachineSecrets)
- `apps/web/src/lib/api.ts` (replace with typed client)
- `apps/web/src/actions/instances.actions.ts` (use typed client)
- `.gitignore` (add .claude/settings.local.json)

### Deleted Files

- `.claude/settings.local.json` (remove from repo)
