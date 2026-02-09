import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '@fasterclaw/db';
import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
  getMachine,
  FlyApiError,
} from '../services/fly.js';

/**
 * Extract a user-friendly error message from a caught error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FlyApiError) {
    if (error.status === 404) return 'Machine not found on Fly.io';
    if (error.status === 422) return `Invalid configuration: ${error.detail}`;
    if (error.status === 429) return 'Rate limited by Fly.io, please try again later';
    return `Fly.io error: ${error.detail}`;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Map Fly.io machine state to our instance status.
 * Fly states: created, started, stopping, stopped, replacing, destroyed, suspended
 */
function mapFlyState(flyState: string): string {
  switch (flyState) {
    case 'started':
      return 'RUNNING';
    case 'stopped':
    case 'suspended':
      return 'STOPPED';
    case 'destroyed':
      return 'DELETED';
    case 'created':
    case 'replacing':
    case 'stopping':
      return 'CREATING';
    default:
      return 'UNKNOWN';
  }
}

// Helper to determine AI provider from model name
function getAIProvider(model: string): 'openai' | 'anthropic' | 'google' {
  if (model.startsWith('gpt-') || model.startsWith('o1-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return 'anthropic'; // default to anthropic for OpenClaw
}

// Helper to get the correct API key for the provider
function getAPIKeyForProvider(provider: 'openai' | 'anthropic' | 'google'): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'google':
      return process.env.GEMINI_API_KEY || '';
  }
}

// Zod schemas for request/response validation
const createInstanceSchema = z.object({
  name: z.string().min(1).max(50),
  telegramBotToken: z.string().min(1, 'Telegram bot token is required'),
  region: z.string().default('lax'),
  aiModel: z.string().default('claude-sonnet-4'),
});

const instanceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  flyAppName: z.string().nullable(),
  flyMachineId: z.string().nullable(),
  status: z.string(),
  region: z.string(),
  aiModel: z.string(),
  ipAddress: z.string().nullable(),
  telegramBotToken: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const instanceListSchema = z.array(instanceSchema);

