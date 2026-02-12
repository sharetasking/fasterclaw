import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import { getProviderByType, type ProviderType } from "../services/providers/index.js";

/**
 * Validate the instance for chat: must exist, be owned by user, and RUNNING.
 * Returns the instance or sends an error reply and returns null.
 */
async function validateChatInstance(
  userId: string,
  instanceId: string,
  reply: any,
) {
  const instance = await prisma.instance.findFirst({
    where: { id: instanceId, userId },
  });

  if (instance === null) {
    reply.code(404).send({ error: "Instance not found" });
    return null;
  }

  if (instance.status !== "RUNNING") {
    reply.code(400).send({
      error: `Instance is not running. Current status: ${instance.status}`,
    });
    return null;
  }

  return instance;
}

/**
 * Chat routes for communicating with OpenClaw instances via the provider abstraction.
 * Works with both Docker (development) and Fly.io (production) providers.
 */
export function chatRoutes(fastify: FastifyInstance): void {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /instances/:id/chat - Send a message to an OpenClaw instance
  app.post(
    "/instances/:id/chat",
    {
      schema: {
        tags: ["Chat"],
        summary: "Send a message to an OpenClaw instance",
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          message: z.string().min(1, "Message is required"),
          filePath: z.string().optional(),
        }),
        response: {
          200: z.object({
            response: z.string(),
          }),
          400: z.object({
            error: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
          404: z.object({
            error: z.string(),
          }),
          500: z.object({
            error: z.string(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params;
      const { message, filePath } = request.body;

      const instance = await validateChatInstance(userId, id, reply);
      if (instance === null) return;

      try {
        const provider = getProviderByType(instance.provider as ProviderType);
        const sessionId = `web-${userId}-${id}`;

        // If a file was uploaded, prepend the file path info to the message
        const fullMessage = filePath
          ? `[Attached file: ${filePath}]\n\n${message}`
          : message;

        const result = await provider.sendMessage(
          {
            flyMachineId: instance.flyMachineId,
            flyAppName: instance.flyAppName,
            dockerContainerId: instance.dockerContainerId,
            dockerPort: instance.dockerPort,
          },
          sessionId,
          fullMessage,
        );

        return await reply.send({ response: result.response });
      } catch (error) {
        app.log.error(error, `Failed to send chat message to instance ${id}`);
        return reply.code(500).send({
          error: "Failed to communicate with OpenClaw instance",
        });
      }
    }
  );

  // POST /instances/:id/chat/upload - Upload a file to the instance
  app.post(
    "/instances/:id/chat/upload",
    {
      schema: {
        tags: ["Chat"],
        summary: "Upload a file to an OpenClaw instance for use in chat",
        params: z.object({
          id: z.string(),
        }),
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { id } = request.params as { id: string };

      const instance = await validateChatInstance(userId, id, reply);
      if (instance === null) return;

      try {
        const file = await request.file();
        if (!file) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

        // Read the file into a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of file.file) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        if (fileBuffer.length === 0) {
          return reply.code(400).send({ error: "Empty file" });
        }

        const provider = getProviderByType(instance.provider as ProviderType);
        const result = await provider.uploadFile(
          {
            flyMachineId: instance.flyMachineId,
            flyAppName: instance.flyAppName,
            dockerContainerId: instance.dockerContainerId,
            dockerPort: instance.dockerPort,
          },
          fileBuffer,
          file.filename,
        );

        return await reply.send({
          filePath: result.filePath,
          fileName: file.filename,
          fileSize: fileBuffer.length,
          mimeType: file.mimetype,
        });
      } catch (error) {
        app.log.error(error, `Failed to upload file for instance ${id}`);
        return reply.code(500).send({
          error: "Failed to upload file to instance",
        });
      }
    }
  );

  // GET /instances/:id/chat/history - Get chat history
  app.get(
    "/instances/:id/chat/history",
    {
      schema: {
        tags: ["Chat"],
        summary: "Get chat history for an instance",
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
              timestamp: z.string().datetime(),
            })
          ),
          401: z.object({
            error: z.string(),
          }),
          404: z.object({
            error: z.string(),
          }),
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

      // For now, return empty history (can be extended to store chat history in DB)
      return reply.send([]);
    }
  );
}
