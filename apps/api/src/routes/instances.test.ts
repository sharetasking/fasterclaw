import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { instanceRoutes } from "./instances.js";

// Mock dependencies
vi.mock("@fasterclaw/db", () => ({
  prisma: {
    instance: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../services/fly.js", () => ({
  createApp: vi.fn(),
  createMachine: vi.fn(),
  startMachine: vi.fn(),
  stopMachine: vi.fn(),
  deleteMachine: vi.fn(),
  deleteApp: vi.fn(),
}));

import { prisma } from "@fasterclaw/db";
import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
} from "../services/fly.js";

describe("Instance Routes", () => {
  let app: FastifyInstance;
  // Use valid CUID formats for testing
  const mockUserId = "cjld2cyuq0000t3rmniod1foy";
  const mockInstanceId = "cjld2cyuq0001t3rmniod1foz";

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

    await app.register(instanceRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("POST /instances", () => {
    it("should create a new instance successfully", async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-cjld2cyu-1234567890",
        flyMachineId: null,
        region: "ewr",
        status: "CREATING",
        ipAddress: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(prisma.instance.create).mockResolvedValue(mockInstance as any);
      vi.mocked(createApp).mockResolvedValue(undefined as any);
      vi.mocked(createMachine).mockResolvedValue({
        id: "machine-123",
        private_ip: "10.0.0.1",
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/instances",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: "My Instance",
          region: "ewr",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockInstanceId);
      expect(body.name).toBe("My Instance");
      expect(body.region).toBe("ewr");
      expect(body.status).toBe("CREATING");

      expect(prisma.instance.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: "My Instance",
          flyAppName: expect.stringContaining("openclaw-cjld2cyu"),
          region: "ewr",
          status: "CREATING",
        },
      });
    });

    it("should return 400 when instance creation fails", async () => {
      vi.mocked(prisma.instance.create).mockRejectedValue(new Error("Database error"));

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/instances",
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: "My Instance",
          region: "ewr",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to create instance");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/instances",
        payload: {
          name: "My Instance",
          region: "ewr",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /instances", () => {
    it("should list all user instances", async () => {
      const instance1Id = "cjld2cyuq0002t3rmniod1fox";
      const instance2Id = "cjld2cyuq0003t3rmniod1foy";
      const mockInstances = [
        {
          id: instance1Id,
          userId: mockUserId,
          name: "Instance 1",
          flyAppName: "openclaw-app1",
          flyMachineId: "machine-1",
          region: "ewr",
          status: "RUNNING",
          ipAddress: "10.0.0.1",
          createdAt: new Date("2024-01-02T00:00:00Z"),
          updatedAt: new Date("2024-01-02T00:00:00Z"),
        },
        {
          id: instance2Id,
          userId: mockUserId,
          name: "Instance 2",
          flyAppName: "openclaw-app2",
          flyMachineId: "machine-2",
          region: "lax",
          status: "STOPPED",
          ipAddress: "10.0.0.2",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        },
      ];

      vi.mocked(prisma.instance.findMany).mockResolvedValue(mockInstances as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/instances",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe(instance1Id);
      expect(body[1].id).toBe(instance2Id);

      expect(prisma.instance.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: { not: "DELETED" },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when user has no instances", async () => {
      vi.mocked(prisma.instance.findMany).mockResolvedValue([]);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/instances",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/instances",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("GET /instances/:id", () => {
    it("should return instance by ID", async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "RUNNING",
        ipAddress: "10.0.0.1",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: `/instances/${mockInstanceId}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockInstanceId);
      expect(body.name).toBe("My Instance");
      expect(body.status).toBe("RUNNING");

      expect(prisma.instance.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockInstanceId,
          userId: mockUserId,
        },
      });
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/instances/nonexistent",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance not found");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/instances/${mockInstanceId}`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("POST /instances/:id/start", () => {
    it("should start a stopped instance successfully", async () => {
      const stoppedInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "STOPPED",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const runningInstance = {
        ...stoppedInstance,
        status: "RUNNING",
        updatedAt: new Date("2024-01-01T01:00:00Z"),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(stoppedInstance);
      vi.mocked(startMachine).mockResolvedValue(undefined as any);
      vi.mocked(prisma.instance.update).mockResolvedValue(runningInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("RUNNING");

      expect(startMachine).toHaveBeenCalledWith("openclaw-app", "machine-123");
      expect(prisma.instance.update).toHaveBeenCalledWith({
        where: { id: mockInstanceId },
        data: { status: "RUNNING" },
      });
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/instances/nonexistent/start",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance not found");
      expect(startMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when instance is not stopped", async () => {
      const runningInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "RUNNING",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(runningInstance);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance is not stopped");
      expect(startMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when machine ID is missing", async () => {
      const instanceNoMachine = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: null,
        region: "ewr",
        status: "STOPPED",
        ipAddress: null,
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(instanceNoMachine);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("No machine ID or app name found");
      expect(startMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when Fly.io start fails", async () => {
      const stoppedInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "STOPPED",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(stoppedInstance);
      vi.mocked(startMachine).mockRejectedValue(new Error("Fly.io error"));

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to start instance");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("POST /instances/:id/stop", () => {
    it("should stop a running instance successfully", async () => {
      const runningInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "RUNNING",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const stoppedInstance = {
        ...runningInstance,
        status: "STOPPED",
        updatedAt: new Date("2024-01-01T01:00:00Z"),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(runningInstance);
      vi.mocked(stopMachine).mockResolvedValue(undefined as any);
      vi.mocked(prisma.instance.update).mockResolvedValue(stoppedInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("STOPPED");

      expect(stopMachine).toHaveBeenCalledWith("openclaw-app", "machine-123");
      expect(prisma.instance.update).toHaveBeenCalledWith({
        where: { id: mockInstanceId },
        data: { status: "STOPPED" },
      });
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/instances/nonexistent/stop",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance not found");
      expect(stopMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when instance is not running", async () => {
      const stoppedInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "STOPPED",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(stoppedInstance);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance is not running");
      expect(stopMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when machine ID is missing", async () => {
      const instanceNoMachine = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: null,
        flyMachineId: null,
        region: "ewr",
        status: "RUNNING",
        ipAddress: null,
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(instanceNoMachine);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("No machine ID or app name found");
      expect(stopMachine).not.toHaveBeenCalled();
    });

    it("should return 400 when Fly.io stop fails", async () => {
      const runningInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "RUNNING",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(runningInstance);
      vi.mocked(stopMachine).mockRejectedValue(new Error("Fly.io error"));

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to stop instance");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("DELETE /instances/:id", () => {
    it("should delete an instance successfully", async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "STOPPED",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);
      vi.mocked(deleteMachine).mockResolvedValue(undefined as any);
      vi.mocked(deleteApp).mockResolvedValue(undefined as any);
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockInstance,
        status: "DELETED",
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/instances/${mockInstanceId}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      expect(deleteMachine).toHaveBeenCalledWith("openclaw-app", "machine-123");
      expect(deleteApp).toHaveBeenCalledWith("openclaw-app");
      expect(prisma.instance.update).toHaveBeenCalledWith({
        where: { id: mockInstanceId },
        data: { status: "DELETED" },
      });
    });

    it("should delete instance even if no Fly resources exist", async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: null,
        flyMachineId: null,
        region: "ewr",
        status: "CREATING",
        ipAddress: null,
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockInstance,
        status: "DELETED",
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/instances/${mockInstanceId}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      expect(deleteMachine).not.toHaveBeenCalled();
      expect(deleteApp).not.toHaveBeenCalled();
      expect(prisma.instance.update).toHaveBeenCalled();
    });

    it("should return 404 when instance not found", async () => {
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/instances/nonexistent",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Instance not found");
      expect(deleteMachine).not.toHaveBeenCalled();
      expect(deleteApp).not.toHaveBeenCalled();
    });

    it("should return 400 when Fly.io deletion fails", async () => {
      const mockInstance = {
        id: mockInstanceId,
        userId: mockUserId,
        name: "My Instance",
        flyAppName: "openclaw-app",
        flyMachineId: "machine-123",
        region: "ewr",
        status: "STOPPED",
        ipAddress: "10.0.0.1",
        telegramBotToken: null,
        aiModel: "gpt-4",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);
      vi.mocked(deleteMachine).mockRejectedValue(new Error("Fly.io error"));

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/instances/${mockInstanceId}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to delete instance");
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/instances/${mockInstanceId}`,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Unauthorized");
    });
  });
});
