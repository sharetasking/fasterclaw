import type { FastifyInstance } from "fastify";
import oauthPlugin from "@fastify/oauth2";
import { prisma } from "@fasterclaw/db";

export async function googleAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId === undefined || googleClientSecret === undefined) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  const callbackUri =
    process.env.NODE_ENV === "production"
      ? `${process.env.API_URL ?? "https://fasterclaw-api.fly.dev"}/auth/google/callback`
      : "http://localhost:3001/auth/google/callback";

  // Register Google OAuth2 plugin
  await fastify.register(oauthPlugin, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: googleClientId,
        secret: googleClientSecret,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/auth/google",
    callbackUri,
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

  // Google OAuth callback
  fastify.get("/auth/google/callback", async function (request, reply) {
    try {
      // Get access token from Google
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const { token } = (await (this as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
        request
      )) as { token: { access_token: string } };

      // Fetch user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Failed to fetch user info from Google");
      }

      const googleUser = (await userInfoResponse.json()) as {
        id: string;
        email: string;
        name: string;
        picture: string;
      };

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Create new user if not found (no password for OAuth users)
      user ??= await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
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
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
      return await reply.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error: unknown) {
      fastify.log.error(error);
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
      return await reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
    }
  });
}

export default googleAuthRoutes;
