import type { FastifyInstance } from 'fastify';
import oauthPlugin from '@fastify/oauth2';
import { prisma } from '@fasterclaw/db';

export async function googleAuthRoutes(fastify: FastifyInstance) {
  const callbackUri =
    process.env.NODE_ENV === 'production'
      ? `${process.env.API_URL || 'https://fasterclaw-api.fly.dev'}/auth/google/callback`
      : 'http://localhost:3001/auth/google/callback';

  // Register Google OAuth2 plugin
  await fastify.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
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
      { expiresIn: '7d' }
    );
  }

  // Google OAuth callback
  fastify.get('/auth/google/callback', async function (request, reply) {
    try {
      // Get access token from Google
      const { token } =
        await (this as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Fetch user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
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

      if (!user) {
        // Create new user (no password for OAuth users)
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            passwordHash: '', // OAuth users don't have passwords
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
      }

      // Generate JWT token
      const accessToken = generateToken(user);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(
        `${frontendUrl}/auth/callback?token=${accessToken}`
      );
    } catch (error) {
      fastify.log.error(error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/sign-in?error=oauth_failed`);
    }
  });
}

export default googleAuthRoutes;
