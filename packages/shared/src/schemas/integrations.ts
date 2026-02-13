import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Integration Schemas
// ============================================================================

export const IntegrationSchema = z
  .object({
    id: z.string().cuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    iconUrl: z.string().nullable(),
    provider: z.string(),
    authType: z.string(),
    oauthScopes: z.array(z.string()),
    isOfficial: z.boolean(),
    // MCP configuration
    preferredMethod: z.enum(["mcp", "cli", "proxy"]).default("mcp"),
    mcpServerId: z.string().cuid().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Integration");

export const UserIntegrationSchema = z
  .object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    integrationId: z.string().cuid(),
    integration: IntegrationSchema,
    accountIdentifier: z.string().nullable(),
    connectedAt: z.string().datetime(),
    tokenExpiresAt: z.string().datetime().nullable(),
    lastRefreshedAt: z.string().datetime().nullable(),
  })
  .openapi("UserIntegration");

export const InstanceIntegrationSchema = z
  .object({
    id: z.string().cuid(),
    instanceId: z.string().cuid(),
    userIntegrationId: z.string().cuid(),
    userIntegration: UserIntegrationSchema,
    enabledAt: z.string().datetime(),
  })
  .openapi("InstanceIntegration");

// ============================================================================
// OAuth Flow Schemas
// ============================================================================

export const InitiateOAuthRequestSchema = z
  .object({
    integrationId: z.string().cuid(),
  })
  .openapi("InitiateOAuthRequest");

export const OAuthUrlResponseSchema = z
  .object({
    authorizationUrl: z.string().url(),
    state: z.string(),
  })
  .openapi("OAuthUrlResponse");

export const OAuthCallbackQuerySchema = z
  .object({
    code: z.string(),
    state: z.string(),
    error: z.string().optional(),
  })
  .openapi("OAuthCallbackQuery");

export const EnableInstanceIntegrationRequestSchema = z
  .object({
    userIntegrationId: z.string().cuid(),
  })
  .openapi("EnableInstanceIntegrationRequest");

export const IntegrationIdParamSchema = z
  .object({
    integrationId: z.string().cuid(),
  })
  .openapi("IntegrationIdParam");

export const UserIntegrationIdParamSchema = z
  .object({
    userIntegrationId: z.string().cuid(),
  })
  .openapi("UserIntegrationIdParam");

// ============================================================================
// Response Schemas
// ============================================================================

export const IntegrationListSchema = z
  .array(IntegrationSchema)
  .openapi("IntegrationList");

export const UserIntegrationListSchema = z
  .array(UserIntegrationSchema)
  .openapi("UserIntegrationList");

export const InstanceIntegrationListSchema = z
  .array(InstanceIntegrationSchema)
  .openapi("InstanceIntegrationList");

// ============================================================================
// Type Exports
// ============================================================================

export type Integration = z.infer<typeof IntegrationSchema>;
export type UserIntegration = z.infer<typeof UserIntegrationSchema>;
export type InstanceIntegration = z.infer<typeof InstanceIntegrationSchema>;
export type InitiateOAuthRequest = z.infer<typeof InitiateOAuthRequestSchema>;
export type OAuthUrlResponse = z.infer<typeof OAuthUrlResponseSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
export type EnableInstanceIntegrationRequest = z.infer<
  typeof EnableInstanceIntegrationRequestSchema
>;
export type IntegrationIdParam = z.infer<typeof IntegrationIdParamSchema>;
export type UserIntegrationIdParam = z.infer<
  typeof UserIntegrationIdParamSchema
>;
export type IntegrationList = z.infer<typeof IntegrationListSchema>;
export type UserIntegrationList = z.infer<typeof UserIntegrationListSchema>;
export type InstanceIntegrationList = z.infer<
  typeof InstanceIntegrationListSchema
>;
