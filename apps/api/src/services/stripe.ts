import Stripe from "stripe";
import { prisma } from "@fasterclaw/db";

/**
 * Stripe Service
 * Handles Stripe integration for billing and subscriptions
 */

// Plan configuration - maps price IDs to plan details
export type PlanType = "starter" | "pro" | "enterprise";

export interface PlanConfig {
  name: string;
  priceId: string;
  price: number;
  instanceLimit: number;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_ID_STARTER ?? "",
    price: 39,
    instanceLimit: 2,
    features: [
      "Up to 100K requests/month",
      "2 Claude instances",
      "Basic analytics",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_ID_PRO ?? "",
    price: 79,
    instanceLimit: 10,
    features: [
      "Up to 1M requests/month",
      "10 Claude instances",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
    price: 149,
    instanceLimit: -1, // unlimited
    features: [
      "Unlimited requests",
      "Unlimited instances",
      "Custom analytics",
      "24/7 dedicated support",
      "SLA guarantee",
    ],
  },
};

/**
 * Get plan type from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): PlanType | null {
  for (const [planType, config] of Object.entries(PLANS)) {
    if (config.priceId === priceId) {
      return planType as PlanType;
    }
  }
  return null;
}

/**
 * Get price ID for a plan type
 */
export function getPriceIdForPlan(plan: PlanType): string {
  return PLANS[plan].priceId;
}

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization)
 */
function getStripe(): Stripe {
  if (stripeInstance === null) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey === undefined || secretKey === "") {
      // In development, use a placeholder key to allow the app to start
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️  STRIPE_SECRET_KEY not set. Using placeholder. Stripe operations will fail."
        );
        stripeInstance = new Stripe("sk_test_placeholder_key_for_development", {
          apiVersion: "2025-02-24.acacia",
          typescript: true,
        });
      } else {
        throw new Error("STRIPE_SECRET_KEY environment variable is required");
      }
    } else {
      stripeInstance = new Stripe(secretKey, {
        apiVersion: "2025-02-24.acacia",
        typescript: true,
      });
    }
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey === undefined || stripeKey === "") {
    throw new Error("STRIPE_SECRET_KEY environment variable is required for billing operations");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (
    user?.stripeCustomerId !== null &&
    user?.stripeCustomerId !== undefined &&
    user.stripeCustomerId !== ""
  ) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    name: name ?? undefined,
    metadata: {
      userId,
    },
  });

  // Update user with Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret === undefined || webhookSecret === "") {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }

  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create a Stripe billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required for billing operations');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
