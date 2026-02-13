/**
 * Integrations API Routes
 *
 * Endpoints for managing OAuth integrations (Google, Slack, GitHub).
 * Handles OAuth flows, token encryption, and instance integration management.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { prisma } from "@fasterclaw/db";
import {
  IntegrationSchema,
  IntegrationListSchema,
  UserIntegrationListSchema,
  InstanceIntegrationListSchema,
  InitiateOAuthRequestSchema,
  OAuthUrlResponseSchema,
  OAuthCallbackQuerySchema,
  EnableInstanceIntegrationRequestSchema,
} from "@fasterclaw/shared";
import { getOAuthProvider } from "../services/oauth/index.js";
import { encryptToken, decryptToken } from "../services/encryption.js";
import {
  loadIntegrationInstructions,
  escapeForHeredoc,
} from "../services/integrations/index.js";

const execFileAsync = promisify(execFile);

/**
 * Get the API URL for proxy calls.
 * Uses ngrok domain for development, falls back to API_URL or localhost.
 */
function getProxyUrl(): string {
  if (process.env.NGROK_DOMAIN) {
    return `https://${process.env.NGROK_DOMAIN}`;
  }
  return process.env.API_URL || "http://localhost:3001";
}

/**
 * Configure integration on a running Docker container.
 *
 * SECURE ARCHITECTURE:
 * - Tokens are NEVER written to the container
 * - Instead, we write the proxy URL and instance ID
 * - The bot calls our proxy, which decrypts the token server-side
 * - Plain text tokens never leave our secure server
 *
 * To add a new integration:
 * 1. Create a markdown file in apps/api/src/services/integrations/instructions/
 * 2. Add the provider name to INTEGRATION_FILES in apps/api/src/services/integrations/index.ts
 * 3. Add proxy handler in apps/api/src/routes/proxy.ts
 */
async function configureIntegrationOnContainer(
  containerName: string,
  instanceId: string,
  provider: string
): Promise<void> {
  // Load instructions from markdown file
  let instructions = loadIntegrationInstructions(provider);

  if (!instructions) {
    console.warn(`No instructions found for integration provider: ${provider}`);
    return;
  }

  // Get proxy URL for API calls
  const proxyUrl = getProxyUrl();

  // Replace placeholders with actual values so the model can copy commands directly
  instructions = instructions
    .replace(/PROXY_URL/g, proxyUrl)
    .replace(/INSTANCE_ID/g, instanceId);

  // Build SOUL.md additions with the loaded instructions
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  const soulAdditions = `\n\n---\n\n## Integration Capabilities\n\n### ${providerName} Integration\n\n${escapeForHeredoc(instructions)}`;

  try {
    // Add instructions to SOUL.md
    await execFileAsync("docker", [
      "exec",
      containerName,
      "sh",
      "-c",
      `cat >> ~/.openclaw/workspace/SOUL.md << 'SOULEOF'
${soulAdditions}
SOULEOF`,
    ]);

    // Write proxy URL (NOT the token - tokens stay secure on server)
    await execFileAsync("docker", [
      "exec",
      containerName,
      "sh",
      "-c",
      `mkdir -p ~/.openclaw && echo '${proxyUrl}' > ~/.openclaw/proxy_url`,
    ]);

    // Write instance ID (used to identify which tokens to use)
    await execFileAsync("docker", [
      "exec",
      containerName,
      "sh",
      "-c",
      `echo '${instanceId}' > ~/.openclaw/instance_id`,
    ]);

    // Clear sessions so model gets new instructions
    await execFileAsync("docker", [
      "exec",
      containerName,
      "sh",
      "-c",
      `rm -rf ~/.openclaw/agents/main/sessions/*`,
    ]);

    // Restart container
    await execFileAsync("docker", ["restart", containerName]);

    console.log(`Configured ${provider} integration on container ${containerName} (using secure proxy)`);
  } catch (error) {
    console.error(`Failed to configure ${provider} integration:`, error);
    throw error;
  }
}

// OAuth redirect URLs per provider
// - Google: Allows localhost in development (no HTTPS required for localhost)
// - Slack/GitHub: Require HTTPS, so use ngrok in development
function getOAuthRedirectUrl(provider: string): string {
  const localhost = process.env.OAUTH_REDIRECT_BASE_URL || "http://localhost:3001";
  const ngrokUrl = process.env.NGROK_DOMAIN ? `https://${process.env.NGROK_DOMAIN}` : null;

  // Google allows localhost without HTTPS in development
  // Use GOOGLE_OAUTH_REDIRECT_URL env var to override if needed
  if (provider === "google") {
    return process.env.GOOGLE_OAUTH_REDIRECT_URL || localhost;
  }

  // Slack and GitHub require HTTPS, prefer ngrok
  return ngrokUrl || localhost;
}

