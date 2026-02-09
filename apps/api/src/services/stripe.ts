import Stripe from 'stripe';
import { prisma } from '@fasterclaw/db';

/**
 * Stripe Service
 * Handles Stripe integration for billing and subscriptions
 */

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance (lazy initialization)
 */
function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      // In development, use a placeholder key to allow the app to start
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  STRIPE_SECRET_KEY not set. Using placeholder. Stripe operations will fail.');
        stripeInstance = new Stripe('sk_test_placeholder_key_for_development', {
          apiVersion: '2025-02-24.acacia',
          typescript: true,
        });
      } else {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
    } else {
      stripeInstance = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
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
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required for billing operations');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    name: name || undefined,
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
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
