import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// User Schemas
// ============================================================================

export const UserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("User");

// ============================================================================
// Auth Request Schemas
// ============================================================================

export const RegisterRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required"),
  })
  .openapi("RegisterRequest");

export const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .openapi("LoginRequest");

export const UpdateProfileRequestSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .openapi("UpdateProfileRequest");

export const UpdatePasswordRequestSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .openapi("UpdatePasswordRequest");

// ============================================================================
// Auth Response Schemas
// ============================================================================

export const TokenResponseSchema = z
  .object({
    accessToken: z.string(),
    user: UserSchema,
  })
  .openapi("TokenResponse");

// ============================================================================
// Type Exports
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type UpdatePasswordRequest = z.infer<typeof UpdatePasswordRequestSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
