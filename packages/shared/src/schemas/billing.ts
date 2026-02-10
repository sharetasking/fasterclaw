import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ============================================================================
// Plan Schemas
// ============================================================================

export const PlanTypeSchema = z.enum(["starter", "pro", "enterprise"]);

export const PlanConfigSchema = z
  .object({
    name: z.string(),
    priceId: z.string(),
    price: z.number(),
    instanceLimit: z.number(),
    features: z.array(z.string()),
  })
  .openapi("PlanConfig");

export const PlansSchema = z
  .object({
    starter: PlanConfigSchema.optional(),
    pro: PlanConfigSchema.optional(),
    enterprise: PlanConfigSchema.optional(),
  })
  .openapi("Plans");

// ============================================================================
// Subscription Schemas
// ============================================================================

export const SubscriptionStatusSchema = z.enum([
  "ACTIVE",
  "CANCELED",
  "PAST_DUE",
  "TRIALING",
  "INCOMPLETE",
  "INCOMPLETE_EXPIRED",
  "UNPAID",
]);

export const SubscriptionSchema = z
  .object({
    id: z.string().cuid(),
    userId: z.string().cuid(),
    stripeCustomerId: z.string(),
    stripeSubscriptionId: z.string(),
    status: z.string(),
    plan: PlanTypeSchema.nullable(),
    instanceLimit: z.number(),
    currentPeriodStart: z.string().datetime().nullable(),
    currentPeriodEnd: z.string().datetime(),
    cancelAtPeriodEnd: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Subscription");

// ============================================================================
// Billing Request Schemas
// ============================================================================

export const CreateCheckoutRequestSchema = z
  .object({
    plan: PlanTypeSchema,
  })
  .openapi("CreateCheckoutRequest");

// ============================================================================
// Billing Response Schemas
// ============================================================================

export const CheckoutResponseSchema = z
  .object({
    url: z.string().url(),
  })
  .openapi("CheckoutResponse");

export const PortalResponseSchema = z
  .object({
    url: z.string().url(),
  })
  .openapi("PortalResponse");

export const SubscriptionResponseSchema = z
  .object({
    subscription: SubscriptionSchema.nullable(),
    plans: PlansSchema,
  })
  .openapi("SubscriptionResponse");

export const InvoiceSchema = z
  .object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
    createdAt: z.string().datetime(),
    paidAt: z.string().datetime().nullable(),
    invoiceUrl: z.string().url().nullable(),
    invoicePdf: z.string().url().nullable(),
  })
  .openapi("Invoice");

export const InvoiceListSchema = z.array(InvoiceSchema).openapi("InvoiceList");

// ============================================================================
// Webhook Schemas
// ============================================================================

export const WebhookResponseSchema = z
  .object({
    received: z.boolean(),
  })
  .openapi("WebhookResponse");

// ============================================================================
// Type Exports
// ============================================================================

export type PlanType = z.infer<typeof PlanTypeSchema>;
export type PlanConfig = z.infer<typeof PlanConfigSchema>;
export type Plans = z.infer<typeof PlansSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
export type PortalResponse = z.infer<typeof PortalResponseSchema>;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceList = z.infer<typeof InvoiceListSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
