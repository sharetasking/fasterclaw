# Contract-First API Architecture

This document explains the contract-first architecture used in FasterClaw. **Read this carefully before making any changes to API contracts.**

## The Golden Rule

> **Zod schemas in `@fasterclaw/shared` are the SINGLE SOURCE OF TRUTH.**
>
> All API types, validation, OpenAPI specs, and client code are derived from these schemas.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     @fasterclaw/shared                          │
│                  (Zod Schemas - Source of Truth)                │
│                                                                 │
│  Define ALL request/response schemas here.                      │
│  This is the ONLY place to add or modify API contracts.         │
└─────────────────┬───────────────────────────────┬───────────────┘
                  │                               │
                  │ imported by                   │ imported by
                  ▼                               ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│    @fasterclaw/contracts    │     │         apps/api            │
│                             │     │                             │
│  Generates openapi.json     │     │  Uses schemas for           │
│  from shared schemas.       │     │  request/response           │
│  DO NOT edit openapi.json!  │     │  validation in routes.      │
└─────────────────┬───────────┘     └─────────────────────────────┘
                  │
                  │ consumed by
                  ▼
┌─────────────────────────────┐
│   @fasterclaw/api-client    │
│                             │
│  Auto-generated typed       │
│  HTTP client from OpenAPI.  │
│  DO NOT edit generated/!    │
└─────────────────┬───────────┘
                  │
                  │ imported by
      ┌───────────┴───────────┐
      ▼                       ▼
┌───────────┐           ┌───────────┐
│  apps/web │           │  Mobile   │
│           │           │   Apps    │
└───────────┘           └───────────┘
```

## Package Responsibilities

| Package                  | What It Does                               | What You Edit                     |
| ------------------------ | ------------------------------------------ | --------------------------------- |
| `@fasterclaw/shared`     | Defines Zod schemas and TypeScript types   | **YES - Edit schemas here**       |
| `@fasterclaw/contracts`  | Generates OpenAPI spec from schemas        | Only `generator.ts` to add routes |
| `@fasterclaw/api-client` | Auto-generates typed HTTP client           | **NEVER - It's auto-generated**   |
| `apps/api`               | Implements API routes using shared schemas | Route handlers only               |
| `apps/web`               | Consumes API via typed client              | Use `@fasterclaw/api-client`      |

## How to Make Changes

### Adding a New API Endpoint

1. **Define schemas in `@fasterclaw/shared`**

   ```typescript
   // packages/shared/src/schemas/myfeature.ts
   import { z } from "zod";
   import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

   extendZodWithOpenApi(z);

   export const MyRequestSchema = z
     .object({
       name: z.string().min(1),
     })
     .openapi("MyRequest");

   export const MyResponseSchema = z
     .object({
       id: z.string(),
       name: z.string(),
     })
     .openapi("MyResponse");

   export type MyRequest = z.infer<typeof MyRequestSchema>;
   export type MyResponse = z.infer<typeof MyResponseSchema>;
   ```

2. **Export from index.ts**

   ```typescript
   // packages/shared/src/index.ts
   export {
     MyRequestSchema,
     MyResponseSchema,
     type MyRequest,
     type MyResponse,
   } from "./schemas/myfeature.js";
   ```

3. **Register the route in contracts**

   ```typescript
   // packages/contracts/src/generator.ts
   import { MyRequestSchema, MyResponseSchema } from "@fasterclaw/shared";

   registry.registerPath({
     method: "post",
     path: "/my-endpoint",
     tags: ["MyFeature"],
     summary: "Do something",
     security: [{ bearerAuth: [] }],
     request: {
       body: {
         content: {
           "application/json": { schema: MyRequestSchema },
         },
       },
     },
     responses: {
       200: {
         description: "Success",
         content: {
           "application/json": { schema: MyResponseSchema },
         },
       },
     },
   });
   ```

4. **Implement the route in apps/api**

   ```typescript
   // apps/api/src/routes/myfeature.ts
   import { MyRequestSchema, MyResponseSchema } from "@fasterclaw/shared";

   app.post(
     "/my-endpoint",
     {
       schema: {
         body: MyRequestSchema,
         response: { 200: MyResponseSchema },
       },
     },
     async (request, reply) => {
       // Implementation
     }
   );
   ```

5. **Rebuild the pipeline**

   ```bash
   pnpm build
   ```

6. **Use in web app**

   ```typescript
   // apps/web/src/actions/myfeature.ts
   import { postMyEndpoint } from "@fasterclaw/api-client";

   const { data, error } = await postMyEndpoint({
     body: { name: "test" },
   });
   // data is fully typed as MyResponse!
   ```

### Modifying an Existing Schema

1. Edit the schema in `@fasterclaw/shared`
2. Run `pnpm build`
3. TypeScript errors will show you everywhere that needs updating

## Build Order

The packages must build in this order:

```
@fasterclaw/shared     → Compiles Zod schemas
        ↓
