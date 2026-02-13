/**
 * Integration Proxy V2 Routes
 *
 * Structured proxy endpoints for external API calls.
 * Tokens never leave this server - they are decrypted only for the API call.
 *
 * V2 improvements over V1:
 * - Structured action-based endpoints instead of raw API passthrough
 * - Better error handling and response formatting
 * - Self-documenting available actions
 * - Rate limiting ready
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import { decryptToken } from "../services/encryption.js";
import {
  ProxyV2RequestSchema,
  ProxyV2ResponseSchema,
  ProxyActionsListSchema,
} from "@fasterclaw/shared";

// ============================================================================
// Action Definitions
// ============================================================================

interface ActionDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  paramSchema?: z.ZodObject<any>;
}

const githubActions: Record<string, ActionDefinition> = {
  "list-repos": {
    method: "GET",
    path: "/user/repos",
    description: "List repositories for the authenticated user",
    paramSchema: z.object({
      per_page: z.number().optional(),
      page: z.number().optional(),
      sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
    }),
  },
  "get-repo": {
    method: "GET",
    path: "/repos/{owner}/{repo}",
    description: "Get a repository by owner and name",
    paramSchema: z.object({
      owner: z.string(),
      repo: z.string(),
    }),
  },
  "list-issues": {
    method: "GET",
    path: "/repos/{owner}/{repo}/issues",
    description: "List issues for a repository",
    paramSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional(),
    }),
  },
  "create-issue": {
    method: "POST",
    path: "/repos/{owner}/{repo}/issues",
    description: "Create an issue in a repository",
    paramSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
    }),
  },
  "list-prs": {
    method: "GET",
    path: "/repos/{owner}/{repo}/pulls",
    description: "List pull requests for a repository",
    paramSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(["open", "closed", "all"]).optional(),
    }),
  },
  "get-user": {
    method: "GET",
    path: "/user",
    description: "Get the authenticated user",
  },
};

const slackActions: Record<string, ActionDefinition> = {
  "list-channels": {
    method: "GET",
    path: "conversations.list",
    description: "List channels in the workspace",
    paramSchema: z.object({
      limit: z.number().optional(),
      types: z.string().optional(),
    }),
  },
  "send-message": {
    method: "POST",
    path: "chat.postMessage",
    description: "Send a message to a channel",
    paramSchema: z.object({
      channel: z.string(),
      text: z.string(),
      thread_ts: z.string().optional(),
    }),
  },
  "list-messages": {
    method: "GET",
    path: "conversations.history",
    description: "Get messages from a channel",
    paramSchema: z.object({
      channel: z.string(),
      limit: z.number().optional(),
    }),
  },
};

const googleActions: Record<string, ActionDefinition> = {
  "list-emails": {
    method: "GET",
    path: "/gmail/v1/users/me/messages",
    description: "List emails in the user's inbox",
    paramSchema: z.object({
      maxResults: z.number().optional(),
      q: z.string().optional(),
    }),
  },
  "get-email": {
    method: "GET",
    path: "/gmail/v1/users/me/messages/{id}",
    description: "Get a specific email by ID",
    paramSchema: z.object({
      id: z.string(),
    }),
  },
  "send-email": {
    method: "POST",
    path: "/gmail/v1/users/me/messages/send",
    description: "Send an email",
    paramSchema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
  "list-events": {
    method: "GET",
    path: "/calendar/v3/calendars/primary/events",
    description: "List calendar events",
    paramSchema: z.object({
      maxResults: z.number().optional(),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
    }),
  },
  "create-event": {
    method: "POST",
    path: "/calendar/v3/calendars/primary/events",
    description: "Create a calendar event",
    paramSchema: z.object({
      summary: z.string(),
      start: z.object({
        dateTime: z.string(),
        timeZone: z.string().optional(),
      }),
      end: z.object({
        dateTime: z.string(),
        timeZone: z.string().optional(),
      }),
      description: z.string().optional(),
    }),
  },
};

const allActions: Record<string, Record<string, ActionDefinition>> = {
  github: githubActions,
  slack: slackActions,
  google: googleActions,
};

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Replace path parameters with actual values
 */
function buildPath(pathTemplate: string, params: Record<string, any>): string {
  let path = pathTemplate;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
  }
  return path;
}

/**
 * Make a GitHub API request
 */
async function makeGitHubRequest(
  token: string,
  action: ActionDefinition,
  params: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = "https://api.github.com";
  let path = buildPath(action.path, params);

  // Build query params for GET requests
  if (action.method === "GET") {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (!action.path.includes(`{${key}}`)) {
        queryParams.set(key, String(value));
      }
    }
    const queryString = queryParams.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: action.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "FasterClaw-Proxy",
        ...(action.method !== "GET" && { "Content-Type": "application/json" }),
      },
      ...(action.method !== "GET" && { body: JSON.stringify(params) }),
    });

    if (response.status === 204) {
      return { success: true, data: null };
    }

    const data = await response.json() as Record<string, unknown>;

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

/**
 * Make a Slack API request
 */
