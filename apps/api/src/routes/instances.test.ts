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
      count: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
  maskToken: vi.fn((token: string | null) => (token ? `${token.slice(0, 4)}...` : null)),
}));

vi.mock("../services/fly.js", () => ({
  createApp: vi.fn(),
  createMachine: vi.fn(),
  startMachine: vi.fn(),
  stopMachine: vi.fn(),
  deleteMachine: vi.fn(),
  deleteApp: vi.fn(),
  FlyApiError: class FlyApiError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public detail: string,
      public operation: string
    ) {
      super(`Fly.io ${operation} failed (${status}): ${detail}`);
    }
  },
}));

vi.mock("../services/providers/index.js", () => ({
  getProvider: vi.fn(() => ({
    name: "fly",
    createInstance: vi.fn(),
    startInstance: vi.fn(),
    stopInstance: vi.fn(),
    deleteInstance: vi.fn(),
    getInstanceStatus: vi.fn(),
  })),
  getProviderType: vi.fn(() => "fly"),
}));

// Helper to create mock instance with all required fields
function createMockInstance(
  overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    provider: string;
    flyAppName: string | null;
    flyMachineId: string | null;
    dockerContainerId: string | null;
    dockerPort: number | null;
    region: string;
    status: string;
    ipAddress: string | null;
    telegramBotToken: string | null;
    aiModel: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: "cjld2cyuq0001t3rmniod1foz",
    userId: "cjld2cyuq0000t3rmniod1foy",
    name: "My Instance",
    provider: "fly",
    flyAppName: "openclaw-app",
    flyMachineId: "machine-123",
    dockerContainerId: null,
    dockerPort: null,
    region: "ewr",
    status: "RUNNING",
    ipAddress: "10.0.0.1",
    telegramBotToken: null,
    aiModel: "gpt-4",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

import { prisma } from "@fasterclaw/db";
import { createApp, createMachine } from "../services/fly.js";
import { getProvider } from "../services/providers/index.js";

describe("Instance Routes", () => {
  let app: FastifyInstance;
  const mockUserId = "cjld2cyuq0000t3rmniod1foy";
  const mockInstanceId = "cjld2cyuq0001t3rmniod1foz";

  // Mock active subscription
  const mockSubscription = {
    id: "sub-123",
    userId: mockUserId,
    status: "ACTIVE",
    instanceLimit: 5,
  };

  beforeEach(async () => {
    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(import("@fastify/jwt"), {
      secret: "test-jwt-secret-for-testing-only",
    });

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

    // Default subscription mock - active subscription
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription as any);
    vi.mocked(prisma.instance.count).mockResolvedValue(0);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("POST /instances", () => {
    it("should create a new instance successfully", async () => {
      const mockInstance = createMockInstance({
        status: "CREATING",
        flyMachineId: null,
        ipAddress: null,
      });

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
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "My Instance",
          telegramBotToken: "123456:ABC",
          region: "ewr",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe("My Instance");
      expect(body.status).toBe("CREATING");
    });

    it("should return 403 when no active subscription", async () => {
      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/instances",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: "My Instance",
          telegramBotToken: "123456:ABC",
          region: "ewr",
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/instances",
        payload: { name: "My Instance", telegramBotToken: "123:ABC", region: "ewr" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /instances", () => {
    it("should list all user instances", async () => {
      const mockInstances = [
        createMockInstance({ id: "cjld2cyuq0002t3rmniod1fox", name: "Instance 1" }),
        createMockInstance({
          id: "cjld2cyuq0003t3rmniod1foy",
          name: "Instance 2",
          status: "STOPPED",
        }),
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
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/instances",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /instances/:id", () => {
    it("should return instance by ID", async () => {
      const mockInstance = createMockInstance();
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: `/instances/${mockInstanceId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockInstanceId);
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
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /instances/:id/start", () => {
    it("should start a stopped instance successfully", async () => {
      const stoppedInstance = createMockInstance({ status: "STOPPED" });
      const runningInstance = createMockInstance({ status: "RUNNING" });

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(stoppedInstance as any);
      vi.mocked(prisma.instance.update).mockResolvedValue(runningInstance as any);
      vi.mocked(getProvider).mockReturnValue({
        name: "fly",
        createInstance: vi.fn(),
        startInstance: vi.fn().mockResolvedValue(undefined),
        stopInstance: vi.fn(),
        deleteInstance: vi.fn(),
        getInstanceStatus: vi.fn(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("RUNNING");
    });

    it("should return 400 when instance is not stopped", async () => {
      const runningInstance = createMockInstance({ status: "RUNNING" });
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(runningInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when machine ID is missing", async () => {
      const instanceNoMachine = createMockInstance({
        status: "STOPPED",
        flyMachineId: null,
        flyAppName: null,
      });
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(instanceNoMachine as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/start`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /instances/:id/stop", () => {
    it("should stop a running instance successfully", async () => {
      const runningInstance = createMockInstance({ status: "RUNNING" });
      const stoppedInstance = createMockInstance({ status: "STOPPED" });

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(runningInstance as any);
      vi.mocked(prisma.instance.update).mockResolvedValue(stoppedInstance as any);
      vi.mocked(getProvider).mockReturnValue({
        name: "fly",
        createInstance: vi.fn(),
        startInstance: vi.fn(),
        stopInstance: vi.fn().mockResolvedValue(undefined),
        deleteInstance: vi.fn(),
        getInstanceStatus: vi.fn(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("STOPPED");
    });

    it("should return 400 when instance is not running", async () => {
      const stoppedInstance = createMockInstance({ status: "STOPPED" });
      vi.mocked(prisma.instance.findFirst).mockResolvedValue(stoppedInstance as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: `/instances/${mockInstanceId}/stop`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE /instances/:id", () => {
    it("should delete an instance successfully", async () => {
      const mockInstance = createMockInstance({ status: "STOPPED" });

      vi.mocked(prisma.instance.findFirst).mockResolvedValue(mockInstance as any);
      vi.mocked(prisma.instance.update).mockResolvedValue({
        ...mockInstance,
        status: "DELETED",
      } as any);
      vi.mocked(getProvider).mockReturnValue({
        name: "fly",
        createInstance: vi.fn(),
        startInstance: vi.fn(),
        stopInstance: vi.fn(),
        deleteInstance: vi.fn().mockResolvedValue(undefined),
        getInstanceStatus: vi.fn(),
      } as any);

      const token = app.jwt.sign({
        sub: mockUserId,
        email: "test@example.com",
        name: "Test User",
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/instances/${mockInstanceId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
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
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
