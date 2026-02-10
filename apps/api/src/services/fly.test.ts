import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
  getMachine,
  listMachines,
} from "./fly";

describe("Fly.io Service", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  const originalToken = process.env.FLY_API_TOKEN;
  const originalOrgSlug = process.env.FLY_ORG_SLUG;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    process.env.FLY_API_TOKEN = "fly_test_token";
    process.env.FLY_ORG_SLUG = "test-org";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.FLY_API_TOKEN = originalToken;
    process.env.FLY_ORG_SLUG = originalOrgSlug;
  });

  describe("createApp", () => {
    it("should create a new app successfully", async () => {
      const appName = "test-app";
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ app_name: appName }),
      });

      await createApp(appName);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.machines.dev/v1/apps",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_name: appName,
            org_slug: "test-org",
          }),
        })
      );
    });

    it("should use personal org_slug when FLY_ORG_SLUG is not set", async () => {
      delete process.env.FLY_ORG_SLUG;
      const appName = "test-app";
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ app_name: appName }),
      });

      await createApp(appName);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.machines.dev/v1/apps",
        expect.objectContaining({
          body: JSON.stringify({
            app_name: appName,
            org_slug: "personal",
          }),
        })
      );
    });

    it("should throw error on API error response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request: Invalid app name",
      });

      await expect(createApp("invalid-app")).rejects.toThrow(
        "Fly.io API error: 400 Bad Request: Invalid app name"
      );
    });

    it("should handle 401 unauthorized error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(createApp("test-app")).rejects.toThrow("Fly.io API error: 401 Unauthorized");
    });

    it("should handle 500 server error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(createApp("test-app")).rejects.toThrow(
        "Fly.io API error: 500 Internal Server Error"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(createApp("test-app")).rejects.toThrow("Network error");
    });
  });

  describe("createMachine", () => {
    const appName = "test-app";
    const machineConfig = {
      region: "iad",
      config: {
        image: "openclaw:latest",
        services: [
          {
            ports: [{ port: 443, handlers: ["tls", "http"] }],
            protocol: "tcp",
            internal_port: 8080,
          },
        ],
        env: {
          PORT: "8080",
        },
      },
    };

    const mockMachine = {
      id: "machine_123",
      name: "test-app-machine",
      state: "created",
      region: "iad",
      instance_id: "instance_456",
      private_ip: "10.0.0.1",
      config: machineConfig.config,
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should create a machine successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMachine,
      });

      const result = await createMachine(appName, machineConfig);

      expect(result).toEqual(mockMachine);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `${appName}-machine`,
            region: machineConfig.region,
            config: machineConfig.config,
          }),
        })
      );
    });

    it("should handle API error during machine creation", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid machine configuration",
      });

      await expect(createMachine(appName, machineConfig)).rejects.toThrow(
        "Fly.io API error: 400 Invalid machine configuration"
      );
    });

    it("should handle 404 app not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "App not found",
      });

      await expect(createMachine(appName, machineConfig)).rejects.toThrow(
        "Fly.io API error: 404 App not found"
      );
    });
  });

  describe("startMachine", () => {
    const appName = "test-app";
    const machineId = "machine_123";

    it("should start a machine successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await startMachine(appName, machineId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/start`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle machine not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Machine not found",
      });

      await expect(startMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 404 Machine not found"
      );
    });

    it("should handle machine already running error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Machine is already running",
      });

      await expect(startMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 400 Machine is already running"
      );
    });
  });

  describe("stopMachine", () => {
    const appName = "test-app";
    const machineId = "machine_123";

    it("should stop a machine successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await stopMachine(appName, machineId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/stop`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle machine not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Machine not found",
      });

      await expect(stopMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 404 Machine not found"
      );
    });

    it("should handle machine already stopped error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Machine is already stopped",
      });

      await expect(stopMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 400 Machine is already stopped"
      );
    });
  });

  describe("deleteMachine", () => {
    const appName = "test-app";
    const machineId = "machine_123";

    it("should delete a machine successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await deleteMachine(appName, machineId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}`,
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle machine not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Machine not found",
      });

      await expect(deleteMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 404 Machine not found"
      );
    });

    it("should handle machine still running error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Cannot delete running machine",
      });

      await expect(deleteMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 400 Cannot delete running machine"
      );
    });
  });

  describe("deleteApp", () => {
    const appName = "test-app";

    it("should delete an app successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await deleteApp(appName);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}`,
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle app not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "App not found",
      });

      await expect(deleteApp(appName)).rejects.toThrow("Fly.io API error: 404 App not found");
    });

    it("should handle app has running machines error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Cannot delete app with running machines",
      });

      await expect(deleteApp(appName)).rejects.toThrow(
        "Fly.io API error: 400 Cannot delete app with running machines"
      );
    });
  });

  describe("getMachine", () => {
    const appName = "test-app";
    const machineId = "machine_123";
    const mockMachine = {
      id: machineId,
      name: "test-machine",
      state: "started",
      region: "iad",
      instance_id: "instance_456",
      private_ip: "10.0.0.1",
      config: {
        image: "openclaw:latest",
      },
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should get machine status successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMachine,
      });

      const result = await getMachine(appName, machineId);

      expect(result).toEqual(mockMachine);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}`,
        expect.objectContaining({
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle machine not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Machine not found",
      });

      await expect(getMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 404 Machine not found"
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      await expect(getMachine(appName, machineId)).rejects.toThrow(
        "Fly.io API error: 500 Internal server error"
      );
    });
  });

  describe("listMachines", () => {
    const appName = "test-app";
    const mockMachines = [
      {
        id: "machine_123",
        name: "test-machine-1",
        state: "started",
        region: "iad",
        instance_id: "instance_456",
        private_ip: "10.0.0.1",
        config: {
          image: "openclaw:latest",
        },
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "machine_789",
        name: "test-machine-2",
        state: "stopped",
        region: "iad",
        instance_id: "instance_012",
        private_ip: "10.0.0.2",
        config: {
          image: "openclaw:latest",
        },
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    it("should list all machines successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockMachines,
      });

      const result = await listMachines(appName);

      expect(result).toEqual(mockMachines);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines`,
        expect.objectContaining({
          headers: {
            Authorization: "Bearer fly_test_token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should return empty array when no machines exist", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await listMachines(appName);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle app not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "App not found",
      });

      await expect(listMachines(appName)).rejects.toThrow("Fly.io API error: 404 App not found");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      await expect(listMachines(appName)).rejects.toThrow(
        "Fly.io API error: 500 Internal server error"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network timeout"));

      await expect(listMachines(appName)).rejects.toThrow("Network timeout");
    });
  });

  describe("API request error handling", () => {
    it("should include status code in error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
      });

      await expect(createApp("test-app")).rejects.toThrow("Fly.io API error: 403 Forbidden");
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(createApp("test-app")).rejects.toThrow("Invalid JSON");
    });

    it("should preserve error text from API", async () => {
      const errorMessage = "Detailed error message from API";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => errorMessage,
      });

      await expect(createApp("test-app")).rejects.toThrow(`Fly.io API error: 422 ${errorMessage}`);
    });
  });

  describe("API request headers", () => {
    it("should include authorization header in all requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await createApp("test-app");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer fly_test_token",
          }),
        })
      );
    });

    it("should include content-type header in all requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await createApp("test-app");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  describe("API request URLs", () => {
    it("should use correct base URL for all requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await createApp("test-app");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.machines.dev/v1"),
        expect.any(Object)
      );
    });

    it("should format app-specific URLs correctly", async () => {
      const appName = "my-test-app";
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await deleteApp(appName);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}`,
        expect.any(Object)
      );
    });

    it("should format machine-specific URLs correctly", async () => {
      const appName = "test-app";
      const machineId = "machine_123";
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await startMachine(appName, machineId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/start`,
        expect.any(Object)
      );
    });
  });
});