@fasterclaw/contracts  → Generates openapi.json
        ↓
@fasterclaw/api-client → Generates typed client
        ↓
apps/api + apps/web    → Can now import from all packages
```

Turborepo handles this automatically when you run `pnpm build`.

## Common Mistakes to Avoid

### DO NOT define schemas inline in API routes

```typescript
// BAD - Schemas defined in route file
app.post("/users", {
  schema: {
    body: z.object({ name: z.string() }), // NO!
  },
});

// GOOD - Import from shared
import { CreateUserSchema } from "@fasterclaw/shared";
app.post("/users", {
  schema: {
    body: CreateUserSchema, // YES!
  },
});
```

### DO NOT manually edit generated files

```
packages/api-client/src/generated/  ← NEVER EDIT THESE
packages/contracts/openapi.json     ← NEVER EDIT THIS
```

These files are auto-generated. Your changes will be overwritten.

### DO NOT use generic fetch in the web app

```typescript
// BAD - Manual fetch with no type safety
const res = await fetch("/api/users", { method: "POST", body: JSON.stringify(data) });
const user = (await res.json()) as User; // Type assertion = no safety

// GOOD - Use the typed client
import { postUsers } from "@fasterclaw/api-client";
const { data, error } = await postUsers({ body: data });
// data is properly typed, errors are typed too!
```

### DO NOT forget the `.openapi()` decorator

```typescript
// BAD - Missing openapi decorator
export const UserSchema = z.object({
  id: z.string(),
});

// GOOD - Has openapi decorator for OpenAPI generation
export const UserSchema = z
  .object({
    id: z.string(),
  })
  .openapi("User");
```

## Validation Flow

When a request comes in:

1. **API receives request**
2. **Fastify validates** using Zod schema from `@fasterclaw/shared`
3. **If invalid**: Returns 400 with typed error response
4. **If valid**: Handler receives fully typed `request.body`
5. **Response is validated** against response schema
6. **Client receives** typed response matching the contract

## Type Safety Chain

```
Zod Schema (shared)
    ↓ z.infer<typeof Schema>
TypeScript Type
    ↓ exported
API Route (apps/api)
    ↓ validated request.body
Handler Logic
    ↓ validated response
OpenAPI Spec (contracts)
    ↓ code generation
Typed Client (api-client)
    ↓ imported
Web App (apps/web)
    ↓ fully typed
Frontend Code
```

**If any part of this chain breaks, TypeScript will tell you.**

## Quick Reference

| Task                          | Where to do it                        |
| ----------------------------- | ------------------------------------- |
| Add new request/response type | `packages/shared/src/schemas/*.ts`    |
| Add new API endpoint          | `packages/contracts/src/generator.ts` |
| Implement endpoint            | `apps/api/src/routes/*.ts`            |
| Call endpoint from frontend   | Use `@fasterclaw/api-client`          |
| See API documentation         | `packages/contracts/openapi.json`     |

## Regenerating the Client

If you've made schema changes:

```bash
# Rebuild everything in order
pnpm build

# Or rebuild specific packages
pnpm --filter @fasterclaw/shared build
pnpm --filter @fasterclaw/contracts build
pnpm --filter @fasterclaw/api-client build
```

## External API Consumers

The `openapi.json` file can be used by external consumers to generate clients in any language:

- **Swift/iOS**: Use Swift OpenAPI Generator
- **Kotlin/Android**: Use OpenAPI Generator Kotlin
- **Python**: Use openapi-python-client
- **Go**: Use oapi-codegen

They should pull from: `packages/contracts/openapi.json`
