import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { billingRoutes } from "./billing.js";

// Mock dependencies
vi.mock("@fasterclaw/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../services/stripe.js", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    invoices: {
      list: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  getOrCreateStripeCustomer: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  getPlanFromPriceId: vi.fn(),
  getPriceIdForPlan: vi.fn(),
  PLANS: {
    starter: {
      name: "Starter",
      priceId: "price_starter_test",
      price: 39,
      instanceLimit: 2,
      features: ["Feature 1"],
    },
    pro: {
      name: "Pro",
      priceId: "price_pro_test",
      price: 79,
      instanceLimit: 10,
      features: ["Feature 1", "Feature 2"],
    },
    enterprise: {
      name: "Enterprise",
      priceId: "price_enterprise_test",
      price: 149,
      instanceLimit: -1,
      features: ["Feature 1", "Feature 2", "Feature 3"],
    },
  },
}));

import { prisma } from "@fasterclaw/db";
import {
  stripe,
  getOrCreateStripeCustomer,
  verifyWebhookSignature,
  getPriceIdForPlan,
  getPlanFromPriceId,
} from "../services/stripe.js";

describe("Billing Routes", () => {
  let app: FastifyInstance;
  // Use valid CUID formats for testing
  const mockUserId = "cjld2cyuq0000t3rmniod1foy";
  const mockSubscriptionId = "cjld2cyuq0002t3rmniod1fog";

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Mock JWT plugin
    app.decorate("jwt", {
      sign: vi.fn().mockReturnValue("mock-token"),
      verify: vi.fn(),
      options: {},
      decode: vi.fn(),
      lookupToken: vi.fn(),
    } as any);

    // Mock authenticate decorator
    app.decorate("authenticate", async (request: any) => {
      request.user = { id: mockUserId, email: "test@example.com", name: "Test User" };
    });

    await app.register(billingRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /billing/checkout", () => {
    it("should create a checkout session successfully", async () => {
      vi.mocked(getPriceIdForPlan).mockReturnValue("price_starter_test");
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "test@example.com",
        name: "Test User",
      } as any);
      vi.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        payload: { plan: "starter" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBe("https://checkout.stripe.com/session_123");
    });

    it("should return 400 if no price ID configured for plan", async () => {
      vi.mocked(getPriceIdForPlan).mockReturnValue("");

      const response = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        payload: { plan: "starter" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("No price ID configured");
    });

    it("should return 401 if user not found", async () => {
      vi.mocked(getPriceIdForPlan).mockReturnValue("price_starter_test");
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        payload: { plan: "starter" },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("User not found");
    });

    it("should return 500 if checkout session URL is null", async () => {
      vi.mocked(getPriceIdForPlan).mockReturnValue("price_starter_test");
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "test@example.com",
        name: "Test User",
      } as any);
      vi.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        url: null,
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        payload: { plan: "starter" },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to create checkout session");
    });
  });

  describe("POST /billing/portal", () => {
    it("should create a portal session successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        stripeCustomerId: "cus_123",
      } as any);
      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/portal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBe("https://billing.stripe.com/portal_123");
    });

    it("should return 400 if no Stripe customer found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        stripeCustomerId: null,
      } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/portal",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("No Stripe customer found");
    });

    it("should return 400 if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/billing/portal",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("No Stripe customer found");
    });
  });

  describe("GET /billing/invoices", () => {
    it("should return invoices successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        stripeCustomerId: "cus_123",
      } as any);
      vi.mocked(stripe.invoices.list).mockResolvedValue({
        data: [
          {
            id: "inv_123",
            amount_paid: 3900,
            status: "paid",
            created: 1704067200, // 2024-01-01
            status_transitions: {
              paid_at: 1704067200,
            },
            hosted_invoice_url: "https://invoice.stripe.com/inv_123",
            invoice_pdf: "https://invoice.stripe.com/inv_123.pdf",
          },
        ],
      } as any);

      const response = await app.inject({
        method: "GET",
        url: "/billing/invoices",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe("inv_123");
      expect(body[0].amount).toBe(39);
      expect(body[0].status).toBe("paid");
    });

    it("should return empty array if no Stripe customer", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        stripeCustomerId: null,
      } as any);

      const response = await app.inject({
        method: "GET",
        url: "/billing/invoices",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });

    it("should handle invoices without paid_at timestamp", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        stripeCustomerId: "cus_123",
      } as any);
      vi.mocked(stripe.invoices.list).mockResolvedValue({
        data: [
          {
            id: "inv_123",
            amount_paid: 3900,
            status: "open",
            created: 1704067200,
            status_transitions: {
              paid_at: null,
            },
            hosted_invoice_url: null,
            invoice_pdf: null,
          },
        ],
      } as any);

      const response = await app.inject({
        method: "GET",
        url: "/billing/invoices",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0].paidAt).toBeNull();
    });
  });

  describe("GET /billing/subscription", () => {
    it("should return subscription with plans", async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        status: "ACTIVE",
        plan: "starter",
        stripePriceId: "price_starter_test",
        currentPeriodStart: new Date("2024-01-01"),
        currentPeriodEnd: new Date("2024-02-01"),
        cancelAtPeriodEnd: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any);
      vi.mocked(getPlanFromPriceId).mockReturnValue("starter");

      const response = await app.inject({
        method: "GET",
        url: "/billing/subscription",
      });

      if (response.statusCode !== 200) {
        console.error("Response body:", response.body);
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subscription).toBeDefined();
      expect(body.subscription.id).toBe(mockSubscriptionId);
      expect(body.plans).toBeDefined();
    });

    it("should return null subscription if none exists", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/billing/subscription",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subscription).toBeNull();
      expect(body.plans).toBeDefined();
    });

    it("should use stored plan if no stripePriceId", async () => {
      const mockSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        status: "ACTIVE",
        plan: "pro",
        stripePriceId: null,
        currentPeriodStart: new Date("2024-01-01"),
        currentPeriodEnd: new Date("2024-02-01"),
        cancelAtPeriodEnd: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any);

      const response = await app.inject({
        method: "GET",
        url: "/billing/subscription",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.subscription.plan).toBe("pro");
    });
  });

  describe("POST /billing/webhook", () => {
    it("should handle checkout.session.completed event", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { userId: mockUserId, plan: "starter" },
            mode: "subscription",
            subscription: "sub_123",
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        status: "active",
        customer: "cus_123",
        items: { data: [{ price: { id: "price_starter_test" } }] },
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        cancel_at_period_end: false,
      } as any);
      vi.mocked(getPlanFromPriceId).mockReturnValue("starter");
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.received).toBe(true);
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });

    it("should handle customer.subscription.updated event", async () => {
      const mockEvent = {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "active",
            current_period_start: 1704067200,
            current_period_end: 1706745600,
            cancel_at_period_end: false,
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.subscription.updateMany).toHaveBeenCalled();
    });

    it("should handle customer.subscription.deleted event", async () => {
      const mockEvent = {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "CANCELED" },
      });
    });

    it("should handle invoice.payment_succeeded event", async () => {
      const mockEvent = {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_123",
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        status: "active",
      } as any);
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it("should handle invoice.payment_failed event", async () => {
      const mockEvent = {
        type: "invoice.payment_failed",
        data: {
          object: {
            subscription: "sub_123",
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);
      vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 } as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "PAST_DUE" },
      });
    });

    it("should return 400 for missing signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Missing stripe-signature header");
    });

    it("should return 400 for invalid signature", async () => {
      vi.mocked(verifyWebhookSignature).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "invalid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Invalid signature");
    });

    it("should handle unknown event types gracefully", async () => {
      const mockEvent = {
        type: "unknown.event.type",
        data: { object: {} },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.received).toBe(true);
    });

    it("should skip checkout.session.completed without userId", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {},
            mode: "subscription",
            subscription: "sub_123",
          },
        },
      };
      vi.mocked(verifyWebhookSignature).mockReturnValue(mockEvent as any);

      const response = await app.inject({
        method: "POST",
        url: "/billing/webhook",
        headers: {
          "stripe-signature": "valid_signature",
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });
});
