/**
 * Integration Proxy Routes
 *
 * Secure proxy for external API calls (Slack, GitHub, etc.)
 * Tokens never leave this server - they are decrypted only for the API call.
 *
 * How it works:
 * 1. Bot sends request to our proxy with instanceId
 * 2. We look up the encrypted token from database
 * 3. Decrypt token, make the real API call
 * 4. Return response to bot
 *
 * This is bank-level security - plain text tokens never leave our server.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import { decryptToken } from "../services/encryption.js";

// Request schema for proxy calls
const ProxyRequestSchema = z.object({
  instanceId: z.string().cuid(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  endpoint: z.string(), // e.g., "conversations.list" for Slack or "user/repos" for GitHub
  params: z.record(z.string()).optional(), // Query params
  body: z.any().optional(), // Request body for POST/PUT/PATCH
});

// Response schema
const ProxyResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

/**
 * Get decrypted token for an instance's integration
 */
async function getTokenForInstance(
  instanceId: string,
  provider: string
): Promise<string | null> {
  const instanceIntegration = await prisma.instanceIntegration.findFirst({
    where: {
      instanceId,
      userIntegration: {
        integration: {
          provider,
        },
      },
    },
    include: {
      userIntegration: true,
    },
  });

  if (!instanceIntegration) {
    return null;
  }

  return decryptToken(instanceIntegration.userIntegration.encryptedAccessToken);
}

/**
 * Make a proxied request to Slack API
 */
async function proxySlackRequest(
  token: string,
  method: string,
  endpoint: string,
  params?: Record<string, string>,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = "https://slack.com/api";
  let url = `${baseUrl}/${endpoint}`;

  // Add query params for GET requests
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = (await response.json()) as { ok?: boolean; error?: string; [key: string]: unknown };

    // Slack uses { ok: true/false } pattern
    if (data.ok === false) {
      return { success: false, error: (data.error as string) || "Slack API error" };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Make a proxied request to GitHub API
 */
async function proxyGitHubRequest(
  token: string,
  method: string,
  endpoint: string,
  params?: Record<string, string>,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = "https://api.github.com";
  let url = `${baseUrl}/${endpoint}`;

  // Add query params
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "FasterClaw-Proxy",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return { success: true, data: null };
    }

    const data = (await response.json()) as { message?: string; [key: string]: unknown };

    if (!response.ok) {
      return {
        success: false,
        error: (data.message as string) || `GitHub API error: ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function proxyRoutes(app: FastifyInstance) {
  // ============================================================================
  // Slack Proxy
  // ============================================================================
  app.post(
    "/proxy/slack",
    {
      schema: {
        body: ProxyRequestSchema,
        response: {
          200: ProxyResponseSchema,
          404: ProxyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { instanceId, method, endpoint, params, body } =
        request.body as z.infer<typeof ProxyRequestSchema>;

      // Get token for this instance
      const token = await getTokenForInstance(instanceId, "slack");

      if (!token) {
        return reply.code(404).send({
          success: false,
          error: "Slack integration not found for this instance",
        });
      }

      // Make the proxied request
      const result = await proxySlackRequest(token, method, endpoint, params, body);

      return reply.send(result);
    }
  );

  // ============================================================================
  // GitHub Proxy
  // ============================================================================
  app.post(
    "/proxy/github",
    {
      schema: {
        body: ProxyRequestSchema,
        response: {
          200: ProxyResponseSchema,
          404: ProxyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { instanceId, method, endpoint, params, body } =
        request.body as z.infer<typeof ProxyRequestSchema>;

      // Get token for this instance
      const token = await getTokenForInstance(instanceId, "github");

      if (!token) {
        return reply.code(404).send({
          success: false,
          error: "GitHub integration not found for this instance",
        });
      }

      // Make the proxied request
      const result = await proxyGitHubRequest(token, method, endpoint, params, body);

      return reply.send(result);
    }
  );

  // ============================================================================
  // Generic info endpoint - tells bot which integrations are available
  // ============================================================================
  app.get(
    "/proxy/integrations/:instanceId",
    {
      schema: {
        params: z.object({
          instanceId: z.string().cuid(),
        }),
      },
    },
    async (request, reply) => {
      const { instanceId } = request.params as { instanceId: string };

      const integrations = await prisma.instanceIntegration.findMany({
        where: { instanceId },
        include: {
          userIntegration: {
            include: {
              integration: true,
            },
          },
        },
      });

      const available = integrations.map((ii) => ({
        provider: ii.userIntegration.integration.provider,
        name: ii.userIntegration.integration.name,
        accountIdentifier: ii.userIntegration.accountIdentifier,
      }));

      return reply.send({ integrations: available });
    }
  );
}