export async function instanceRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /instances - Create a new instance
  app.post(
    '/instances',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Create a new OpenClaw instance',
        body: createInstanceSchema,
        response: {
          201: instanceSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { name, telegramBotToken, region, aiModel } = request.body;

      // Check subscription status (Priority 1: Subscription Gating)
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        return reply.code(403).send({
          error: 'Active subscription required. Please subscribe to create instances.'
        });
      }

      // Check instance limit
      const instanceCount = await prisma.instance.count({
        where: {
          userId,
          status: { notIn: ['DELETED', 'FAILED'] },
        },
      });

      if (subscription.instanceLimit !== -1 && instanceCount >= subscription.instanceLimit) {
        return reply.code(403).send({
          error: `Instance limit reached (${subscription.instanceLimit}). Please upgrade your plan or delete existing instances.`
        });
      }

      // Generate unique Fly app name
      const flyAppName = `openclaw-${userId.slice(0, 8)}-${Date.now()}`.toLowerCase();

      try {
        // Create instance record first
        const instance = await prisma.instance.create({
          data: {
            userId,
            name,
            telegramBotToken,
            flyAppName,
            region,
            aiModel,
            status: 'CREATING',
          },
        });

        // Create Fly app and machine in background
        (async () => {
          try {
            // Determine AI provider and get API key (Priority 1: Multi-provider support)
            const aiProvider = getAIProvider(aiModel);
            const apiKey = getAPIKeyForProvider(aiProvider);

            // Step 1: Create Fly app
            await createApp(flyAppName);

            // Step 2: Transition to PROVISIONING
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: 'PROVISIONING' },
            });

            // Step 3: Create machine with all required env vars (Priority 1: Fly.io config)
            const machine = await createMachine(flyAppName, {
              region,
              config: {
                image: 'ghcr.io/openclaw/openclaw:latest',
                env: {
                  TELEGRAM_BOT_TOKEN: telegramBotToken,
                  // Pass the correct API key based on provider
                  ...(aiProvider === 'openai' && { OPENAI_API_KEY: apiKey }),
                  ...(aiProvider === 'anthropic' && { ANTHROPIC_API_KEY: apiKey }),
                  ...(aiProvider === 'google' && { GOOGLE_API_KEY: apiKey }),
                  AI_MODEL: aiModel,
                  AI_PROVIDER: aiProvider,
                },
                services: [
                  {
                    ports: [
                      {
                        port: 80,
                        handlers: ['http'],
                      },
                      {
                        port: 443,
                        handlers: ['tls', 'http'],
                      },
                    ],
                    protocol: 'tcp',
                    internal_port: 8080,
                  },
                ],
              },
            });

            // Step 4: Machine created, mark as RUNNING
            await prisma.instance.update({
              where: { id: instance.id },
              data: {
                flyMachineId: machine.id,
                ipAddress: machine.private_ip,
                status: 'RUNNING',
              },
            });
          } catch (error) {
            const msg = getErrorMessage(error, 'Unknown provisioning error');
            app.log.error(error, `Failed to provision instance ${instance.id}: ${msg}`);
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: 'FAILED' },
            });
          }
        })();

        return reply.code(201).send({
          ...instance,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, 'Failed to create instance') });
      }
    }
  );

  // GET /instances - List user's instances
  app.get(
    '/instances',
    {
      schema: {
        tags: ['Instances'],
        summary: 'List all instances for the authenticated user',
        response: {
          200: instanceListSchema,
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const instances = await prisma.instance.findMany({
        where: {
          userId,
          status: { not: 'DELETED' },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(
        instances.map((instance) => ({
          ...instance,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        }))
      );
    }
  );

  // GET /instances/:id - Get instance by ID
  app.get(
    '/instances/:id',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Get an instance by ID',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: instanceSchema,
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return reply.code(404).send({ error: 'Instance not found' });
      }

      return reply.send({
        ...instance,
        createdAt: instance.createdAt.toISOString(),
        updatedAt: instance.updatedAt.toISOString(),
      });
    }
  );

  // POST /instances/:id/start - Start an instance
  app.post(
    '/instances/:id/start',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Start a stopped instance',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: instanceSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return reply.code(404).send({ error: 'Instance not found' });
      }

      if (instance.status !== 'STOPPED') {
        return reply.code(400).send({ error: 'Instance is not stopped' });
      }

      if (!instance.flyMachineId || !instance.flyAppName) {
        return reply.code(400).send({ error: 'No machine ID or app name found' });
      }

      try {
        await startMachine(instance.flyAppName, instance.flyMachineId);

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'RUNNING' },
        });

        return reply.send({
          ...updatedInstance,
          createdAt: updatedInstance.createdAt.toISOString(),
          updatedAt: updatedInstance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, 'Failed to start instance') });
      }
    }
  );

  // POST /instances/:id/stop - Stop an instance
  app.post(
    '/instances/:id/stop',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Stop a running instance',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: instanceSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return reply.code(404).send({ error: 'Instance not found' });
      }

      if (instance.status !== 'RUNNING') {
        return reply.code(400).send({ error: 'Instance is not running' });
      }

      if (!instance.flyMachineId || !instance.flyAppName) {
        return reply.code(400).send({ error: 'No machine ID or app name found' });
      }

      try {
        await stopMachine(instance.flyAppName, instance.flyMachineId);

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'STOPPED' },
        });

        return reply.send({
          ...updatedInstance,
          createdAt: updatedInstance.createdAt.toISOString(),
          updatedAt: updatedInstance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, 'Failed to stop instance') });
      }
    }
  );

  // POST /instances/:id/sync - Sync instance status from Fly.io (Priority 2: Status sync)
  app.post(
    '/instances/:id/sync',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Sync instance status from Fly.io',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: instanceSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: { id, userId },
      });

      if (!instance) {
        return reply.code(404).send({ error: 'Instance not found' });
      }

      if (!instance.flyAppName || !instance.flyMachineId) {
        return reply.send({
          ...instance,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        });
      }

      try {
        const machine = await getMachine(instance.flyAppName, instance.flyMachineId);
        const newStatus = mapFlyState(machine.state);

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: newStatus },
        });

        return reply.send({
          ...updatedInstance,
          createdAt: updatedInstance.createdAt.toISOString(),
          updatedAt: updatedInstance.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error, `Failed to sync status for instance ${id}`);
        return reply.code(400).send({ error: getErrorMessage(error, 'Failed to sync instance status') });
      }
    }
  );

  // DELETE /instances/:id - Delete an instance
  app.delete(
    '/instances/:id',
    {
      schema: {
        tags: ['Instances'],
        summary: 'Delete an instance',
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return reply.code(404).send({ error: 'Instance not found' });
      }

      try {
        // Delete Fly machine and app if they exist
        if (instance.flyAppName) {
          if (instance.flyMachineId) {
            await deleteMachine(instance.flyAppName, instance.flyMachineId);
          }
          await deleteApp(instance.flyAppName);
        }

        // Mark instance as deleted
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: 'DELETED' },
        });

        return reply.send({ success: true });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, 'Failed to delete instance') });
      }
    }
  );
}

/**
 * Background job: sync all non-terminal instance statuses from Fly.io.
 * Call this on an interval (e.g. every 60s) after the server starts.
 */
export async function syncAllInstanceStatuses(
  log?: { info: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<void> {
  const activeStatuses = ['CREATING', 'PROVISIONING', 'RUNNING', 'STARTING', 'STOPPING'];

  const instances = await prisma.instance.findMany({
    where: {
      status: { in: activeStatuses },
      flyAppName: { not: null },
      flyMachineId: { not: null },
    },
  });

  for (const instance of instances) {
    if (!instance.flyAppName || !instance.flyMachineId) continue;

    try {
      const machine = await getMachine(instance.flyAppName, instance.flyMachineId);
      const newStatus = mapFlyState(machine.state);

      if (newStatus !== instance.status) {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: newStatus },
        });
        log?.info(`Synced instance ${instance.id}: ${instance.status} -> ${newStatus}`);
      }
    } catch (error) {
      log?.error(`Failed to sync instance ${instance.id}: ${error}`);
    }
  }
}

export default instanceRoutes;
