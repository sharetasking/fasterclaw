import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Import all schemas from shared package
import {
  // Common
  ApiErrorSchema,
  ApiSuccessSchema,
  ApiMessageSchema,
  // Auth
  UserSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  UpdateProfileRequestSchema,
  UpdatePasswordRequestSchema,
  TokenResponseSchema,
  // Instances
  InstanceSchema,
  InstanceListSchema,
  CreateInstanceRequestSchema,
  UpdateInstanceRequestSchema,
  InstanceIdParamSchema,
  ValidateTelegramTokenRequestSchema,
  ValidateTelegramTokenResponseSchema,
  // Billing
  CreateCheckoutRequestSchema,
  CheckoutResponseSchema,
  PortalResponseSchema,
  SubscriptionResponseSchema,
  InvoiceListSchema,
  WebhookResponseSchema,
  // Skills
  SkillSchema,
  SkillListSchema,
  UserSkillListSchema,
  InstanceSkillListSchema,
  AddUserSkillRequestSchema,
  EnableInstanceSkillRequestSchema,
  // Integrations
  IntegrationSchema,
  IntegrationListSchema,
  UserIntegrationListSchema,
  InstanceIntegrationListSchema,
  InitiateOAuthRequestSchema,
  OAuthUrlResponseSchema,
  EnableInstanceIntegrationRequestSchema,
  // MCP
  McpServerSchema,
  McpServerListSchema,
  ProxyV2RequestSchema,
  ProxyV2ResponseSchema,
  ProxyActionsListSchema,
} from "@fasterclaw/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create registry and register all schemas
const registry = new OpenAPIRegistry();

