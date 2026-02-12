import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Instance Status Enum
// ============================================================================

export const InstanceStatusSchema = z.enum([
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

// ============================================================================
// Instance Schemas
// ============================================================================

export const InstanceSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    provider: z.string(), // "fly" or "docker"
    flyAppName: z.string().nullable(),
    flyMachineId: z.string().nullable(),
    dockerContainerId: z.string().nullable(),
    dockerPort: z.number().nullable(),
    status: z.string(),
    region: z.string(),
    aiModel: z.string(),
    telegramBotToken: z.string().nullable(),
    ipAddress: z.string().nullable(),
    isDefault: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Instance");

export const InstanceListSchema = z.array(InstanceSchema).openapi("InstanceList");

// ============================================================================
// Instance Request Schemas
// ============================================================================

export const CreateInstanceRequestSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
    telegramBotToken: z.string().min(1).optional(), // Optional for quick start mode
    region: z.string().default("lax"),
    aiModel: z.string().default("claude-sonnet-4-0"),
    quickStart: z.boolean().default(false), // If true, creates instance without Telegram
  })
  .openapi("CreateInstanceRequest");

export const UpdateInstanceRequestSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    telegramBotToken: z.string().min(1).optional(),
    aiModel: z.string().optional(),
  })
  .openapi("UpdateInstanceRequest");

export const InstanceIdParamSchema = z
  .object({
    id: z.string(),
  })
  .openapi("InstanceIdParam");

// ============================================================================
// Telegram Validation Schemas
// ============================================================================

export const ValidateTelegramTokenRequestSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
  })
  .openapi("ValidateTelegramTokenRequest");

export const ValidateTelegramTokenResponseSchema = z
  .object({
    valid: z.boolean(),
    botUsername: z.string().optional(),
    botName: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi("ValidateTelegramTokenResponse");

// ============================================================================
// Type Exports
// ============================================================================

export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceList = z.infer<typeof InstanceListSchema>;
export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type UpdateInstanceRequest = z.infer<typeof UpdateInstanceRequestSchema>;
export type InstanceIdParam = z.infer<typeof InstanceIdParamSchema>;
export type ValidateTelegramTokenRequest = z.infer<typeof ValidateTelegramTokenRequestSchema>;
export type ValidateTelegramTokenResponse = z.infer<typeof ValidateTelegramTokenResponseSchema>;
