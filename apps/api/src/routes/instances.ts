import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma, maskToken } from "@fasterclaw/db";
import {
  getProvider,
  getProviderByType,
  getProviderType,
  type ProviderType,
} from "../services/providers/index.js";
import { FlyApiError } from "../services/fly.js";
import { getAIProvider, getAPIKeyForProvider, provisionInstance } from "../services/instance-provisioner.js";
import {
  CreateInstanceRequestSchema,
  UpdateInstanceRequestSchema,
  InstanceSchema,
  InstanceListSchema,
  ApiErrorSchema,
  ApiSuccessSchema,
} from "@fasterclaw/shared";

/**
 * Extract a user-friendly error message from a caught error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FlyApiError) {
    if (error.status === 404) {
      return "Machine not found on Fly.io";
    }
    if (error.status === 422) {
      return `Invalid configuration: ${error.detail}`;
    }
    if (error.status === 429) {
      return "Rate limited by Fly.io, please try again later";
    }
    return `Fly.io error: ${error.detail}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

/**
 * Format an instance for API response with masked sensitive data.
 * Masks the telegramBotToken to prevent exposure in API responses.
 */
function formatInstanceResponse(instance: {
  id: string;
  userId: string;
  name: string;
  provider: string;
  flyAppName: string | null;
  flyMachineId: string | null;
  dockerContainerId: string | null;
  dockerPort: number | null;
  status: string;
  region: string;
  aiModel: string;
  telegramBotToken: string | null;
  ipAddress: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...instance,
    telegramBotToken: maskToken(instance.telegramBotToken),
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}

export function instanceRoutes(fastify: FastifyInstance): void {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /instances/create-default - Create a default instance for the user (if none exists)
  app.post(
    "/instances/create-default",
    {
      schema: {
        tags: ["Instances"],
        summary: "Create a default quickStart instance if the user has none",
        response: {
          201: InstanceSchema,
          200: InstanceSchema,
          401: ApiErrorSchema,
          500: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      // Check if user already has a default instance
      const existing = await prisma.instance.findFirst({
        where: { userId, isDefault: true, status: { not: "DELETED" } },
      });

      if (existing) {
        return reply.send(formatInstanceResponse(existing));
      }

      // Check if user has any instance at all
      const anyInstance = await prisma.instance.findFirst({
        where: { userId, status: { not: "DELETED" } },
      });

      if (anyInstance) {
        return reply.send(formatInstanceResponse(anyInstance));
      }

      // Create a new default instance
      try {
        const instanceId = await provisionInstance({
          userId,
          name: "My Assistant",
          quickStart: true,
          isDefault: true,
        });

        const instance = await prisma.instance.findUnique({
          where: { id: instanceId },
        });

        if (!instance) {
          return reply.code(500).send({ error: "Failed to create instance" });
        }

        return await reply.code(201).send(formatInstanceResponse(instance));
      } catch (error) {
        app.log.error(error, "Failed to create default instance");
        return reply.code(500).send({ error: "Failed to create instance" });
      }
    }
  );

  // POST /instances/validate-telegram-token - Validate a Telegram bot token
  app.post(
    "/instances/validate-telegram-token",
    {
      schema: {
        tags: ["Instances"],
        summary: "Validate a Telegram bot token",
        body: z.object({
          token: z.string().min(1, "Token is required"),
        }),
        response: {
          200: z.object({
            valid: z.boolean(),
            botUsername: z.string().optional(),
            botName: z.string().optional(),
            error: z.string().optional(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const { token } = request.body;

      try {
        // Call Telegram API to validate token
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = (await response.json()) as {
          ok: boolean;
          result?: { username: string; first_name: string };
          description?: string;
        };

        if (data.ok && data.result) {
          return await reply.send({
            valid: true,
            botUsername: data.result.username,
            botName: data.result.first_name,
          });
        } else {
          return await reply.send({
            valid: false,
            error: data.description ?? "Invalid bot token",
          });
        }
      } catch (error) {
        app.log.error(error, "Failed to validate Telegram token");
        return reply.send({
          valid: false,
          error: "Failed to connect to Telegram API",
        });
      }
    }
  );

  // POST /instances - Create a new instance
  app.post(
    "/instances",
    {
      schema: {
        tags: ["Instances"],
        summary: "Create a new OpenClaw instance",
        body: CreateInstanceRequestSchema,
        response: {
          201: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          403: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { name, telegramBotToken, region, aiModel, quickStart } = request.body;

      // Validate: quickStart mode doesn't need Telegram token
      if (quickStart && telegramBotToken !== undefined) {
        return reply.code(400).send({
          error: "Quick start mode does not require a Telegram token",
        });
      }

      // Validate: non-quickStart mode requires Telegram token
      if (!quickStart && telegramBotToken === undefined) {
        return reply.code(400).send({
          error: "Telegram bot token is required for standard mode",
        });
      }

      // Check subscription status (Priority 1: Subscription Gating)
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
      });

      if (subscription?.status !== "ACTIVE") {
        return reply.code(403).send({
          error: "Active subscription required. Please subscribe to create instances.",
        });
      }

      // Check instance limit (exclude default free instance)
      const instanceCount = await prisma.instance.count({
        where: {
          userId,
          status: { notIn: ["DELETED", "FAILED"] },
          isDefault: false,
        },
      });

      if (subscription.instanceLimit !== -1 && instanceCount >= subscription.instanceLimit) {
        return reply.code(403).send({
          error: `Instance limit reached (${String(subscription.instanceLimit)}). Please upgrade your plan or delete existing instances.`,
        });
      }

      const providerType = getProviderType();
      const provider = getProvider();

      try {
        // Create instance record first
        const instance = await prisma.instance.create({
          data: {
            userId,
            name,
            ...(telegramBotToken !== undefined && { telegramBotToken }),
            provider: providerType,
            region,
            aiModel,
            status: "CREATING",
          },
        });

        // Create instance in background
        void (async () => {
          try {
            // Determine AI provider and get API key
            const aiProvider = getAIProvider(aiModel);
            const apiKey = getAPIKeyForProvider(aiProvider);

            // Transition to PROVISIONING
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: "PROVISIONING" },
            });

            // Create instance using the selected provider
            const result = await provider.createInstance({
              name,
              userId,
              telegramBotToken: telegramBotToken ?? undefined,
              aiProvider,
              aiApiKey: apiKey,
              aiModel,
              region,
              quickStart,
            });

            // Update instance with provider-specific data
            const updateData: Record<string, unknown> = {
              ipAddress: result.ipAddress,
              status: "RUNNING",
            };

            if (providerType === "fly") {
              updateData.flyMachineId = result.providerId;
              updateData.flyAppName = result.providerAppId;
            } else {
              updateData.dockerContainerId = result.providerId;
              updateData.dockerPort = result.port;
            }

            await prisma.instance.update({
              where: { id: instance.id },
              data: updateData,
            });
          } catch (error: unknown) {
            const msg = getErrorMessage(error, "Unknown provisioning error");
            app.log.error(error, `Failed to provision instance ${instance.id}: ${msg}`);
            await prisma.instance.update({
              where: { id: instance.id },
              data: { status: "FAILED" },
            });
          }
        })();

        return await reply.code(201).send(formatInstanceResponse(instance));
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, "Failed to create instance") });
      }
    }
  );

  // GET /instances - List user's instances
  app.get(
    "/instances",
    {
      schema: {
        tags: ["Instances"],
        summary: "List all instances for the authenticated user",
        response: {
          200: InstanceListSchema,
          401: ApiErrorSchema,
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
          status: { not: "DELETED" },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(instances.map(formatInstanceResponse));
    }
  );

  // GET /instances/:id - Get instance by ID
  app.get(
    "/instances/:id",
    {
      schema: {
        tags: ["Instances"],
        summary: "Get an instance by ID",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      return reply.send(formatInstanceResponse(instance));
    }
  );

  // PATCH /instances/:id - Update an instance (must be stopped)
  app.patch(
    "/instances/:id",
    {
      schema: {
        tags: ["Instances"],
        summary: "Update an instance (must be stopped)",
        params: z.object({
          id: z.string(),
        }),
        body: UpdateInstanceRequestSchema,
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;
      const updates = request.body;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // Only allow updates when instance is stopped
      if (instance.status !== "STOPPED") {
        return reply.code(400).send({
          error: "Instance must be stopped before updating configuration",
        });
      }

      const updatedInstance = await prisma.instance.update({
        where: { id },
        data: {
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.telegramBotToken !== undefined && { telegramBotToken: updates.telegramBotToken }),
          ...(updates.aiModel !== undefined && { aiModel: updates.aiModel }),
        },
      });

      return reply.send(formatInstanceResponse(updatedInstance));
    }
  );

  // POST /instances/:id/start - Start an instance
  app.post(
    "/instances/:id/start",
    {
      schema: {
        tags: ["Instances"],
        summary: "Start a stopped instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      if (instance.status !== "STOPPED") {
        return reply.code(400).send({ error: "Instance is not stopped" });
      }

      // Get provider based on instance's stored provider type
      const provider = getProviderByType(instance.provider as ProviderType);

      // Check for required provider data
      if (instance.provider === "fly") {
        if (instance.flyMachineId === null || instance.flyAppName === null) {
          return reply.code(400).send({ error: "No machine ID or app name found" });
        }
      } else if (instance.provider === "docker") {
        if (instance.dockerContainerId === null) {
          return reply.code(400).send({ error: "No Docker container ID found" });
        }
      }

      try {
        await provider.startInstance({
          flyMachineId: instance.flyMachineId,
          flyAppName: instance.flyAppName,
          dockerContainerId: instance.dockerContainerId,
          dockerPort: instance.dockerPort,
        });

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "RUNNING" },
        });

        return await reply.send(formatInstanceResponse(updatedInstance));
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, "Failed to start instance") });
      }
    }
  );

  // POST /instances/:id/stop - Stop an instance
  app.post(
    "/instances/:id/stop",
    {
      schema: {
        tags: ["Instances"],
        summary: "Stop a running instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      if (instance.status !== "RUNNING") {
        return reply.code(400).send({ error: "Instance is not running" });
      }

      // Get provider based on instance's stored provider type
      const provider = getProviderByType(instance.provider as ProviderType);

      // Check for required provider data
      if (instance.provider === "fly") {
        if (instance.flyMachineId === null || instance.flyAppName === null) {
          return reply.code(400).send({ error: "No machine ID or app name found" });
        }
      } else if (instance.provider === "docker") {
        if (instance.dockerContainerId === null) {
          return reply.code(400).send({ error: "No Docker container ID found" });
        }
      }

      try {
        await provider.stopInstance({
          flyMachineId: instance.flyMachineId,
          flyAppName: instance.flyAppName,
          dockerContainerId: instance.dockerContainerId,
          dockerPort: instance.dockerPort,
        });

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "STOPPED" },
        });

        return await reply.send(formatInstanceResponse(updatedInstance));
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, "Failed to stop instance") });
      }
    }
  );

  // POST /instances/:id/retry - Retry a failed instance
  app.post(
    "/instances/:id/retry",
    {
      schema: {
        tags: ["Instances"],
        summary: "Retry provisioning a failed instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      if (instance.status !== "FAILED") {
        return reply.code(400).send({ error: "Only failed instances can be retried" });
      }

      if (instance.telegramBotToken === null) {
        return reply.code(400).send({ error: "Instance is missing Telegram bot token" });
      }

      const validatedToken = instance.telegramBotToken;

      // Use current provider from env (allows switching providers on retry)
      const providerType = getProviderType();
      const provider = getProvider();

      // Reset instance status and update provider
      const updatedInstance = await prisma.instance.update({
        where: { id: instance.id },
        data: {
          status: "CREATING",
          provider: providerType,
          // Clear old provider-specific data
          flyMachineId: null,
          flyAppName: null,
          dockerContainerId: null,
          dockerPort: null,
          ipAddress: null,
        },
      });

      // Re-provision in background
      void (async () => {
        try {
          const aiModel = instance.aiModel;
          const aiProvider = getAIProvider(aiModel);
          const apiKey = getAPIKeyForProvider(aiProvider);

          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: "PROVISIONING" },
          });

          const result = await provider.createInstance({
            name: instance.name,
            userId,
            telegramBotToken: validatedToken,
            aiProvider,
            aiApiKey: apiKey,
            aiModel,
            region: instance.region,
          });

          const updateData: Record<string, unknown> = {
            ipAddress: result.ipAddress,
            status: "RUNNING",
          };

          if (providerType === "fly") {
            updateData.flyMachineId = result.providerId;
            updateData.flyAppName = result.providerAppId;
          } else {
            updateData.dockerContainerId = result.providerId;
            updateData.dockerPort = result.port;
          }

          await prisma.instance.update({
            where: { id: instance.id },
            data: updateData,
          });
        } catch (error: unknown) {
          const msg = getErrorMessage(error, "Unknown provisioning error");
          app.log.error(error, `Failed to retry instance ${instance.id}: ${msg}`);
          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: "FAILED" },
          });
        }
      })();

      return await reply.send(formatInstanceResponse(updatedInstance));
    }
  );

  // POST /instances/:id/sync - Sync instance status from provider
  app.post(
    "/instances/:id/sync",
    {
      schema: {
        tags: ["Instances"],
        summary: "Sync instance status from provider",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: InstanceSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // Check if we have provider data to sync
      const hasFlyData = instance.flyAppName !== null && instance.flyMachineId !== null;
      const hasDockerData = instance.dockerContainerId !== null;

      if (!hasFlyData && !hasDockerData) {
        return reply.send(formatInstanceResponse(instance));
      }

      // Get provider based on instance's stored provider type
      const provider = getProviderByType(instance.provider as ProviderType);

      try {
        const newStatus = await provider.getInstanceStatus({
          flyMachineId: instance.flyMachineId,
          flyAppName: instance.flyAppName,
          dockerContainerId: instance.dockerContainerId,
          dockerPort: instance.dockerPort,
        });

        const updatedInstance = await prisma.instance.update({
          where: { id: instance.id },
          data: { status: newStatus },
        });

        return await reply.send(formatInstanceResponse(updatedInstance));
      } catch (error) {
        app.log.error(error, `Failed to sync status for instance ${id}`);
        return reply
          .code(400)
          .send({ error: getErrorMessage(error, "Failed to sync instance status") });
      }
    }
  );

  // DELETE /instances/:id - Delete an instance
  app.delete(
    "/instances/:id",
    {
      schema: {
        tags: ["Instances"],
        summary: "Delete an instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: ApiSuccessSchema,
          400: ApiErrorSchema,
          401: ApiErrorSchema,
          404: ApiErrorSchema,
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

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // Get provider based on instance's stored provider type
      const provider = getProviderByType(instance.provider as ProviderType);

      try {
        // Delete instance from provider
        await provider.deleteInstance({
          flyMachineId: instance.flyMachineId,
          flyAppName: instance.flyAppName,
          dockerContainerId: instance.dockerContainerId,
          dockerPort: instance.dockerPort,
        });

        // Mark instance as deleted
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: "DELETED" },
        });

        return await reply.send({ success: true });
      } catch (error) {
        app.log.error(error);
        return reply.code(400).send({ error: getErrorMessage(error, "Failed to delete instance") });
      }
    }
  );
}

