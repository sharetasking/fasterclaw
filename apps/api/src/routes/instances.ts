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
import {
  CreateInstanceRequestSchema,
  UpdateInstanceRequestSchema,
  InstanceSchema,
  InstanceListSchema,
  ApiErrorSchema,
  ApiSuccessSchema,
} from "@fasterclaw/shared";
import { encryptToken, decryptToken } from "../services/encryption.js";

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

// Helper to determine AI provider from model name
function getAIProvider(model: string): "openai" | "anthropic" | "google" {
  if (model.startsWith("gpt-") || model.startsWith("o1-")) {
    return "openai";
  }
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  if (model.startsWith("gemini-")) {
    return "google";
  }
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
  if (key === undefined || key === "") {
    throw new Error(
      `Missing API key for provider "${provider}". Set ${envVarNames[provider]} environment variable.`
    );
  }
  return key;
}

/**
 * Format an instance for API response with masked sensitive data.
 * Decrypts and masks the telegramBotToken to prevent exposure in API responses.
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
  encryptedTelegramBotToken: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  // Decrypt and mask the token for API response
  let maskedToken: string | null = null;
  if (instance.encryptedTelegramBotToken) {
    try {
      const decrypted = decryptToken(instance.encryptedTelegramBotToken);
      maskedToken = maskToken(decrypted);
    } catch {
      maskedToken = null;
    }
  }

  return {
    ...instance,
    telegramBotToken: maskedToken,
    encryptedTelegramBotToken: undefined, // Don't expose encrypted token in API
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}

/**
 * Fetch enabled skills for an instance
 */
async function getInstanceSkills(instanceId: string): Promise<Array<{ slug: string; content: string }>> {
  const instanceSkills = await prisma.instanceSkill.findMany({
    where: { instanceId },
    include: { skill: true },
  });

  return instanceSkills.map((is) => ({
    slug: is.skill.slug,
    content: is.skill.markdownContent,
  }));
}

/**
 * Fetch ALL user integrations and decrypt tokens.
 * This passes all connected integrations to OpenClaw regardless of enabled state.
 * Users can then choose which ones to use without recreating the instance.
 */
async function getInstanceIntegrations(userId: string): Promise<Record<string, string>> {
  const userIntegrations = await prisma.userIntegration.findMany({
    where: { userId },
    include: {
      integration: true,
    },
  });

  const integrations: Record<string, string> = {};

  for (const ui of userIntegrations) {
    const token = decryptToken(ui.encryptedAccessToken);
    integrations[ui.integration.provider] = token;
  }

  return integrations;
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
      const { name, telegramBotToken, region, aiModel } = request.body;

      // Check subscription status (Priority 1: Subscription Gating)
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
      });

      if (subscription?.status !== "ACTIVE") {
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
          error: `Instance limit reached (${String(subscription.instanceLimit)}). Please upgrade your plan or delete existing instances.`,
        });
      }

      const providerType = getProviderType();
      const provider = getProvider();

      try {
        // Encrypt sensitive data before storing
        const encryptedTelegramBotToken = encryptToken(telegramBotToken);

        // Create instance record first
        const instance = await prisma.instance.create({
          data: {
            userId,
            name,
            encryptedTelegramBotToken,
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

            // Fetch enabled skills and integrations for this instance
            const skills = await getInstanceSkills(instance.id);
            // Pass ALL user integrations to OpenClaw (not just enabled ones)
            // This allows users to enable/disable without recreating the instance
            const integrations = await getInstanceIntegrations(userId);

            // Decrypt Telegram bot token for use in container
            const decryptedTelegramToken = instance.encryptedTelegramBotToken
              ? decryptToken(instance.encryptedTelegramBotToken)
              : "";

            // Create instance using the selected provider
            const result = await provider.createInstance({
              instanceId: instance.id,
              name,
              userId,
              telegramBotToken: decryptedTelegramToken,
              aiProvider,
              aiApiKey: apiKey,
              aiModel,
              region,
              skills,
              integrations,
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

      if (!instance.encryptedTelegramBotToken) {
        return reply.code(400).send({ error: "Instance is missing Telegram bot token" });
      }

      // Decrypt telegram token for use
      const telegramBotToken = decryptToken(instance.encryptedTelegramBotToken);

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

          // Fetch skills and integrations for retry
          const skills = await getInstanceSkills(instance.id);
          const integrations = await getInstanceIntegrations(userId);

          await prisma.instance.update({
            where: { id: instance.id },
            data: { status: "PROVISIONING" },
          });

          const result = await provider.createInstance({
            instanceId: instance.id,
            name: instance.name,
            userId,
            telegramBotToken, // Decrypted above
            aiProvider,
            aiApiKey: apiKey,
            aiModel,
            region: instance.region,
            skills,
            integrations,
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
