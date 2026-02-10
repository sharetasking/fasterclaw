// ============================================================================
// @fasterclaw/shared
// ============================================================================
// This package contains all Zod schemas that define the API contract.
// These schemas are the SINGLE SOURCE OF TRUTH for:
// - API request/response validation
// - TypeScript types for frontend and backend
// - OpenAPI specification generation
// ============================================================================

// Re-export zod for convenience
export { z } from "zod";

// Common schemas
export {
  ApiErrorSchema,
  ApiSuccessSchema,
  ApiMessageSchema,
  PaginationParamsSchema,
  PaginationMetaSchema,
  type ApiError,
  type ApiSuccess,
  type ApiMessage,
  type PaginationParams,
  type PaginationMeta,
} from "./schemas/common.js";

// Auth schemas
export {
  UserSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  UpdateProfileRequestSchema,
  UpdatePasswordRequestSchema,
  TokenResponseSchema,
  type User,
  type RegisterRequest,
  type LoginRequest,
  type UpdateProfileRequest,
  type UpdatePasswordRequest,
  type TokenResponse,
} from "./schemas/auth.js";

// Instance schemas
export {
  InstanceStatusSchema,
  InstanceSchema,
  InstanceListSchema,
  CreateInstanceRequestSchema,
  InstanceIdParamSchema,
  type InstanceStatus,
  type Instance,
  type InstanceList,
  type CreateInstanceRequest,
  type InstanceIdParam,
} from "./schemas/instances.js";

// Billing schemas
export {
  PlanTypeSchema,
  PlanConfigSchema,
  PlansSchema,
  SubscriptionStatusSchema,
  SubscriptionSchema,
  CreateCheckoutRequestSchema,
  CheckoutResponseSchema,
  PortalResponseSchema,
  SubscriptionResponseSchema,
  InvoiceSchema,
  InvoiceListSchema,
  WebhookResponseSchema,
  type PlanType,
  type PlanConfig,
  type Plans,
  type SubscriptionStatus,
  type Subscription,
  type CreateCheckoutRequest,
  type CheckoutResponse,
  type PortalResponse,
  type SubscriptionResponse,
  type Invoice,
  type InvoiceList,
  type WebhookResponse,
} from "./schemas/billing.js";
