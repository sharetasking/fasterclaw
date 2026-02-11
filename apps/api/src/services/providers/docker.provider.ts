/**
 * Docker Provider
 * Uses Docker CLI commands to manage local containers for development/testing.
 * No additional npm packages required - uses child_process to run docker commands.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import type {
  InstanceProvider,
  CreateInstanceConfig,
  ProviderResult,
  ProviderInstanceData,
} from "./types.js";

const execFileAsync = promisify(execFile);

const OPENCLAW_IMAGE = "ghcr.io/openclaw/openclaw:latest";

/**
 * Execute a docker command with arguments (safe from shell injection).
 */
async function dockerExec(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("docker", args);
    return stdout.trim();
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(`Docker command failed: ${err.stderr ?? err.message ?? "Unknown error"}`);
  }
}

/**
 * Check if Docker is available and running.
 */
async function checkDockerAvailable(): Promise<void> {
  try {
    await dockerExec(["version", "--format", "{{.Server.Version}}"]);
  } catch {
    throw new Error("Docker is not available. Please ensure Docker Desktop is running.");
  }
}

/**
 * Pull the OpenClaw image if not already present.
 */
async function ensureImageExists(): Promise<void> {
  try {
    await dockerExec(["image", "inspect", OPENCLAW_IMAGE]);
  } catch {
    // Image doesn't exist, pull it
    console.log(`Pulling ${OPENCLAW_IMAGE}...`);
    await dockerExec(["pull", OPENCLAW_IMAGE]);
  }
}

/**
 * Get container status from docker inspect.
 */
async function getContainerState(containerId: string): Promise<string> {
  try {
    const result = await dockerExec(["inspect", "--format", "{{.State.Status}}", containerId]);
    return result.replace(/['"]/g, "");
  } catch {
    return "removed";
  }
}

/**
 * Map Docker container state to our instance status.
 */
function mapDockerState(dockerState: string): string {
  switch (dockerState) {
    case "running":
      return "RUNNING";
    case "created":
    case "restarting":
      return "STARTING";
    case "paused":
    case "exited":
    case "dead":
      return "STOPPED";
    case "removing":
      return "STOPPING";
    case "removed":
      return "DELETED";
    default:
      return "UNKNOWN";
  }
}

/**
 * Get the mapped host port for a container.
 * OpenClaw uses port 18789 by default.
 */
async function getContainerPort(containerId: string): Promise<number | undefined> {
  try {
    const result = await dockerExec(["port", containerId, "18789/tcp"]);
    // Output format: "0.0.0.0:32768" or ":::32768"
    const match = /:(\d+)$/.exec(result);
    return match ? parseInt(match[1], 10) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Wait for container to be ready and configure OpenClaw.
 * Enables gateway mode, Telegram plugin, and open DM policy for development.
 */
async function configureOpenClaw(containerName: string): Promise<void> {
  // Wait for container to initialize
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Configure gateway mode
    await execFileAsync("docker", [
      "exec",
      containerName,
      "node",
      "openclaw.mjs",
      "config",
      "set",
      "gateway.mode",
      "local",
    ]);

    // Enable Telegram channel
    await execFileAsync("docker", [
      "exec",
      containerName,
      "node",
      "openclaw.mjs",
      "config",
      "set",
      "channels.telegram.enabled",
      "true",
    ]);

    // Enable Telegram plugin
    await execFileAsync("docker", [
      "exec",
      containerName,
      "node",
      "openclaw.mjs",
      "config",
      "set",
      "plugins.entries.telegram.enabled",
      "true",
    ]);

    // Set open DM policy for development (no pairing required)
    await execFileAsync("docker", [
      "exec",
      containerName,
      "node",
      "openclaw.mjs",
      "config",
      "set",
      "channels.telegram.allowFrom",
      '["*"]',
    ]);
    await execFileAsync("docker", [
      "exec",
      containerName,
      "node",
      "openclaw.mjs",
      "config",
      "set",
      "channels.telegram.dmPolicy",
      "open",
    ]);

    // Restart the gateway to apply changes
    await dockerExec(["restart", containerName]);

    console.log(`OpenClaw configured for container ${containerName}`);
  } catch (error) {
    console.error(`Failed to configure OpenClaw: ${String(error)}`);
    // Don't throw - container is running, just not fully configured
  }
}

export const dockerProvider: InstanceProvider = {
  name: "docker",

  async createInstance(config: CreateInstanceConfig): Promise<ProviderResult> {
    await checkDockerAvailable();
    await ensureImageExists();

    const containerName = `openclaw-${config.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${String(Date.now())}`;

    // Generate a cryptographically secure random gateway token
    const gatewayToken = randomBytes(24).toString("hex");

    // Build docker run arguments
    const runArgs: string[] = [
      "run",
      "-d",
      "--name",
      containerName,
      "-e",
      "NODE_ENV=production",
      "-e",
      `TELEGRAM_BOT_TOKEN=${config.telegramBotToken}`,
      "-e",
      `OPENCLAW_GATEWAY_TOKEN=${gatewayToken}`,
      "-e",
      "OPENCLAW_DISABLE_BONJOUR=1", // Disable mDNS in containers
    ];

    // Add the correct API key based on provider
    if (config.aiProvider === "openai") {
      runArgs.push("-e", `OPENAI_API_KEY=${config.aiApiKey}`);
    } else if (config.aiProvider === "anthropic") {
      runArgs.push("-e", `ANTHROPIC_API_KEY=${config.aiApiKey}`);
    } else {
      runArgs.push("-e", `GOOGLE_API_KEY=${config.aiApiKey}`);
    }

    // Add port mapping and image
    runArgs.push("-p", "18789", OPENCLAW_IMAGE);

    // Create and start container with port 18789 (OpenClaw default)
    const containerId = await dockerExec(runArgs);

    // Get the assigned port
    const port = await getContainerPort(containerId);

    // Configure OpenClaw in background (don't block return)
    void configureOpenClaw(containerName);

    return {
      providerId: containerId.slice(0, 12), // Short container ID
      providerAppId: containerName,
      ipAddress: "localhost",
      port,
    };
  },

  async startInstance(data: ProviderInstanceData): Promise<void> {
    if (data.dockerContainerId === null || data.dockerContainerId === undefined) {
      throw new Error("Missing Docker container ID");
    }
    await checkDockerAvailable();
    await dockerExec(["start", data.dockerContainerId]);
  },

  async stopInstance(data: ProviderInstanceData): Promise<void> {
    if (data.dockerContainerId === null || data.dockerContainerId === undefined) {
      throw new Error("Missing Docker container ID");
    }
    await checkDockerAvailable();
    await dockerExec(["stop", data.dockerContainerId]);
  },

  async deleteInstance(data: ProviderInstanceData): Promise<void> {
    if (data.dockerContainerId === null || data.dockerContainerId === undefined) {
      return;
    }

    await checkDockerAvailable();
    // Force remove (stops if running)
    await dockerExec(["rm", "-f", data.dockerContainerId]);
  },

  async getInstanceStatus(data: ProviderInstanceData): Promise<string> {
    if (data.dockerContainerId === null || data.dockerContainerId === undefined) {
      return "UNKNOWN";
    }
    await checkDockerAvailable();
    const state = await getContainerState(data.dockerContainerId);
    return mapDockerState(state);
  },
};
