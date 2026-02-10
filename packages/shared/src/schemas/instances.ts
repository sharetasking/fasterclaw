import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Instance Status Enum
// ============================================================================

export const InstanceStatusSchema = z.enum(["CREATING", "RUNNING", "STOPPED", "FAILED", "DELETED"]);

// ============================================================================
// Instance Schemas
// ============================================================================

export const InstanceSchema = z
  .object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    name: z.string(),
    flyAppName: z.string().nullable(),
    flyMachineId: z.string().nullable(),
    status: z.string(),
    region: z.string(),
    ipAddress: z.string().nullable(),
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
    region: z.string().default("lax"),
  })
  .openapi("CreateInstanceRequest");

export const InstanceIdParamSchema = z
  .object({
    id: z.string().cuid(),
  })
  .openapi("InstanceIdParam");

// ============================================================================
// Type Exports
// ============================================================================

export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;
export type Instance = z.infer<typeof InstanceSchema>;
export type InstanceList = z.infer<typeof InstanceListSchema>;
export type CreateInstanceRequest = z.infer<typeof CreateInstanceRequestSchema>;
export type InstanceIdParam = z.infer<typeof InstanceIdParamSchema>;