/**
 * Background job: sync all non-terminal instance statuses from their providers.
 * Call this on an interval (e.g. every 60s) after the server starts.
 */
export async function syncAllInstanceStatuses(log?: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}): Promise<void> {
  const activeStatuses = ["CREATING", "PROVISIONING", "RUNNING", "STARTING", "STOPPING"];

  const instances = await prisma.instance.findMany({
    where: {
      status: { in: activeStatuses },
      OR: [
        { flyAppName: { not: null }, flyMachineId: { not: null } },
        { dockerContainerId: { not: null } },
      ],
    },
  });

  for (const instance of instances) {
    const hasFlyData = instance.flyAppName !== null && instance.flyMachineId !== null;
    const hasDockerData = instance.dockerContainerId !== null;

    if (!hasFlyData && !hasDockerData) {
      continue;
    }

    // Get provider based on instance's stored provider type
    const provider = getProviderByType(instance.provider as ProviderType);

    try {
      const newStatus = await provider.getInstanceStatus({
        flyMachineId: instance.flyMachineId,
        flyAppName: instance.flyAppName,
        dockerContainerId: instance.dockerContainerId,
        dockerPort: instance.dockerPort,
      });

      if (newStatus !== instance.status) {
        await prisma.instance.update({
          where: { id: instance.id },
          data: { status: newStatus },
        });
        log?.info(`Synced instance ${instance.id}: ${instance.status} -> ${newStatus}`);
      }
    } catch (error) {
      log?.error(`Failed to sync instance ${instance.id}: ${String(error)}`);
    }
  }
}

export default instanceRoutes;
