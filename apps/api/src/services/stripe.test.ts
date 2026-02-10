import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";
import {
  getPlanFromPriceId,
  getPriceIdForPlan,
  getOrCreateStripeCustomer,
  verifyWebhookSignature,
  PLANS,
  type PlanType,
} from "./stripe";
import { prisma } from "@fasterclaw/db";

const mockCustomersCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("@fasterclaw/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("stripe", () => {
  const mockStripeClass = vi.fn(() => ({
    customers: {
      create: mockCustomersCreate,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }));
  return { default: mockStripeClass };
});

describe("Stripe Service", () => {
  describe("getPlanFromPriceId", () => {
    it("should return 'starter' for starter price ID", () => {
      const priceId = process.env.STRIPE_PRICE_ID_STARTER;
      const result = getPlanFromPriceId(priceId!);
      expect(result).toBe("starter");
    });

    it("should return 'pro' for pro price ID", () => {
      const priceId = process.env.STRIPE_PRICE_ID_PRO;
      const result = getPlanFromPriceId(priceId!);
      expect(result).toBe("pro");
    });

    it("should return 'enterprise' for enterprise price ID", () => {
      const priceId = process.env.STRIPE_PRICE_ID_ENTERPRISE;
      const result = getPlanFromPriceId(priceId!);
      expect(result).toBe("enterprise");
    });

    it("should return null for unknown price ID", () => {
      const result = getPlanFromPriceId("price_unknown_test");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = getPlanFromPriceId("");
      expect(result).toBeNull();
    });
  });

  describe("getPriceIdForPlan", () => {
    it("should return correct price ID for starter plan", () => {
      const result = getPriceIdForPlan("starter");
      expect(result).toBe(process.env.STRIPE_PRICE_ID_STARTER);
    });

    it("should return correct price ID for pro plan", () => {
      const result = getPriceIdForPlan("pro");
      expect(result).toBe(process.env.STRIPE_PRICE_ID_PRO);
    });

    it("should return correct price ID for enterprise plan", () => {
      const result = getPriceIdForPlan("enterprise");
      expect(result).toBe(process.env.STRIPE_PRICE_ID_ENTERPRISE);
    });

    it("should match PLANS configuration", () => {
      const plans: PlanType[] = ["starter", "pro", "enterprise"];
      plans.forEach((plan) => {
        const priceId = getPriceIdForPlan(plan);
        expect(priceId).toBe(PLANS[plan].priceId);
      });
    });
  });

  describe("getOrCreateStripeCustomer", () => {
    const mockUserId = "user_123";
    const mockEmail = "test@example.com";
    const mockName = "Test User";
    const mockStripeCustomerId = "cus_test123";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return existing Stripe customer ID if user has one", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: mockStripeCustomerId,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getOrCreateStripeCustomer(mockUserId, mockEmail, mockName);

      expect(result).toBe(mockStripeCustomerId);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { stripeCustomerId: true },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should create new Stripe customer if user has no customer ID", async () => {
      mockCustomersCreate.mockResolvedValue({ id: mockStripeCustomerId });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: null,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: mockStripeCustomerId,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getOrCreateStripeCustomer(mockUserId, mockEmail, mockName);

      expect(result).toBe(mockStripeCustomerId);
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: mockEmail,
        name: mockName,
        metadata: {
          userId: mockUserId,
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { stripeCustomerId: mockStripeCustomerId },
      });
    });

    it("should create customer without name if not provided", async () => {
      mockCustomersCreate.mockResolvedValue({ id: mockStripeCustomerId });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: null,
        name: null,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: mockStripeCustomerId,
        name: null,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getOrCreateStripeCustomer(mockUserId, mockEmail);

      expect(result).toBe(mockStripeCustomerId);
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: mockEmail,
        name: undefined,
        metadata: {
          userId: mockUserId,
        },
      });
    });

    it("should create customer if stripeCustomerId is empty string", async () => {
      mockCustomersCreate.mockResolvedValue({ id: mockStripeCustomerId });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: "",
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: mockStripeCustomerId,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await getOrCreateStripeCustomer(mockUserId, mockEmail, mockName);

      expect(result).toBe(mockStripeCustomerId);
      expect(mockCustomersCreate).toHaveBeenCalled();
    });

    it("should throw error if STRIPE_SECRET_KEY is not set", async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      await expect(getOrCreateStripeCustomer(mockUserId, mockEmail, mockName)).rejects.toThrow(
        "STRIPE_SECRET_KEY environment variable is required for billing operations"
      );

      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it("should throw error if STRIPE_SECRET_KEY is empty string", async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      process.env.STRIPE_SECRET_KEY = "";

      await expect(getOrCreateStripeCustomer(mockUserId, mockEmail, mockName)).rejects.toThrow(
        "STRIPE_SECRET_KEY environment variable is required for billing operations"
      );

      process.env.STRIPE_SECRET_KEY = originalKey;
    });

    it("should handle Stripe API errors gracefully", async () => {
      const mockError = new Error("Stripe API error");
      mockCustomersCreate.mockRejectedValue(mockError);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: null,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(getOrCreateStripeCustomer(mockUserId, mockEmail, mockName)).rejects.toThrow(
        "Stripe API error"
      );
    });

    it("should handle database errors when finding user", async () => {
      const mockError = new Error("Database error");
      vi.mocked(prisma.user.findUnique).mockRejectedValue(mockError);

      await expect(getOrCreateStripeCustomer(mockUserId, mockEmail, mockName)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle database errors when updating user", async () => {
      mockCustomersCreate.mockResolvedValue({ id: mockStripeCustomerId });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        email: mockEmail,
        stripeCustomerId: null,
        name: mockName,
        passwordHash: null,
        googleId: null,
        plan: "pro",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const mockError = new Error("Database update error");
      vi.mocked(prisma.user.update).mockRejectedValue(mockError);

      await expect(getOrCreateStripeCustomer(mockUserId, mockEmail, mockName)).rejects.toThrow(
        "Database update error"
      );
    });
  });

  describe("verifyWebhookSignature", () => {
    const mockPayload = JSON.stringify({ type: "test.event" });
    const mockSignature = "t=123456,v1=signature";
    const mockEvent = { type: "test.event" } as unknown as Stripe.Event;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should verify webhook signature successfully with string payload", () => {
      mockWebhooksConstructEvent.mockReturnValue(mockEvent);

      const result = verifyWebhookSignature(mockPayload, mockSignature);

      expect(result).toEqual(mockEvent);
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        mockPayload,
        mockSignature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    });

    it("should verify webhook signature successfully with Buffer payload", () => {
      const bufferPayload = Buffer.from(mockPayload);
      mockWebhooksConstructEvent.mockReturnValue(mockEvent);

      const result = verifyWebhookSignature(bufferPayload, mockSignature);

      expect(result).toEqual(mockEvent);
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        bufferPayload,
        mockSignature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    });

    it("should throw error if STRIPE_WEBHOOK_SECRET is not set", () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => verifyWebhookSignature(mockPayload, mockSignature)).toThrow(
        "STRIPE_WEBHOOK_SECRET environment variable is required"
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it("should throw error if STRIPE_WEBHOOK_SECRET is empty string", () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      process.env.STRIPE_WEBHOOK_SECRET = "";

      expect(() => verifyWebhookSignature(mockPayload, mockSignature)).toThrow(
        "STRIPE_WEBHOOK_SECRET environment variable is required"
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    it("should throw error for invalid signature", () => {
      const mockError = new Error("Invalid signature");
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw mockError;
      });

      expect(() => verifyWebhookSignature(mockPayload, mockSignature)).toThrow("Invalid signature");
    });

    it("should handle Stripe webhook construction errors", () => {
      const mockError = new Error("Webhook signature verification failed");
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw mockError;
      });

      expect(() => verifyWebhookSignature(mockPayload, mockSignature)).toThrow(
        "Webhook signature verification failed"
      );
    });
  });

  describe("PLANS configuration", () => {
    it("should have correct structure for all plans", () => {
      const planTypes: PlanType[] = ["starter", "pro", "enterprise"];

      planTypes.forEach((planType) => {
        const plan = PLANS[planType];
        expect(plan).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.priceId).toBeDefined();
        expect(typeof plan.price).toBe("number");
        expect(typeof plan.instanceLimit).toBe("number");
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it("should have correct values for starter plan", () => {
      const starter = PLANS.starter;
      expect(starter.name).toBe("Starter");
      expect(starter.price).toBe(39);
      expect(starter.instanceLimit).toBe(2);
      expect(starter.priceId).toBe(process.env.STRIPE_PRICE_ID_STARTER);
    });

    it("should have correct values for pro plan", () => {
      const pro = PLANS.pro;
      expect(pro.name).toBe("Pro");
      expect(pro.price).toBe(79);
      expect(pro.instanceLimit).toBe(10);
      expect(pro.priceId).toBe(process.env.STRIPE_PRICE_ID_PRO);
    });

    it("should have correct values for enterprise plan", () => {
      const enterprise = PLANS.enterprise;
      expect(enterprise.name).toBe("Enterprise");
      expect(enterprise.price).toBe(149);
      expect(enterprise.instanceLimit).toBe(-1);
      expect(enterprise.priceId).toBe(process.env.STRIPE_PRICE_ID_ENTERPRISE);
    });

    it("should have unique price IDs for each plan", () => {
      const priceIds = Object.values(PLANS).map((plan) => plan.priceId);
      const uniquePriceIds = new Set(priceIds);
      expect(uniquePriceIds.size).toBe(priceIds.length);
    });

    it("should have increasing prices from starter to enterprise", () => {
      expect(PLANS.starter.price).toBeLessThan(PLANS.pro.price);
      expect(PLANS.pro.price).toBeLessThan(PLANS.enterprise.price);
    });

    it("should have increasing instance limits (except enterprise unlimited)", () => {
      expect(PLANS.starter.instanceLimit).toBeLessThan(PLANS.pro.instanceLimit);
      expect(PLANS.enterprise.instanceLimit).toBe(-1);
    });
  });
});
