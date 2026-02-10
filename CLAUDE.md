# FasterClaw Development Guidelines

## API Contract System

This project uses a contract-first architecture. Follow these rules:

### The Flow

```
Component → Server Action → @fasterclaw/api-client → API
```

### Rules

1. **All API calls go through Server Actions** - No direct fetches from client components
2. **Never create manual type definitions for API data** - Import types from `@fasterclaw/api-client`
3. **Never call `@fasterclaw/api-client` from client components** - Only use in Server Actions
4. **Never edit generated files**:
   - `packages/api-client/src/generated/*`
   - `packages/contracts/openapi.json`

### Adding New Endpoints

1. Define Zod schema in `packages/shared/src/schemas/`
2. Register route in `packages/contracts/src/generator.ts`
3. Run `pnpm build` to regenerate client
4. Implement route in `apps/api/src/routes/`
5. Create Server Action in `apps/web/src/actions/`
6. Call Server Action from components

### Database Migrations

- All migrations must be idempotent

### Documentation

- Full contract architecture: `docs/CONTRACT-ARCHITECTURE.md`
- Developer quick guide: `docs/DEVELOPER-API-GUIDE.md`
