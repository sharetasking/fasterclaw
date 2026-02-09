import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@fasterclaw/db';
import { stripe } from '../services/stripe.js';

// Zod schemas for request/response validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const tokenResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Helper to generate JWT token
  function generateToken(user: { id: string; email: string; name: string | null }) {
    return app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      { expiresIn: '7d' }
    );
  }

  // POST /auth/register - Register a new user
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user',
        body: registerSchema,
        response: {
          201: tokenResponseSchema,
          400: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const accessToken = generateToken(user);

      return reply.code(201).send({
        accessToken,
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    }
  );

  // POST /auth/login - Login with email/password
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        body: loginSchema,
        response: {
          200: tokenResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.passwordHash) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const accessToken = generateToken(user);

      const { passwordHash: _, ...userWithoutPassword } = user;

      return reply.send({
        accessToken,
        user: {
          ...userWithoutPassword,
          createdAt: userWithoutPassword.createdAt.toISOString(),
          updatedAt: userWithoutPassword.updatedAt.toISOString(),
        },
      });
    }
  );

  // GET /auth/me - Get current user from token
  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        response: {
          200: userSchema,
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      return reply.send({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    }
  );

  // PATCH /auth/profile - Update user profile
  app.patch(
    '/auth/profile',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Update user profile',
        body: updateProfileSchema,
        response: {
          200: userSchema,
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { name } = request.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    }
  );

  // PATCH /auth/password - Change password
  app.patch(
    '/auth/password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Change user password',
        body: updatePasswordSchema,
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;
      const { currentPassword, newPassword } = request.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        return reply.code(400).send({ error: 'Password change not available for this account' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      return reply.send({ message: 'Password updated successfully' });
    }
  );

  // DELETE /auth/account - Delete user account
  app.delete(
    '/auth/account',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Delete user account and all associated data',
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ error: z.string() }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      });

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (error) {
          console.error('Failed to cancel Stripe subscription:', error);
        }
      }

      // Delete all user instances (Fly.io cleanup would happen here in production)
      await prisma.instance.deleteMany({
        where: { userId },
      });

      // Delete the user (this will cascade delete related records)
      await prisma.user.delete({
        where: { id: userId },
      });

      return reply.send({ message: 'Account deleted successfully' });
    }
  );
}

export default authRoutes;
