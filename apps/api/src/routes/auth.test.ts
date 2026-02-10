import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import bcrypt from "bcryptjs";
import { authRoutes } from "./auth.js";

// Mock dependencies
vi.mock("@fasterclaw/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    instance: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../services/stripe.js", () => ({
  stripe: {
    subscriptions: {
      cancel: vi.fn(),
    },
  },
}));

import { prisma } from "@fasterclaw/db";
import { stripe } from "../services/stripe.js";

describe("Auth Routes", () => {
  let app: FastifyInstance;
  // Use a valid CUID format for testing
  const mockUserId = "cjld2cyuq0000t3rmniod1foy";

  beforeEach(async () => {
    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Register JWT plugin manually for tests
    await app.register(import("@fastify/jwt"), {
      secret: "test-jwt-secret-for-testing-only",
    });

    // Add authenticate decorator
    app.decorate("authenticate", async (request, reply) => {
      try {
        await request.jwtVerify();
        const payload = request.user as unknown as {
          sub: string;
          email: string;
          name: string | null;
        };
        request.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
        };
      } catch {
        void reply.code(401).send({ error: "Unauthorized" });
      }
    });

    await app.register(authRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("user");
      expect(body.user.email).toBe("test@example.com");
      expect(body.user.name).toBe("Test User");
      expect(body.user.id).toBe(mockUserId);
      expect(body.user.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(body.user.updatedAt).toBe("2024-01-01T00:00:00.000Z");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should return 409 when user already exists", async () => {
      const existingUser = {
        id: mockUserId,
        name: "Existing User",
        email: "existing@example.com",
        passwordHash: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
          email: "existing@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("User already exists");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should hash the password before storing", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);

      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        },
      });

      const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe("password123");

      // Verify password was actually hashed
      const isValidHash = await bcrypt.compare("password123", createCall.data.passwordHash);
      expect(isValidHash).toBe(true);
    });
  });

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: hashedPassword,
        stripeCustomerId: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "test@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("accessToken");
      expect(body).toHaveProperty("user");
      expect(body.user.email).toBe("test@example.com");
      expect(body.user).not.toHaveProperty("passwordHash");
    });

    it("should return 401 with invalid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 12);
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: hashedPassword,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "test@example.com",
          password: "wrongpassword",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Invalid credentials");
    });

    it("should return 401 when user does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "nonexistent@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Invalid credentials");
    });

    it("should return 401 when user has no password (OAuth user)", async () => {
      const mockUser = {
        id: mockUserId,
        name: "OAuth User",
        email: "oauth@example.com",
        passwordHash: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "oauth@example.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Invalid credentials");
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user when authenticated", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Generate a valid token
      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe("test@example.com");
      expect(body.name).toBe("Test User");
      expect(body.id).toBe(mockUserId);
      expect(body).not.toHaveProperty("passwordHash");
    });

    it("should return 401 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: "nonexistent-user",
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("User not found");
    });

    it("should return 401 when token is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when token is invalid", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("PATCH /auth/profile", () => {
    it("should update user profile successfully", async () => {
      const updatedUser = {
        id: mockUserId,
        name: "Updated Name",
        email: "test@example.com",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/auth/profile",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: "Updated Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe("Updated Name");
      expect(body.email).toBe("test@example.com");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { name: "Updated Name" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/auth/profile",
        payload: {
          name: "Updated Name",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /auth/password", () => {
    it("should change password successfully", async () => {
      const hashedPassword = await bcrypt.hash("oldpassword", 12);
      const mockUser = {
        id: mockUserId,
        passwordHash: hashedPassword,
        name: "Test User",
        email: "test@example.com",
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: "new-hashed-password",
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/auth/password",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Password updated successfully");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { passwordHash: expect.any(String) },
      });
    });

    it("should return 401 when current password is incorrect", async () => {
      const hashedPassword = await bcrypt.hash("oldpassword", 12);
      const mockUser = {
        id: mockUserId,
        passwordHash: hashedPassword,
        name: "Test User",
        email: "test@example.com",
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/auth/password",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Current password is incorrect");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should return 400 when user has no password (OAuth user)", async () => {
      const mockUser = {
        id: mockUserId,
        passwordHash: null,
        name: "Test User",
        email: "test@example.com",
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/auth/password",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Password change not available for this account");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/auth/password",
        payload: {
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /auth/account", () => {
    it("should delete user account successfully", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.instance.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/account",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Account deleted successfully");

      expect(prisma.instance.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it("should cancel Stripe subscription before deleting account", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: {
          stripeSubscriptionId: "sub_123",
        },
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(stripe.subscriptions.cancel).mockResolvedValue({} as any);
      vi.mocked(prisma.instance.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/account",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_123");
      expect(prisma.user.delete).toHaveBeenCalled();
    });

    it("should still delete account even if Stripe cancellation fails", async () => {
      const mockUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: "cus_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: {
          stripeSubscriptionId: "sub_123",
        },
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(stripe.subscriptions.cancel).mockRejectedValue(new Error("Stripe error"));
      vi.mocked(prisma.instance.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/account",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Account deleted successfully");
      expect(prisma.user.delete).toHaveBeenCalled();
    });

    it("should return 401 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: "nonexistent-user",
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/auth/account",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("User not found");
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/auth/account",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });
});
