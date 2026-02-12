import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@fasterclaw/db";

const execFileAsync = promisify(execFile);

interface OpenClawAgentResponse {
  payloads: { text: string; mediaUrl: string | null }[];
  meta: {
    durationMs: number;
    agentMeta: {
      sessionId: string;
      provider: string;
      model: string;
    };
  };
}

/**
 * Send a message to an OpenClaw Docker container via the agent CLI.
 * Uses `docker exec <containerId> node openclaw.mjs agent --local ...`
 *
 * The agent may write diagnostic warnings to stderr (e.g. "Channel is required")
 * even when it produces a valid JSON response on stdout. We handle this by
 * catching the exec error and still attempting to parse stdout.
 */
async function sendToOpenClaw(
  dockerContainerId: string,
  sessionId: string,
  message: string,
  timeoutSeconds = 120,
): Promise<string> {
  const args = [
    "exec",
    dockerContainerId,
    "node",
    "openclaw.mjs",
    "agent",
    "--local",
    "--session-id",
    sessionId,
    "--message",
    message,
    "--json",
    "--timeout",
    String(timeoutSeconds),
  ];

  let stdout: string;
  try {
    const result = await execFileAsync("docker", args, {
      timeout: (timeoutSeconds + 10) * 1000,
      maxBuffer: 10 * 1024 * 1024, // 10 MB for large JSON responses
    });
    stdout = result.stdout;
  } catch (error: unknown) {
    // execFileAsync throws if the process exits non-zero OR writes to stderr.
    // The agent often writes diagnostic warnings to stderr but still produces
    // a valid JSON response on stdout. Try to extract stdout from the error.
    const execError = error as { stdout?: string; killed?: boolean; signal?: string };
    if (execError.stdout?.includes('"payloads"') === true) {
      stdout = execError.stdout;
    } else {
      throw error;
    }
  }

  const parsed = JSON.parse(stdout) as OpenClawAgentResponse;

  if (parsed.payloads.length === 0) {
    return "No response from assistant";
  }

  return parsed.payloads.map((p) => p.text).join("\n");
}

/**
 * Chat routes for communicating with OpenClaw instances via CLI agent
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
      const { message } = request.body;

      // Get instance and verify ownership
      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // Only allow chat for running instances
      if (instance.status !== "RUNNING") {
        return reply.code(400).send({
          error: `Instance is not running. Current status: ${instance.status}`,
        });
      }

      // Only allow chat for Docker instances
      if (instance.provider !== "docker" || instance.dockerContainerId === null) {
        return reply.code(400).send({
          error: "Chat is only available for Docker instances",
        });
      }

      try {
        // Use a stable session ID based on user + instance so conversation persists
        const sessionId = `web-${userId}-${id}`;

        const responseText = await sendToOpenClaw(
          instance.dockerContainerId,
          sessionId,
          message,
        );

        return await reply.send({ response: responseText });
      } catch (error) {
        app.log.error(error, `Failed to send chat message to instance ${id}`);
        return reply.code(500).send({
          error: "Failed to communicate with OpenClaw instance",
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

      // Get instance and verify ownership
      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (instance === null) {
        return reply.code(404).send({ error: "Instance not found" });
      }

      // For now, return empty history (can be extended to store chat history in DB)
      return reply.send([]);
    }
  );
}



