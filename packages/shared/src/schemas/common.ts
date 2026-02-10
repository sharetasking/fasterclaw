import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Common API Response Schemas
// ============================================================================

export const ApiErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ApiError");

export const ApiSuccessSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("ApiSuccess");

export const ApiMessageSchema = z
  .object({
    message: z.string(),
  })
  .openapi("ApiMessage");

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationParamsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .openapi("PaginationParams");

export const PaginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .openapi("PaginationMeta");

// ============================================================================
// Type Exports
// ============================================================================

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type ApiMessage = z.infer<typeof ApiMessageSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