async function makeSlackRequest(
  token: string,
  action: ActionDefinition,
  params: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = "https://slack.com/api";

  try {
    let url = `${baseUrl}/${action.path}`;
    const options: RequestInit = {
      method: action.method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (action.method === "GET") {
      const queryParams = new URLSearchParams(params);
      url += `?${queryParams.toString()}`;
    } else {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };
      options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);
    const data = await response.json() as Record<string, unknown>;

    if (data.ok === false) {
      return { success: false, error: (data.error as string) || "Slack API error" };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Make a Google API request
 */
async function makeGoogleRequest(
  token: string,
  action: ActionDefinition,
  params: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = "https://www.googleapis.com";
  let path = buildPath(action.path, params);

  try {
    let url = `${baseUrl}${path}`;
    const options: RequestInit = {
      method: action.method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (action.method === "GET") {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (!action.path.includes(`{${key}}`)) {
          queryParams.set(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    } else {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };

      // Special handling for Gmail send
      if (action.path.includes("/messages/send")) {
        // Build raw email
        const { to, subject, body } = params;
        const email = [
          `To: ${to}`,
          `Subject: ${subject}`,
          "",
          body,
        ].join("\r\n");
        const encodedEmail = Buffer.from(email).toString("base64url");
        options.body = JSON.stringify({ raw: encodedEmail });
      } else {
        options.body = JSON.stringify(params);
      }
    }

    const response = await fetch(url, options);

    if (response.status === 204) {
      return { success: true, data: null };
    }

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorObj = data.error as Record<string, unknown> | undefined;
      return {
        success: false,
        error: (errorObj?.message as string) || `Google API error: ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Routes
// ============================================================================

export async function proxyV2Routes(app: FastifyInstance) {
  // ============================================================================
  // GET /proxy/v2/actions - List available actions
  // ============================================================================
  app.get(
    "/proxy/v2/actions",
    {
      schema: {
        tags: ["Proxy V2"],
        summary: "List available proxy actions",
        description: "Get all available actions for each provider",
        response: {
          200: ProxyActionsListSchema,
        },
      },
    },
    async () => {
      const actions: Record<string, Record<string, { method: string; path: string; description?: string }>> = {};

      for (const [provider, providerActions] of Object.entries(allActions)) {
        actions[provider] = {};
        for (const [actionName, action] of Object.entries(providerActions)) {
          actions[provider][actionName] = {
            method: action.method,
            path: action.path,
            description: action.description,
          };
        }
      }

      return {
        providers: Object.keys(allActions),
        actions,
      };
    }
  );

  // ============================================================================
  // POST /proxy/v2/:provider/:action - Execute an action
  // ============================================================================
  app.post(
    "/proxy/v2/:provider/:action",
    {
      schema: {
        tags: ["Proxy V2"],
        summary: "Execute a proxy action",
        description: "Execute an action on an external service",
        params: z.object({
          provider: z.enum(["github", "slack", "google"]),
          action: z.string(),
        }),
        body: ProxyV2RequestSchema,
        response: {
          200: ProxyV2ResponseSchema,
          400: ProxyV2ResponseSchema,
          404: ProxyV2ResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { provider, action } = request.params as { provider: string; action: string };
      const { instanceId, params = {} } = request.body as { instanceId: string; params?: Record<string, any> };

      // Get action definition
      const providerActions = allActions[provider];
      if (!providerActions) {
        return reply.code(400).send({
          success: false,
          error: `Unknown provider: ${provider}`,
        });
      }

      const actionDef = providerActions[action];
      if (!actionDef) {
        return reply.code(400).send({
          success: false,
          error: `Unknown action: ${action}`,
          data: { availableActions: Object.keys(providerActions) },
        });
      }

      // Validate params if schema provided
      if (actionDef.paramSchema) {
        const validation = actionDef.paramSchema.safeParse(params);
        if (!validation.success) {
          return reply.code(400).send({
            success: false,
            error: "Invalid parameters",
            data: { issues: validation.error.issues },
          });
        }
      }

      // Get token
      const token = await getTokenForInstance(instanceId, provider);
      if (!token) {
        return reply.code(404).send({
          success: false,
          error: `${provider} integration not found for this instance`,
        });
      }

      // Make the request
      let result: { success: boolean; data?: any; error?: string };

      switch (provider) {
        case "github":
          result = await makeGitHubRequest(token, actionDef, params);
          break;
        case "slack":
          result = await makeSlackRequest(token, actionDef, params);
          break;
        case "google":
          result = await makeGoogleRequest(token, actionDef, params);
          break;
        default:
          result = { success: false, error: `Unsupported provider: ${provider}` };
      }

      return reply.send(result);
    }
  );

  // ============================================================================
  // GET /proxy/v2/integrations/:instanceId - List available integrations
  // ============================================================================
  app.get(
    "/proxy/v2/integrations/:instanceId",
    {
      schema: {
        tags: ["Proxy V2"],
        summary: "List available integrations for an instance",
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
        actions: Object.keys(allActions[ii.userIntegration.integration.provider] || {}),
      }));

      return reply.send({ integrations: available });
    }
  );
}