/**
 * Generate OAuth state JWT with user info
 */
function generateOAuthState(userId: string, integrationId: string): string {
  // Simple state token with userId and integrationId
  // In production, use JWT with expiry
  const state = Buffer.from(
    JSON.stringify({
      userId,
      integrationId,
      nonce: Math.random().toString(36).substring(7),
      exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    })
  ).toString("base64");
  return state;
}

/**
 * Validate and parse OAuth state
 */
function parseOAuthState(state: string): {
  userId: string;
  integrationId: string;
} | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    if (decoded.exp < Date.now()) {
      return null; // Expired
    }
    return {
      userId: decoded.userId,
      integrationId: decoded.integrationId,
    };
  } catch {
    return null;
  }
}

export async function integrationsRoutes(app: FastifyInstance) {
  // ============================================================================
  // List available integrations (marketplace)
  // ============================================================================
  app.get(
    "/integrations",
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: IntegrationListSchema,
        },
      },
    },
    async (request, reply) => {
      const integrations = await prisma.integration.findMany({
        orderBy: { name: "asc" },
      });

      return reply.send(
        integrations.map((integration) => ({
          ...integration,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        }))
      );
    }
  );

  // ============================================================================
  // Get user's connected integrations
  // ============================================================================
  app.get(
    "/integrations/user",
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: UserIntegrationListSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;

      const userIntegrations = await prisma.userIntegration.findMany({
        where: { userId },
        include: {
          integration: true,
        },
        orderBy: { connectedAt: "desc" },
      });

      return reply.send(
        userIntegrations.map((ui) => ({
          id: ui.id,
          userId: ui.userId,
          integrationId: ui.integrationId,
          integration: {
            ...ui.integration,
            createdAt: ui.integration.createdAt.toISOString(),
            updatedAt: ui.integration.updatedAt.toISOString(),
          },
          accountIdentifier: ui.accountIdentifier,
          connectedAt: ui.connectedAt.toISOString(),
          tokenExpiresAt: ui.tokenExpiresAt?.toISOString() ?? null,
          lastRefreshedAt: ui.lastRefreshedAt?.toISOString() ?? null,
        }))
      );
    }
  );

  // ============================================================================
  // Initiate OAuth flow
  // ============================================================================
  app.post(
    "/integrations/oauth/initiate",
    {
      onRequest: [app.authenticate],
      schema: {
        body: InitiateOAuthRequestSchema,
        response: {
          200: OAuthUrlResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { integrationId } = request.body as { integrationId: string };

      // Get integration from database
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        return (reply as any).code(404).send({ error: "Integration not found" });
      }

      // Get OAuth provider
      const provider = getOAuthProvider(integration.provider);

      // Generate state token
      const state = generateOAuthState(userId, integrationId);

      // Build authorization URL (provider-specific redirect URL)
      const redirectUri = `${getOAuthRedirectUrl(integration.provider)}/integrations/oauth/callback`;
      const authorizationUrl = provider.getAuthorizationUrl(
        integration.oauthScopes,
        state,
        redirectUri
      );

      return reply.send({
        authorizationUrl,
        state,
      });
    }
  );

  // ============================================================================
  // OAuth callback handler
  // ============================================================================
  app.get(
    "/integrations/oauth/callback",
    {
      schema: {
        querystring: OAuthCallbackQuerySchema,
      },
    },
    async (request, reply) => {
      const { code, state, error } = request.query as { code?: string; state?: string; error?: string };

      // Handle OAuth error
      if (error) {
        return reply
          .code(400)
          .send({ error: `OAuth error: ${error}` });
      }

      // Validate required params
      if (!code || !state) {
        return reply.code(400).send({ error: "Missing code or state parameter" });
      }

      // Validate state
      const stateData = parseOAuthState(state);
      if (!stateData) {
        return reply.code(400).send({ error: "Invalid or expired state" });
      }

      const { userId, integrationId } = stateData;

      // Get integration
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        return (reply as any).code(404).send({ error: "Integration not found" });
      }

      try {
        // Get OAuth provider
        const provider = getOAuthProvider(integration.provider);

        // Exchange code for tokens (use same redirect URL as initiate)
        const redirectUri = `${getOAuthRedirectUrl(integration.provider)}/integrations/oauth/callback`;
        const tokens = await provider.exchangeCodeForTokens(code, redirectUri);

        // Get account info
        const accountInfo = await provider.getAccountInfo(tokens.accessToken);

        // Encrypt tokens
        const encryptedAccessToken = encryptToken(tokens.accessToken);
        const encryptedRefreshToken = tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null;

        // Store in database (upsert to handle reconnections)
        await prisma.userIntegration.upsert({
          where: {
            userId_integrationId: {
              userId,
              integrationId,
            },
          },
          update: {
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt: tokens.expiresAt,
            accountIdentifier: accountInfo.email || accountInfo.username || accountInfo.name,
            lastRefreshedAt: new Date(),
          },
          create: {
            userId,
            integrationId,
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt: tokens.expiresAt,
            accountIdentifier: accountInfo.email || accountInfo.username || accountInfo.name,
            connectedAt: new Date(),
          },
        });

        // Redirect to success page
        return reply.redirect(
          `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/integrations?success=true`
        );
      } catch (err) {
        console.error("OAuth callback error:", err);
        return reply.redirect(
          `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/integrations?error=oauth_failed`
        );
      }
    }
  );

  // ============================================================================
  // Refresh OAuth token
  // ============================================================================
  app.post(
    "/integrations/oauth/refresh/:userIntegrationId",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { userIntegrationId } = request.params as { userIntegrationId: string };

      // Get user integration
      const userIntegration = await prisma.userIntegration.findFirst({
        where: {
          id: userIntegrationId,
          userId,
        },
        include: {
          integration: true,
        },
      });

      if (!userIntegration) {
        return reply.code(404).send({ error: "Integration not found" });
      }

      if (!userIntegration.encryptedRefreshToken) {
        return reply.code(400).send({ error: "No refresh token available" });
      }

      try {
        // Decrypt refresh token
        const refreshToken = decryptToken(userIntegration.encryptedRefreshToken);

        // Get OAuth provider
        const provider = getOAuthProvider(userIntegration.integration.provider);

        // Refresh access token
        const tokens = await provider.refreshAccessToken(refreshToken);

        // Encrypt new tokens
        const encryptedAccessToken = encryptToken(tokens.accessToken);
        const encryptedRefreshToken = tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : userIntegration.encryptedRefreshToken;

        // Update database
        await prisma.userIntegration.update({
          where: { id: userIntegrationId },
          data: {
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt: tokens.expiresAt,
            lastRefreshedAt: new Date(),
          },
        });

        return reply.send({ success: true, message: "Token refreshed" });
      } catch (err) {
        console.error("Token refresh error:", err);
        return reply.code(500).send({ error: "Failed to refresh token" });
      }
    }
  );

  // ============================================================================
  // Disconnect integration
  // ============================================================================
  app.delete(
    "/integrations/user/:integrationId",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { integrationId } = request.params as { integrationId: string };

      // Find user integration
      const userIntegration = await prisma.userIntegration.findFirst({
        where: {
          userId,
          integrationId,
        },
      });

      if (!userIntegration) {
        return reply.code(404).send({ error: "Integration not found" });
      }

      // Delete user integration (cascade will remove instance integrations)
      await prisma.userIntegration.delete({
        where: { id: userIntegration.id },
      });

      return reply.send({ success: true, message: "Integration disconnected" });
    }
  );

  // ============================================================================
  // List integrations enabled for an instance
  // ============================================================================
  app.get(
    "/instances/:instanceId/integrations",
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: InstanceIntegrationListSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { instanceId } = request.params as { instanceId: string };

      // Verify instance belongs to user
      const instance = await prisma.instance.findFirst({
        where: {
          id: instanceId,
          userId,
        },
      });

      if (!instance) {
        return (reply as any).code(404).send({ error: "Instance not found" });
      }

      // Get instance integrations
      const instanceIntegrations = await prisma.instanceIntegration.findMany({
        where: { instanceId },
        include: {
          userIntegration: {
            include: {
              integration: true,
            },
          },
        },
        orderBy: { enabledAt: "desc" },
      });

      return reply.send(
        instanceIntegrations.map((ii) => ({
          id: ii.id,
          instanceId: ii.instanceId,
          userIntegrationId: ii.userIntegrationId,
          userIntegration: {
            id: ii.userIntegration.id,
            userId: ii.userIntegration.userId,
            integrationId: ii.userIntegration.integrationId,
            integration: {
              ...ii.userIntegration.integration,
              createdAt: ii.userIntegration.integration.createdAt.toISOString(),
              updatedAt: ii.userIntegration.integration.updatedAt.toISOString(),
            },
            accountIdentifier: ii.userIntegration.accountIdentifier,
            connectedAt: ii.userIntegration.connectedAt.toISOString(),
            tokenExpiresAt: ii.userIntegration.tokenExpiresAt?.toISOString() ?? null,
            lastRefreshedAt: ii.userIntegration.lastRefreshedAt?.toISOString() ?? null,
          },
          enabledAt: ii.enabledAt.toISOString(),
        }))
      );
    }
  );

  // ============================================================================
  // Enable integration for instance
  // ============================================================================
  app.post(
    "/instances/:instanceId/integrations",
    {
      onRequest: [app.authenticate],
      schema: {
        body: EnableInstanceIntegrationRequestSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { instanceId } = request.params as { instanceId: string };
      const { userIntegrationId } = request.body as { userIntegrationId: string };

      // Verify instance belongs to user
      const instance = await prisma.instance.findFirst({
        where: {
          id: instanceId,
          userId,
        },
      });

      if (!instance) {
        return (reply as any).code(404).send({ error: "Instance not found" });
      }

      // Verify user integration belongs to user
      const userIntegration = await prisma.userIntegration.findFirst({
        where: {
          id: userIntegrationId,
          userId,
        },
        include: {
          integration: true,
        },
      });

      if (!userIntegration) {
        return reply.code(404).send({ error: "Integration not found" });
      }

      // Check if already enabled
      const existing = await prisma.instanceIntegration.findFirst({
        where: {
          instanceId,
          userIntegrationId,
        },
      });

      if (existing) {
        return reply.code(409).send({ error: "Integration already enabled for this instance" });
      }

      // Enable integration
      const instanceIntegration = await prisma.instanceIntegration.create({
        data: {
          instanceId,
          userIntegrationId,
        },
        include: {
          userIntegration: {
            include: {
              integration: true,
            },
          },
        },
      });

      // Configure the integration on the running container (Docker only for now)
      // Note: We use the SECURE PROXY approach - tokens never leave our server
      if (instance.provider === "docker" && instance.dockerContainerId) {
        try {
          await configureIntegrationOnContainer(
            instance.dockerContainerId,
            instanceId,
            userIntegration.integration.provider
          );
        } catch (err) {
          console.error("Failed to configure integration on container:", err);
          // Don't fail the request - integration is saved, just not configured yet
        }
      }

      return reply.code(201).send({
        id: instanceIntegration.id,
        instanceId: instanceIntegration.instanceId,
        userIntegrationId: instanceIntegration.userIntegrationId,
        userIntegration: {
          id: instanceIntegration.userIntegration.id,
          userId: instanceIntegration.userIntegration.userId,
          integrationId: instanceIntegration.userIntegration.integrationId,
          integration: {
            ...instanceIntegration.userIntegration.integration,
            createdAt: instanceIntegration.userIntegration.integration.createdAt.toISOString(),
            updatedAt: instanceIntegration.userIntegration.integration.updatedAt.toISOString(),
          },
          accountIdentifier: instanceIntegration.userIntegration.accountIdentifier,
          connectedAt: instanceIntegration.userIntegration.connectedAt.toISOString(),
          tokenExpiresAt: instanceIntegration.userIntegration.tokenExpiresAt?.toISOString() ?? null,
          lastRefreshedAt: instanceIntegration.userIntegration.lastRefreshedAt?.toISOString() ?? null,
        },
        enabledAt: instanceIntegration.enabledAt.toISOString(),
      });
    }
  );

  // ============================================================================
  // Disable integration for instance
  // ============================================================================
  app.delete(
    "/instances/:instanceId/integrations/:integrationId",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { instanceId, integrationId } = request.params as {
        instanceId: string;
        integrationId: string;
      };

      // Verify instance belongs to user
      const instance = await prisma.instance.findFirst({
        where: {
          id: instanceId,
          userId,
        },
      });

      if (!instance) {
        return (reply as any).code(404).send({ error: "Instance not found" });
      }

      // Find instance integration
      const instanceIntegration = await prisma.instanceIntegration.findFirst({
        where: {
          instanceId,
          userIntegration: {
            integrationId,
            userId,
          },
        },
      });

      if (!instanceIntegration) {
        return reply.code(404).send({ error: "Integration not enabled for this instance" });
      }

      // Delete instance integration
      await prisma.instanceIntegration.delete({
        where: { id: instanceIntegration.id },
      });

      return reply.send({ success: true, message: "Integration disabled" });
    }
  );
}
