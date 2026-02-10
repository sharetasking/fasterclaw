import { describe, it, expect } from "vitest";
import {
  InstanceStatusSchema,
  InstanceSchema,
  InstanceListSchema,
  CreateInstanceRequestSchema,
  InstanceIdParamSchema,
} from "./instances.js";

describe("Instance Schemas", () => {
  describe("InstanceStatusSchema", () => {
    it("should accept CREATING status", () => {
      const result = InstanceStatusSchema.safeParse("CREATING");
      expect(result.success).toBe(true);
    });

    it("should accept RUNNING status", () => {
      const result = InstanceStatusSchema.safeParse("RUNNING");
      expect(result.success).toBe(true);
    });

    it("should accept STOPPED status", () => {
      const result = InstanceStatusSchema.safeParse("STOPPED");
      expect(result.success).toBe(true);
    });

    it("should accept FAILED status", () => {
      const result = InstanceStatusSchema.safeParse("FAILED");
      expect(result.success).toBe(true);
    });

    it("should accept DELETED status", () => {
      const result = InstanceStatusSchema.safeParse("DELETED");
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = InstanceStatusSchema.safeParse("INVALID");
      expect(result.success).toBe(false);
    });

    it("should reject lowercase status", () => {
      const result = InstanceStatusSchema.safeParse("running");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = InstanceStatusSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = InstanceStatusSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject number", () => {
      const result = InstanceStatusSchema.safeParse(1);
      expect(result.success).toBe(false);
    });
  });

  describe("InstanceSchema", () => {
    it("should accept valid instance", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null flyAppName", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: null,
        flyMachineId: "machine_123456",
        status: "CREATING",
        region: "lax",
        ipAddress: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null flyMachineId", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: null,
        status: "CREATING",
        region: "lax",
        ipAddress: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null ipAddress", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "STOPPED",
        region: "lax",
        ipAddress: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept IPv6 address", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept different region codes", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "fra",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with special characters", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My-Instance_2024 (Test)",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid CUID for id", () => {
      const result = InstanceSchema.safeParse({
        id: "invalid-id",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid CUID for userId", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "invalid-user-id",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime format", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "My Instance",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "invalid-date",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        name: "My Instance",
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty string for name", () => {
      const result = InstanceSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        userId: "clh9876543210zyxwvutsrqpo",
        name: "",
        flyAppName: "my-app-123",
        flyMachineId: "machine_123456",
        status: "RUNNING",
        region: "lax",
        ipAddress: "192.168.1.1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("InstanceListSchema", () => {
    it("should accept valid instance list", () => {
      const result = InstanceListSchema.safeParse([
        {
          id: "clh1234567890abcdefghijkl",
          userId: "clh9876543210zyxwvutsrqpo",
          name: "Instance 1",
          flyAppName: "my-app-123",
          flyMachineId: "machine_123456",
          status: "RUNNING",
          region: "lax",
          ipAddress: "192.168.1.1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "clh9999999999aaaaaaaaaaaaa",
          userId: "clh9876543210zyxwvutsrqpo",
          name: "Instance 2",
          flyAppName: null,
          flyMachineId: null,
          status: "CREATING",
          region: "fra",
          ipAddress: null,
          createdAt: "2024-01-02T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ]);
      expect(result.success).toBe(true);
    });

    it("should accept empty instance list", () => {
      const result = InstanceListSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("should reject invalid instance in list", () => {
      const result = InstanceListSchema.safeParse([
        {
          id: "clh1234567890abcdefghijkl",
          userId: "clh9876543210zyxwvutsrqpo",
          name: "Instance 1",
          flyAppName: "my-app-123",
          flyMachineId: "machine_123456",
          status: "RUNNING",
          region: "lax",
          ipAddress: "192.168.1.1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "invalid-id",
          name: "Instance 2",
        },
      ]);
      expect(result.success).toBe(false);
    });

    it("should reject non-array", () => {
      const result = InstanceListSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
        name: "Instance",
      });
      expect(result.success).toBe(false);
    });

    it("should accept single instance in list", () => {
      const result = InstanceListSchema.safeParse([
        {
          id: "clh1234567890abcdefghijkl",
          userId: "clh9876543210zyxwvutsrqpo",
          name: "Only Instance",
          flyAppName: "my-app-123",
          flyMachineId: "machine_123456",
          status: "RUNNING",
          region: "lax",
          ipAddress: "192.168.1.1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);
      expect(result.success).toBe(true);
    });
  });

  describe("CreateInstanceRequestSchema", () => {
    it("should accept valid create instance request", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My New Instance",
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should apply default region when not provided", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My New Instance",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.region).toBe("lax");
      }
    });

    it("should reject empty name", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "",
        region: "lax",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Name is required");
      }
    });

    it("should reject name longer than 50 characters", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "a".repeat(51),
        region: "lax",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Name must be 50 characters or less");
      }
    });

    it("should accept name exactly 50 characters", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "a".repeat(50),
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with one character", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "A",
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with special characters", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My-Instance_2024 (Production)",
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should accept different region codes", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My Instance",
        region: "fra",
      });
      expect(result.success).toBe(true);
    });

    it("should accept region with uppercase letters", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My Instance",
        region: "LAX",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with spaces", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My New Instance Name",
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should accept name with numbers", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "Instance 123",
        region: "lax",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        region: "lax",
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty region string (relies on default)", () => {
      const result = CreateInstanceRequestSchema.safeParse({
        name: "My Instance",
        region: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("InstanceIdParamSchema", () => {
    it("should accept valid instance ID", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "clh1234567890abcdefghijkl",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid CUID", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "invalid-id",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty string id", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing id", () => {
      const result = InstanceIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject null id", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject UUID format (not CUID)", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short CUID-like string", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "clh123",
      });
      expect(result.success).toBe(false);
    });

    it("should accept different valid CUID formats", () => {
      const result = InstanceIdParamSchema.safeParse({
        id: "clabcdefghijklmnopqrstuv",
      });
      expect(result.success).toBe(true);
    });
  });
});
