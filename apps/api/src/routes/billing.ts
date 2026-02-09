import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@fasterclaw/db';
import {
  stripe,
  getOrCreateStripeCustomer,
  verifyWebhookSignature,
  createBillingPortalSession,
  PLANS,
  getPlanFromPriceId,
  getPriceIdForPlan,
  type PlanType,
} from '../services/stripe.js';

// Zod schemas for request/response validation
const createCheckoutSessionSchema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
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
  plan: z.enum(['starter', 'pro', 'enterprise']).nullable(),
  instanceLimit: z.number(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const planConfigSchema = z.object({
  name: z.string(),
  priceId: z.string(),
  price: z.number(),
  instanceLimit: z.number(),
  features: z.array(z.string()),
});

const subscriptionResponseSchema = z.object({
  subscription: subscriptionSchema.nullable(),
  plans: z.record(z.enum(['starter', 'pro', 'enterprise']), planConfigSchema),
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
      const { plan } = request.body;

      const priceId = getPriceIdForPlan(plan);
      if (!priceId) {
        return reply.code(400).send({ error: `No price ID configured for plan: ${plan}. Please set STRIPE_PRICE_ID_${plan.toUpperCase()} environment variable.` });
      }

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
        success_url: `${baseUrl}/dashboard/billing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: {
          userId,
          plan,
        },
      });

      return { url: session.url! };
    }
  );

  // POST /billing/portal - Create Stripe Customer Portal session
  app.post(
    '/billing/portal',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Create Stripe Customer Portal session',
        response: {
          200: z.object({ url: z.string() }),
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return reply.code(400).send({ error: 'No billing account found. Please subscribe first.' });
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const url = await createBillingPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/dashboard/billing`
      );

      return { url };
    }
  );

  // GET /billing/invoices - Get invoice history
  app.get(
    '/billing/invoices',
    {
      schema: {
        tags: ['Billing'],
        summary: 'Get invoice history from Stripe',
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              amount: z.number(),
              status: z.string(),
              createdAt: z.string(),
              paidAt: z.string().nullable(),
              invoiceUrl: z.string().nullable(),
              invoicePdf: z.string().nullable(),
            })
          ),
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return [];
      }

      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });

      return invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: (invoice.amount_paid || 0) / 100, // Convert from cents
        status: invoice.status || 'unknown',
        createdAt: new Date(invoice.created * 1000).toISOString(),
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        invoiceUrl: invoice.hosted_invoice_url || null,
        invoicePdf: invoice.invoice_pdf || null,
      }));
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
          plans: PLANS,
        };
      }

      // Get plan from stripePriceId or fall back to stored plan
      const plan = subscription.stripePriceId
        ? getPlanFromPriceId(subscription.stripePriceId)
        : (subscription.plan as PlanType | null);

      return {
        subscription: {
          id: subscription.id,
          userId: subscription.userId,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: subscription.status,
          plan,
          instanceLimit: subscription.instanceLimit,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt.toISOString(),
          updatedAt: subscription.updatedAt.toISOString(),
        },
        plans: PLANS,
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
        fastify.log.warn('Stripe webhook: Missing stripe-signature header');
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      let event;
      try {
        // Access the raw body captured by fastify-raw-body plugin
        const rawBody = (request as any).rawBody as Buffer;

        if (!rawBody) {
          fastify.log.error('Stripe webhook: rawBody not available - plugin may not be configured');
          return reply.code(400).send({ error: 'Raw body not available' });
        }

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
          fastify.log.error('Stripe webhook: STRIPE_WEBHOOK_SECRET not set');
          return reply.code(400).send({ error: 'Webhook secret not configured' });
        }

        fastify.log.info(`Stripe webhook: Verifying signature for ${rawBody.length} byte payload`);
        event = verifyWebhookSignature(rawBody, signature);
        fastify.log.info(`Stripe webhook: Received event type: ${event.type}`);
      } catch (err: any) {
        fastify.log.error({ err: err.message }, 'Stripe webhook: Signature verification failed');
        return reply.code(400).send({ error: 'Invalid signature' });
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan as PlanType | undefined;

          if (!userId) {
            break;
          }

          if (session.mode === 'subscription') {
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            // Get the price ID from the subscription items
            const priceId = subscription.items.data[0]?.price?.id;
            const resolvedPlan = plan || (priceId ? getPlanFromPriceId(priceId) : null);
            const instanceLimit = resolvedPlan ? PLANS[resolvedPlan].instanceLimit : 1;

            await prisma.subscription.upsert({
              where: { stripeSubscriptionId: subscriptionId },
              update: {
                status: subscription.status.toUpperCase() as any,
                stripePriceId: priceId,
                plan: resolvedPlan,
                instanceLimit,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              },
              create: {
                userId,
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                plan: resolvedPlan,
                instanceLimit,
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
