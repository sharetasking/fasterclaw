import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "@fasterclaw/db";
import {
  stripe,
  getOrCreateStripeCustomer,
  verifyWebhookSignature,
  PLANS,
  getPlanFromPriceId,
  getPriceIdForPlan,
  type PlanType,
} from "../services/stripe.js";
import {
  CreateCheckoutRequestSchema,
  CheckoutResponseSchema,
  PortalResponseSchema,
  SubscriptionResponseSchema,
  InvoiceListSchema,
  WebhookResponseSchema,
  ApiErrorSchema,
} from "@fasterclaw/shared";

export function billingRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /billing/checkout - Create Stripe Checkout session
  app.post(
    "/billing/checkout",
    {
      schema: {
        tags: ["Billing"],
        summary: "Create Stripe Checkout session for subscription",
        body: CreateCheckoutRequestSchema,
        response: {
          200: CheckoutResponseSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          500: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { plan } = request.body;

      const priceId = getPriceIdForPlan(plan);
      if (priceId === "") {
        return reply.code(400).send({
          error: `No price ID configured for plan: ${plan}. Please set STRIPE_PRICE_ID_${plan.toUpperCase()} environment variable.`,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user === null) {
        return reply.code(401).send({ error: "User not found" });
      }

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(
        userId,
        user.email,
        user.name ?? undefined
      );

      const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

      // Create subscription checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
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

      if (session.url === null) {
        return reply.code(500).send({ error: "Failed to create checkout session" });
      }

      return { url: session.url };
    }
  );

  // POST /billing/portal - Create Stripe Customer Portal session
  app.post(
    "/billing/portal",
    {
      schema: {
        tags: ["Billing"],
        summary: "Create Stripe Customer Portal session",
        response: {
          200: PortalResponseSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
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

      if (user?.stripeCustomerId === null || user?.stripeCustomerId === undefined) {
        return reply.code(400).send({ error: "No Stripe customer found" });
      }

      const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/dashboard/billing`,
      });

      return { url: session.url };
    }
  );

  // GET /billing/invoices - Get invoice history
  app.get(
    "/billing/invoices",
    {
      schema: {
        tags: ["Billing"],
        summary: "Get invoice history from Stripe",
        response: {
          200: InvoiceListSchema,
          401: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, _reply) => {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (user?.stripeCustomerId === null || user?.stripeCustomerId === undefined) {
        return [];
      }

      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });

      return invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        status: invoice.status ?? "unknown",
        createdAt: new Date(invoice.created * 1000).toISOString(),
        paidAt:
          invoice.status_transitions.paid_at !== null
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
            : null,
        invoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      }));
    }
  );

  // GET /billing/subscription - Get current subscription status
  app.get(
    "/billing/subscription",
    {
      schema: {
        tags: ["Billing"],
        summary: "Get current subscription status",
        response: {
          200: SubscriptionResponseSchema,
          401: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, _reply) => {
      const userId = request.user.id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (subscription === null) {
        return {
          subscription: null,
          plans: PLANS,
        };
      }

      // Get plan from stripePriceId or fall back to stored plan
      const plan =
        subscription.stripePriceId !== null
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
    "/billing/webhook",
    {
      schema: {
        tags: ["Billing"],
        summary: "Handle Stripe webhook events",
        response: {
          200: WebhookResponseSchema,
          400: ApiErrorSchema,
        },
      },
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const signature = request.headers["stripe-signature"] as string;

      if (signature === "") {
        return reply.code(400).send({ error: "Missing stripe-signature header" });
      }

      let event;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const rawBody = (request as any).rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
        event = verifyWebhookSignature(rawBody as Buffer, signature);
      } catch {
        return reply.code(400).send({ error: "Invalid signature" });
      }

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          const session = event.data.object as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const userId = session.metadata?.userId;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const plan = session.metadata?.plan as PlanType | undefined;

          if (userId === undefined || userId === null || userId === "") {
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (session.mode === "subscription") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            // Get the price ID from the subscription items
            const priceId = subscription.items.data[0]?.price?.id;
            const resolvedPlan = plan ?? (priceId ? getPlanFromPriceId(priceId) : null);
            const instanceLimit = resolvedPlan ? PLANS[resolvedPlan].instanceLimit : 1;

            await prisma.subscription.upsert({
              where: { stripeSubscriptionId: subscriptionId },
              update: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                status: subscription.status.toUpperCase() as any,
                stripePriceId: priceId,
                plan: resolvedPlan,
                instanceLimit,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
              create: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                userId,
                stripeCustomerId: subscription.customer as string,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                plan: resolvedPlan,
                instanceLimit,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                status: subscription.status.toUpperCase() as any,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });
          }
          break;
        }

        case "customer.subscription.updated": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          const subscription = event.data.object as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const subscriptionId = subscription.id;

          await prisma.subscription.updateMany({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
              status: subscription.status.toUpperCase(),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
          break;
        }

        case "customer.subscription.deleted": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          const subscription = event.data.object as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const subscriptionId = subscription.id;

          await prisma.subscription.updateMany({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "CANCELED",
            },
          });
          break;
        }

        case "invoice.payment_succeeded": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          const invoice = event.data.object as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const subscriptionId = invoice.subscription;

          if (subscriptionId !== undefined && subscriptionId !== null && subscriptionId !== "") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await prisma.subscription.updateMany({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              where: { stripeSubscriptionId: subscriptionId },
              data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                status: subscription.status.toUpperCase() as any,
              },
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          const invoice = event.data.object as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const subscriptionId = invoice.subscription;

          if (subscriptionId !== undefined && subscriptionId !== null && subscriptionId !== "") {
            await prisma.subscription.updateMany({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              where: { stripeSubscriptionId: subscriptionId },
              data: {
                status: "PAST_DUE",
              },
            });
          }
          break;
        }

        default:
          // Unknown event type
          break;
      }

      return { received: true };
    }
  );
}

export default billingRoutes;