// Register security scheme
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: {
        "application/json": {
          schema: TokenResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    409: {
      description: "User already exists",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: TokenResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user",
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/auth/profile",
  tags: ["Auth"],
  summary: "Update user profile",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Profile updated",
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/auth/password",
  tags: ["Auth"],
  summary: "Change user password",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdatePasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password changed",
      content: {
        "application/json": {
          schema: ApiMessageSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/auth/account",
  tags: ["Auth"],
  summary: "Delete user account",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Account deleted",
      content: {
        "application/json": {
          schema: ApiMessageSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// INSTANCE ROUTES
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/instances",
  tags: ["Instances"],
  summary: "Create a new OpenClaw instance",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateInstanceRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Instance created",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/instances",
  tags: ["Instances"],
  summary: "List all instances for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of instances",
      content: {
        "application/json": {
          schema: InstanceListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/instances/{id}",
  tags: ["Instances"],
  summary: "Get an instance by ID",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
  },
  responses: {
    200: {
      description: "Instance details",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/instances/{id}",
  tags: ["Instances"],
  summary: "Update an instance (must be stopped)",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateInstanceRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Instance updated",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    400: {
      description: "Bad request (instance must be stopped)",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/instances/{id}/start",
  tags: ["Instances"],
  summary: "Start a stopped instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
  },
  responses: {
    200: {
      description: "Instance started",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/instances/{id}/stop",
  tags: ["Instances"],
  summary: "Stop a running instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
  },
  responses: {
    200: {
      description: "Instance stopped",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/instances/{id}/retry",
  tags: ["Instances"],
  summary: "Retry provisioning a failed instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
  },
  responses: {
    200: {
      description: "Instance retry started",
      content: {
        "application/json": {
          schema: InstanceSchema,
        },
      },
    },
    400: {
      description: "Bad request (instance must be in failed state)",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/instances/{id}",
  tags: ["Instances"],
  summary: "Delete an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: InstanceIdParamSchema,
  },
  responses: {
    200: {
      description: "Instance deleted",
      content: {
        "application/json": {
          schema: ApiSuccessSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/instances/validate-telegram-token",
  tags: ["Instances"],
  summary: "Validate a Telegram bot token",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ValidateTelegramTokenRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token validation result",
      content: {
        "application/json": {
          schema: ValidateTelegramTokenResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// BILLING ROUTES
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/billing/checkout",
  tags: ["Billing"],
  summary: "Create Stripe Checkout session for subscription",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateCheckoutRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Checkout session created",
      content: {
        "application/json": {
          schema: CheckoutResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/billing/portal",
  tags: ["Billing"],
  summary: "Create Stripe Customer Portal session",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Portal session created",
      content: {
        "application/json": {
          schema: PortalResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/billing/invoices",
  tags: ["Billing"],
  summary: "Get invoice history from Stripe",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of invoices",
      content: {
        "application/json": {
          schema: InvoiceListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/billing/subscription",
  tags: ["Billing"],
  summary: "Get current subscription status",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Subscription status",
      content: {
        "application/json": {
          schema: SubscriptionResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/billing/webhook",
  tags: ["Billing"],
  summary: "Handle Stripe webhook events",
  responses: {
    200: {
      description: "Webhook received",
      content: {
        "application/json": {
          schema: WebhookResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    500: {
      description: "Server configuration error",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// SKILLS ROUTES
// ============================================================================

// List all available skills (marketplace)
registry.registerPath({
  method: "get",
  path: "/skills",
  tags: ["Skills"],
  summary: "List all available skills",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of all skills",
      content: {
        "application/json": {
          schema: SkillListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Get skill details by ID
registry.registerPath({
  method: "get",
  path: "/skills/{skillId}",
  tags: ["Skills"],
  summary: "Get skill details including full markdown content",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      skillId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "Skill details",
      content: {
        "application/json": {
          schema: SkillSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Skill not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// List user's added skills
registry.registerPath({
  method: "get",
  path: "/skills/user",
  tags: ["Skills"],
  summary: "List skills added to user's library",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of user's skills",
      content: {
        "application/json": {
          schema: UserSkillListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Add skill to user's library
registry.registerPath({
  method: "post",
  path: "/skills/user",
  tags: ["Skills"],
  summary: "Add a skill to user's library",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: AddUserSkillRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Skill added to user's library",
      content: {
        "application/json": {
          schema: UserSkillListSchema.element,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Skill not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    409: {
      description: "Skill already in user's library",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Remove skill from user's library
registry.registerPath({
  method: "delete",
  path: "/skills/user/{skillId}",
  tags: ["Skills"],
  summary: "Remove a skill from user's library",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      skillId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "Skill removed from user's library",
      content: {
        "application/json": {
          schema: ApiSuccessSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Skill not found in user's library",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// List skills enabled for an instance
registry.registerPath({
  method: "get",
  path: "/instances/{instanceId}/skills",
  tags: ["Skills"],
  summary: "List skills enabled for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "List of instance skills",
      content: {
        "application/json": {
          schema: InstanceSkillListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Enable skill for an instance
registry.registerPath({
  method: "post",
  path: "/instances/{instanceId}/skills",
  tags: ["Skills"],
  summary: "Enable a skill for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: EnableInstanceSkillRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Skill enabled for instance",
      content: {
        "application/json": {
          schema: InstanceSkillListSchema.element,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance or skill not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    409: {
      description: "Skill already enabled for instance",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Disable skill for an instance
registry.registerPath({
  method: "delete",
  path: "/instances/{instanceId}/skills/{skillId}",
  tags: ["Skills"],
  summary: "Disable a skill for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
      skillId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "Skill disabled for instance",
      content: {
        "application/json": {
          schema: ApiSuccessSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance or skill not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// INTEGRATIONS ROUTES
// ============================================================================

// List all available integrations
registry.registerPath({
  method: "get",
  path: "/integrations",
  tags: ["Integrations"],
  summary: "List all available integrations",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of integrations",
      content: {
        "application/json": {
          schema: IntegrationListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Get user's connected integrations
registry.registerPath({
  method: "get",
  path: "/integrations/user",
  tags: ["Integrations"],
  summary: "List user's connected integrations",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of user's integrations",
      content: {
        "application/json": {
          schema: UserIntegrationListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Initiate OAuth flow
registry.registerPath({
  method: "post",
  path: "/integrations/oauth/initiate",
  tags: ["Integrations"],
  summary: "Initiate OAuth flow for an integration",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: InitiateOAuthRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OAuth authorization URL",
      content: {
        "application/json": {
          schema: OAuthUrlResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Integration not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Disconnect integration
registry.registerPath({
  method: "delete",
  path: "/integrations/user/{integrationId}",
  tags: ["Integrations"],
  summary: "Disconnect an integration",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      integrationId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "Integration disconnected",
      content: {
        "application/json": {
          schema: ApiSuccessSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Integration not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// List integrations enabled for an instance
registry.registerPath({
  method: "get",
  path: "/instances/{instanceId}/integrations",
  tags: ["Integrations"],
  summary: "List integrations enabled for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "List of instance integrations",
      content: {
        "application/json": {
          schema: InstanceIntegrationListSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Enable integration for an instance
registry.registerPath({
  method: "post",
  path: "/instances/{instanceId}/integrations",
  tags: ["Integrations"],
  summary: "Enable an integration for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: EnableInstanceIntegrationRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Integration enabled for instance",
      content: {
        "application/json": {
          schema: InstanceIntegrationListSchema.element,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance or integration not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    409: {
      description: "Integration already enabled for instance",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// Disable integration for an instance
registry.registerPath({
  method: "delete",
  path: "/instances/{instanceId}/integrations/{integrationId}",
  tags: ["Integrations"],
  summary: "Disable an integration for an instance",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      instanceId: z.string().cuid(),
      integrationId: z.string().cuid(),
    }),
  },
  responses: {
    200: {
      description: "Integration disabled for instance",
      content: {
        "application/json": {
          schema: ApiSuccessSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    404: {
      description: "Instance or integration not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// MCP SERVERS ROUTES
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/mcp-servers",
  tags: ["MCP Servers"],
  summary: "List all available MCP servers",
  responses: {
    200: {
      description: "List of MCP servers",
      content: {
        "application/json": {
          schema: McpServerListSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/mcp-servers/{provider}",
  tags: ["MCP Servers"],
  summary: "Get MCP server by provider",
  request: {
    params: z.object({
      provider: z.string(),
    }),
  },
  responses: {
    200: {
      description: "MCP server details",
      content: {
        "application/json": {
          schema: McpServerSchema,
        },
      },
    },
    404: {
      description: "MCP server not found",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// PROXY V2 ROUTES
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/proxy/v2/actions",
  tags: ["Proxy V2"],
  summary: "List available proxy actions",
  responses: {
    200: {
      description: "List of available actions",
      content: {
        "application/json": {
          schema: ProxyActionsListSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/proxy/v2/{provider}/{action}",
  tags: ["Proxy V2"],
  summary: "Execute a proxy action",
  request: {
    params: z.object({
      provider: z.enum(["github", "slack", "google"]),
      action: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: ProxyV2RequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Action executed successfully",
      content: {
        "application/json": {
          schema: ProxyV2ResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ProxyV2ResponseSchema,
        },
      },
    },
    404: {
      description: "Integration not found",
      content: {
        "application/json": {
          schema: ProxyV2ResponseSchema,
        },
      },
    },
  },
});

// ============================================================================
// HEALTH ROUTES
// ============================================================================

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check endpoint",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("ok"),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
  },
});

// ============================================================================
// GENERATE OPENAPI DOCUMENT
// ============================================================================

const generator = new OpenApiGeneratorV3(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "FasterClaw API",
    version: "1.0.0",
    description: "API for managing OpenClaw instances and subscriptions",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Development server",
    },
    {
      url: "https://api.fasterclaw.com",
      description: "Production server",
    },
  ],
});

// Write to file
const outputPath = join(__dirname, "..", "openapi.json");
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

// eslint-disable-next-line no-console -- Generator script output
console.log(`OpenAPI specification generated at: ${outputPath}`);
