import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma, maskToken } from "@fasterclaw/db";
import { getProvider, getProviderType } from "../services/providers/index.js";
import { FlyApiError } from "../services/fly.js";
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
    if (error.status === 404) return "Machine not found on Fly.io";
    if (error.status === 422) return `Invalid configuration: ${error.detail}`;
    if (error.status === 429) return "Rate limited by Fly.io, please try again later";
    return `Fly.io error: ${error.detail}`;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// Helper to determine AI provider from model name
function getAIProvider(model: string): "openai" | "anthropic" | "google" {
  if (model.startsWith("gpt-") || model.startsWith("o1-")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "google";
  return "anthropic"; // default to anthropic for OpenClaw
}

// Helper to get the correct API key for the provider
function getAPIKeyForProvider(provider: "openai" | "anthropic" | "google"): string {
  const keys: Record<typeof provider, string | undefined> = {
    openai: process.env.OPENAI_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GEMINI_API_KEY,
  };

  const envVarNames: Record<typeof provider, string> = {
    openai: "OPENAI_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GEMINI_API_KEY",
  };

  const key = keys[provider];
  if (!key) {
    throw new Error(
      `Missing API key for provider "${provider}". Set ${envVarNames[provider]} environment variable.`
    );
  }
  return key;
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
          return reply.send({
            valid: true,
            botUsername: data.result.username,
            botName: data.result.first_name,
          });
        } else {
          return reply.send({
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
      const { name, telegramBotToken, region, aiModel } = request.body;

      // Check subscription status (Priority 1: Subscription Gating)
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
      });

      if (!subscription || subscription.status !== "ACTIVE") {
        return reply.code(403).send({
          error: "Active subscription required. Please subscribe to create instances.",
        });
      }

      // Check instance limit
      const instanceCount = await prisma.instance.count({
        where: {
          userId,
          status: { notIn: ["DELETED", "FAILED"] },
        },
      });

      if (subscription.instanceLimit !== -1 && instanceCount >= subscription.instanceLimit) {
        return reply.code(403).send({
          error: `Instance limit reached (${subscription.instanceLimit}). Please upgrade your plan or delete existing instances.`,
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
            telegramBotToken,
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
              telegramBotToken,
              aiProvider,
              aiApiKey: apiKey,
              aiModel,
              region,
            });

            // Update instance with provider-specific data
            const updateData: Record<string, unknown> = {
              ipAddress: result.ipAddress,
              status: "RUNNING",
            };

            if (providerType === "fly") {
              updateData.flyMachineId = result.providerId;
              updateData.flyAppName = result.providerAppId;
            } else if (providerType === "docker") {
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
        data: updates,
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

      // Get provider based on instance's provider field
      const provider = getProvider();

      // Check for required provider data
      if (instance.provider === "fly") {
        if (!instance.flyMachineId || !instance.flyAppName) {
          return reply.code(400).send({ error: "No machine ID or app name found" });
        }
      } else if (instance.provider === "docker") {
        if (!instance.dockerContainerId) {
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

      const provider = getProvider();

      // Check for required provider data
      if (instance.provider === "fly") {
        if (!instance.flyMachineId || !instance.flyAppName) {
          return reply.code(400).send({ error: "No machine ID or app name found" });
        }
      } else if (instance.provider === "docker") {
        if (!instance.dockerContainerId) {
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

      if (!instance) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // Check if we have provider data to sync
      const hasFlyData = instance.flyAppName && instance.flyMachineId;
      const hasDockerData = instance.dockerContainerId;

      if (!hasFlyData && !hasDockerData) {
        return reply.send(formatInstanceResponse(instance));
      }

      const provider = getProvider();

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

        return reply.send(formatInstanceResponse(updatedInstance));
      } catch (error) {
        app.log.error(error, `Failed to sync status for instance ${id}`);
        return reply.code(400).send({ error: getErrorMessage(error, "Failed to sync instance status") });
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

      const provider = getProvider();

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
export async function syncAllInstanceStatuses(
  log?: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
): Promise<void> {
  const activeStatuses = ["CREATING", "PROVISIONING", "RUNNING", "STARTING", "STOPPING"];
  const provider = getProvider();

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
    const hasFlyData = instance.flyAppName && instance.flyMachineId;
    const hasDockerData = instance.dockerContainerId;

    if (!hasFlyData && !hasDockerData) continue;

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
