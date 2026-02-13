import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// MCP Server Schemas
// ============================================================================

export const McpServerSchema = z
  .object({
    id: z.string().cuid(),
    provider: z.string(),
    name: z.string(),
    description: z.string(),
    npmPackage: z.string(),
    version: z.string(),
    requiredEnvVars: z.array(z.string()),
    capabilities: z.array(z.string()),
    isOfficial: z.boolean(),
    documentationUrl: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("McpServer");

export const McpServerListSchema = z
  .array(McpServerSchema)
  .openapi("McpServerList");

// ============================================================================
// MCP Configuration Schemas (for openclaw.json)
// ============================================================================

export const McpServerConfigSchema = z
  .object({
    command: z.string(),
    args: z.array(z.string()),
    env: z.record(z.string()).optional(),
    disabled: z.boolean().optional(),
  })
  .openapi("McpServerConfig");

export const McpConfigSchema = z
  .object({
    servers: z.record(McpServerConfigSchema),
  })
  .openapi("McpConfig");

// ============================================================================
// OpenClaw Configuration Schema
// ============================================================================

export const OpenClawConfigSchema = z
  .object({
    meta: z.object({
      generatedBy: z.string(),
      generatedAt: z.string().datetime(),
      instanceId: z.string(),
    }),
    agent: z.object({
      model: z.string(),
    }),
    gateway: z.object({
      mode: z.enum(["local", "remote"]),
    }),
    channels: z.object({
      telegram: z.object({
        enabled: z.boolean(),
        dmPolicy: z.enum(["open", "pairing"]),
        allowFrom: z.array(z.string()),
      }).optional(),
    }),
    mcp: McpConfigSchema.optional(),
    plugins: z.object({
      entries: z.record(z.object({
        enabled: z.boolean(),
      })),
    }),
  })
  .openapi("OpenClawConfig");

// ============================================================================
// Proxy V2 Schemas
// ============================================================================

export const ProxyActionSchema = z
  .object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string(),
    description: z.string().optional(),
  })
  .openapi("ProxyAction");

export const ProxyV2RequestSchema = z
  .object({
    instanceId: z.string().cuid(),
    params: z.record(z.any()).optional(),
  })
  .openapi("ProxyV2Request");

export const ProxyV2ResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
  })
  .openapi("ProxyV2Response");

export const ProxyActionsListSchema = z
  .object({
    providers: z.array(z.string()),
    actions: z.record(z.record(ProxyActionSchema)),
  })
  .openapi("ProxyActionsList");

// ============================================================================
// Type Exports
// ============================================================================

export type McpServer = z.infer<typeof McpServerSchema>;
export type McpServerList = z.infer<typeof McpServerListSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
export type OpenClawConfig = z.infer<typeof OpenClawConfigSchema>;
export type ProxyAction = z.infer<typeof ProxyActionSchema>;
export type ProxyV2Request = z.infer<typeof ProxyV2RequestSchema>;
export type ProxyV2Response = z.infer<typeof ProxyV2ResponseSchema>;
export type ProxyActionsList = z.infer<typeof ProxyActionsListSchema>;
