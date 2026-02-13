/**
 * Slack OAuth Authentication Routes
 *
 * Implements "Sign in with Slack" functionality.
 * Uses the same Slack app as integrations but with identity scopes.
 *
 * Scopes used: identity.basic, identity.email
 * API endpoint: users.identity (for getting user info)
 */

import type { FastifyInstance } from "fastify";
import { prisma } from "@fasterclaw/db";

export async function slackAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const slackClientId = process.env.SLACK_OAUTH_CLIENT_ID;
  const slackClientSecret = process.env.SLACK_OAUTH_CLIENT_SECRET;

  if (slackClientId === undefined || slackClientSecret === undefined) {
    throw new Error("SLACK_OAUTH_CLIENT_ID and SLACK_OAUTH_CLIENT_SECRET must be set");
  }

  // Slack requires HTTPS for OAuth callbacks (use ngrok in development)
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === "production") {
      return process.env.API_URL ?? "https://fasterclaw-api.fly.dev";
    }
    // Use ngrok for Slack in development (requires HTTPS)
    return process.env.NGROK_DOMAIN
      ? `https://${process.env.NGROK_DOMAIN}`
      : "http://localhost:3001";
  };

  const callbackUri = `${getBaseUrl()}/auth/slack/callback`;

  // Start Slack OAuth flow with user_scope for identity
  fastify.get("/auth/slack", async (request, reply) => {
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: slackClientId,
      redirect_uri: callbackUri,
      user_scope: "identity.basic,identity.email",
      state,
    });
    return reply.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
  });

  // Helper to generate JWT token
  function generateToken(user: { id: string; email: string; name: string | null }) {
    return fastify.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      { expiresIn: "7d" }
    );
  }

  // Slack OAuth callback
  fastify.get("/auth/slack/callback", async function (request, reply) {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    try {
      const { code, error } = request.query as { code?: string; error?: string };

      if (error) {
        fastify.log.error(`Slack OAuth error: ${error}`);
        return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
      }

      if (!code) {
        fastify.log.error("Slack OAuth: No code received");
        return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: slackClientId,
          client_secret: slackClientSecret,
          code,
          redirect_uri: callbackUri,
        }),
      });

      const tokenData = (await tokenResponse.json()) as {
        ok: boolean;
        authed_user?: {
          id: string;
          scope: string;
          access_token: string;
        };
        error?: string;
      };

      if (!tokenData.ok || !tokenData.authed_user?.access_token) {
        fastify.log.error(`Slack token exchange failed: ${tokenData.error}`);
        return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
      }

      const userAccessToken = tokenData.authed_user.access_token;

      // Get user identity from Slack
      const identityResponse = await fetch("https://slack.com/api/users.identity", {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      const identityData = (await identityResponse.json()) as {
        ok: boolean;
        user?: {
          id: string;
          name: string;
          email: string;
        };
        team?: {
          id: string;
          name: string;
        };
        error?: string;
      };

      if (!identityData.ok || !identityData.user?.email) {
        fastify.log.error(`Slack identity fetch failed: ${identityData.error}`);
        return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
      }

      const slackUser = identityData.user;

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: slackUser.email },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Create new user if not found (no password for OAuth users)
      user ??= await prisma.user.create({
        data: {
          email: slackUser.email,
          name: slackUser.name,
          passwordHash: "", // OAuth users don't have passwords
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Generate JWT token
      const accessToken = generateToken(user);

      // Redirect to frontend with token
      return await reply.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error: unknown) {
      fastify.log.error(error);
      return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
    }
  });
}

export default slackAuthRoutes;
