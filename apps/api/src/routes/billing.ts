import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@fasterclaw/db';
import {
  stripe,
  getOrCreateStripeCustomer,
  verifyWebhookSignature,
} from '../services/stripe.js';

// Zod schemas for request/response validation
const createCheckoutSessionSchema = z.object({
  priceId: z.string(),
});

const checkoutSessionResponseSchema = z.object({
  url: z.string(),
});

const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  status: z.string(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const subscriptionResponseSchema = z.object({
  subscription: subscriptionSchema.nullable(),
});

export async function billingRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /billing/checkout - Create Stripe Checkout session
  app.post(
    '/billing/checkout',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Create Stripe Checkout session for subscription',
        body: createCheckoutSessionSchema,
        response: {
          200: checkoutSessionResponseSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { priceId } = request.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(
        userId,
        user.email,
        user.name || undefined
      );

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Create subscription checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/dashboard?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: {
          userId,
        },
      });

      return { url: session.url! };
    }
  );

  // GET /billing/subscription - Get current subscription status
  app.get(
    '/billing/subscription',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Get current subscription status',
        response: {
          200: subscriptionResponseSchema,
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!subscription) {
        return {
          subscription: null,
        };
      }

      return {
        subscription: {
          id: subscription.id,
          userId: subscription.userId,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt.toISOString(),
          updatedAt: subscription.updatedAt.toISOString(),
        },
      };
    }
  );

  // POST /billing/webhook - Handle Stripe webhooks
  app.post(
    '/billing/webhook',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Handle Stripe webhook events',
        response: {
          200: z.object({ received: z.boolean() }),
          400: z.object({ error: z.string() }),
        },
      },
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const signature = request.headers['stripe-signature'] as string;

      if (!signature) {
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      let event;
      try {
        const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body || {}));
        event = verifyWebhookSignature(rawBody as Buffer, signature);
      } catch (err) {
        return reply.code(400).send({ error: 'Invalid signature' });
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;

          if (!userId) {
            break;
          }

          if (session.mode === 'subscription') {
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await prisma.subscription.upsert({
              where: { stripeSubscriptionId: subscriptionId },
              update: {
                status: subscription.status.toUpperCase() as any,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              },
              create: {
                userId,
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscriptionId,
                status: subscription.status.toUpperCase() as any,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              },
            });
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const subscriptionId = subscription.id;

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: subscription.status.toUpperCase() as any,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            },
          });
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const subscriptionId = subscription.id;

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: 'CANCELED',
            },
          });
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await prisma.subscription.updateMany({
              where: { stripeSubscriptionId: subscriptionId },
              data: {
                status: subscription.status.toUpperCase() as any,
              },
            });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription;

          if (subscriptionId) {
            await prisma.subscription.updateMany({
              where: { stripeSubscriptionId: subscriptionId },
              data: {
                status: 'PAST_DUE',
              },
            });
          }
          break;
        }
      }

      return { received: true };
    }
  );
}

export default billingRoutes;
