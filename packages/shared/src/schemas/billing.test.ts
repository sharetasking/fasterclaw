import { describe, it, expect } from "vitest";
import {
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
} from "./billing.js";

describe("Billing Schemas", () => {
  describe("PlanTypeSchema", () => {
    it("should accept 'starter' plan type", () => {
      const result = PlanTypeSchema.safeParse("starter");
      expect(result.success).toBe(true);
    });

    it("should accept 'pro' plan type", () => {
      const result = PlanTypeSchema.safeParse("pro");
      expect(result.success).toBe(true);
    });

    it("should accept 'enterprise' plan type", () => {
      const result = PlanTypeSchema.safeParse("enterprise");
      expect(result.success).toBe(true);
    });

    it("should reject invalid plan type", () => {
      const result = PlanTypeSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = PlanTypeSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = PlanTypeSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject number", () => {
      const result = PlanTypeSchema.safeParse(1);
      expect(result.success).toBe(false);
    });
  });

  describe("PlanConfigSchema", () => {
    it("should accept valid plan config", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Starter Plan",
        priceId: "price_123456789",
        price: 9.99,
        instanceLimit: 3,
        features: ["Feature 1", "Feature 2", "Feature 3"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty features array", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Basic Plan",
        priceId: "price_123456789",
        price: 0,
        instanceLimit: 1,
        features: [],
      });
      expect(result.success).toBe(true);
    });

    it("should accept zero price", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Free Plan",
        priceId: "price_free",
        price: 0,
        instanceLimit: 1,
        features: ["Basic feature"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept negative price", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Discount Plan",
        priceId: "price_discount",
        price: -10,
        instanceLimit: 5,
        features: ["Feature"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept decimal price", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Pro Plan",
        priceId: "price_pro",
        price: 29.99,
        instanceLimit: 10,
        features: ["Feature"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const result = PlanConfigSchema.safeParse({
        priceId: "price_123",
        price: 10,
        instanceLimit: 5,
        features: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing priceId", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Plan",
        price: 10,
        instanceLimit: 5,
        features: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-number price", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Plan",
        priceId: "price_123",
        price: "10",
        instanceLimit: 5,
        features: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-array features", () => {
      const result = PlanConfigSchema.safeParse({
        name: "Plan",
        priceId: "price_123",
        price: 10,
        instanceLimit: 5,
        features: "Feature 1, Feature 2",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PlansSchema", () => {
    it("should accept valid plans object", () => {
      const result = PlansSchema.safeParse({
        starter: {
          name: "Starter",
          priceId: "price_starter",
          price: 9.99,
          instanceLimit: 3,
          features: ["Feature 1"],
        },
        pro: {
          name: "Pro",
          priceId: "price_pro",
          price: 29.99,
          instanceLimit: 10,
          features: ["Feature 1", "Feature 2"],
        },
        enterprise: {
          name: "Enterprise",
          priceId: "price_enterprise",
          price: 99.99,
          instanceLimit: 100,
          features: ["All features"],
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept partial plans object", () => {
      const result = PlansSchema.safeParse({
        starter: {
          name: "Starter",
          priceId: "price_starter",
          price: 9.99,
          instanceLimit: 3,
          features: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty plans object", () => {
      const result = PlansSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should strip unknown plan keys", () => {
      // z.object() strips unknown keys by default (doesn't reject them)
      const result = PlansSchema.safeParse({
        invalid: {
          name: "Invalid",
          priceId: "price_invalid",
          price: 9.99,
          instanceLimit: 3,
          features: [],
        },
      });
      expect(result.success).toBe(true);
      // The invalid key should be stripped from the result
      expect(result.data).toEqual({});
    });
  });

  describe("SubscriptionStatusSchema", () => {
    it("should accept ACTIVE status", () => {
      const result = SubscriptionStatusSchema.safeParse("ACTIVE");
      expect(result.success).toBe(true);
    });

    it("should accept CANCELED status", () => {
      const result = SubscriptionStatusSchema.safeParse("CANCELED");
      expect(result.success).toBe(true);
    });

    it("should accept PAST_DUE status", () => {
      const result = SubscriptionStatusSchema.safeParse("PAST_DUE");
      expect(result.success).toBe(true);
    });

    it("should accept TRIALING status", () => {
      const result = SubscriptionStatusSchema.safeParse("TRIALING");
      expect(result.success).toBe(true);
    });

    it("should accept INCOMPLETE status", () => {
      const result = SubscriptionStatusSchema.safeParse("INCOMPLETE");
      expect(result.success).toBe(true);
    });

    it("should accept INCOMPLETE_EXPIRED status", () => {
      const result = SubscriptionStatusSchema.safeParse("INCOMPLETE_EXPIRED");
      expect(result.success).toBe(true);
    });

    it("should accept UNPAID status", () => {
      const result = SubscriptionStatusSchema.safeParse("UNPAID");
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = SubscriptionStatusSchema.safeParse("INVALID");
      expect(result.success).toBe(false);
    });

    it("should reject lowercase status", () => {
      const result = SubscriptionStatusSchema.safeParse("active");
      expect(result.success).toBe(false);
    });
  });

  describe("SubscriptionSchema", () => {
    it("should accept valid subscription", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "ACTIVE",
        plan: "pro",
        currentPeriodStart: "2024-01-01T00:00:00.000Z",
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null plan", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "INCOMPLETE",
        plan: null,
        currentPeriodStart: null,
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null currentPeriodStart", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "TRIALING",
        plan: "starter",
        currentPeriodStart: null,
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept cancelAtPeriodEnd as true", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "ACTIVE",
        plan: "pro",
        currentPeriodStart: "2024-01-01T00:00:00.000Z",
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid CUID for id", () => {
      const result = SubscriptionSchema.safeParse({
        id: "invalid-id",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "ACTIVE",
        plan: "pro",
        currentPeriodStart: "2024-01-01T00:00:00.000Z",
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        stripeCustomerId: "cus_123456789",
        stripeSubscriptionId: "sub_123456789",
        status: "ACTIVE",
        plan: "pro",
        currentPeriodStart: "not-a-date",
        currentPeriodEnd: "2024-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = SubscriptionSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        plan: "pro",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateCheckoutRequestSchema", () => {
    it("should accept valid checkout request with starter plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({
        plan: "starter",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid checkout request with pro plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({
        plan: "pro",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid checkout request with enterprise plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({
        plan: "enterprise",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({
        plan: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject null plan", () => {
      const result = CreateCheckoutRequestSchema.safeParse({
        plan: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CheckoutResponseSchema", () => {
    it("should accept valid checkout response", () => {
      const result = CheckoutResponseSchema.safeParse({
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const result = CheckoutResponseSchema.safeParse({
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing url", () => {
      const result = CheckoutResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept URL with query parameters", () => {
      const result = CheckoutResponseSchema.safeParse({
        url: "https://checkout.stripe.com/c/pay/cs_test_123?key=value",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty string url", () => {
      const result = CheckoutResponseSchema.safeParse({
        url: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PortalResponseSchema", () => {
    it("should accept valid portal response", () => {
      const result = PortalResponseSchema.safeParse({
        url: "https://billing.stripe.com/p/session/test_123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const result = PortalResponseSchema.safeParse({
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing url", () => {
      const result = PortalResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("SubscriptionResponseSchema", () => {
    it("should accept valid subscription response with subscription", () => {
      const result = SubscriptionResponseSchema.safeParse({
        subscription: {
          id: "clh1234567890abcdefghijkl",
          userId: "clh9876543210zyxwvutsrqpo",
          stripeCustomerId: "cus_123456789",
          stripeSubscriptionId: "sub_123456789",
          status: "ACTIVE",
          plan: "pro",
          currentPeriodStart: "2024-01-01T00:00:00.000Z",
          currentPeriodEnd: "2024-02-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        plans: {
          starter: {
            name: "Starter",
            priceId: "price_starter",
            price: 9.99,
            instanceLimit: 3,
            features: ["Feature 1"],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept null subscription", () => {
      const result = SubscriptionResponseSchema.safeParse({
        subscription: null,
        plans: {
          starter: {
            name: "Starter",
            priceId: "price_starter",
            price: 9.99,
            instanceLimit: 3,
            features: [],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty plans object", () => {
      const result = SubscriptionResponseSchema.safeParse({
        subscription: null,
        plans: {},
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing subscription field", () => {
      const result = SubscriptionResponseSchema.safeParse({
        plans: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing plans field", () => {
      const result = SubscriptionResponseSchema.safeParse({
        subscription: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("InvoiceSchema", () => {
    it("should accept valid invoice", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "paid",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: "2024-01-01T01:00:00.000Z",
        invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_123",
        invoicePdf: "https://invoice.stripe.com/i/acct_123/test_123/pdf",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null paidAt", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "open",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: null,
        invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_123",
        invoicePdf: "https://invoice.stripe.com/i/acct_123/test_123/pdf",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null invoiceUrl", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: null,
        invoiceUrl: null,
        invoicePdf: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept null invoicePdf", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "draft",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: null,
        invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_123",
        invoicePdf: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept zero amount", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 0,
        status: "paid",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: "2024-01-01T01:00:00.000Z",
        invoiceUrl: null,
        invoicePdf: null,
      });
      expect(result.success).toBe(true);
    });

    it("should accept negative amount", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: -1000,
        status: "paid",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: "2024-01-01T01:00:00.000Z",
        invoiceUrl: null,
        invoicePdf: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL for invoiceUrl", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "paid",
        createdAt: "2024-01-01T00:00:00.000Z",
        paidAt: "2024-01-01T01:00:00.000Z",
        invoiceUrl: "not-a-url",
        invoicePdf: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
        status: "paid",
        createdAt: "invalid-date",
        paidAt: null,
        invoiceUrl: null,
        invoicePdf: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = InvoiceSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("InvoiceListSchema", () => {
    it("should accept valid invoice list", () => {
      const result = InvoiceListSchema.safeParse([
        {
          id: "in_123456789",
          amount: 2999,
          status: "paid",
          createdAt: "2024-01-01T00:00:00.000Z",
          paidAt: "2024-01-01T01:00:00.000Z",
          invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_123",
          invoicePdf: "https://invoice.stripe.com/i/acct_123/test_123/pdf",
        },
        {
          id: "in_987654321",
          amount: 1999,
          status: "open",
          createdAt: "2024-01-15T00:00:00.000Z",
          paidAt: null,
          invoiceUrl: null,
          invoicePdf: null,
        },
      ]);
      expect(result.success).toBe(true);
    });

    it("should accept empty invoice list", () => {
      const result = InvoiceListSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("should reject invalid invoice in list", () => {
      const result = InvoiceListSchema.safeParse([
        {
          id: "in_123456789",
          amount: 2999,
          status: "paid",
          createdAt: "2024-01-01T00:00:00.000Z",
          paidAt: "2024-01-01T01:00:00.000Z",
          invoiceUrl: "https://invoice.stripe.com/i/acct_123/test_123",
          invoicePdf: "https://invoice.stripe.com/i/acct_123/test_123/pdf",
        },
        {
          id: "in_987654321",
          amount: "invalid",
          status: "open",
        },
      ]);
      expect(result.success).toBe(false);
    });

    it("should reject non-array", () => {
      const result = InvoiceListSchema.safeParse({
        id: "in_123456789",
        amount: 2999,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("WebhookResponseSchema", () => {
    it("should accept valid webhook response with true", () => {
      const result = WebhookResponseSchema.safeParse({
        received: true,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid webhook response with false", () => {
      const result = WebhookResponseSchema.safeParse({
        received: false,
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing received field", () => {
      const result = WebhookResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-boolean received", () => {
      const result = WebhookResponseSchema.safeParse({
        received: "true",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null received", () => {
      const result = WebhookResponseSchema.safeParse({
        received: null,
      });
      expect(result.success).toBe(false);
    });
  });
});
