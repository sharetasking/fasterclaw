/**
 * Fly.io Provider
 * Wraps the existing Fly.io service to implement the InstanceProvider interface
 */

import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
  getMachine,
} from "../fly.js";
import type {
  InstanceProvider,
  CreateInstanceConfig,
  ProviderResult,
  ProviderInstanceData,
} from "./types.js";

/**
 * Map Fly.io machine state to our instance status.
 */
function mapFlyState(flyState: string): string {
  switch (flyState) {
    case "started":
      return "RUNNING";
    case "starting":
      return "STARTING";
    case "stopping":
      return "STOPPING";
    case "stopped":
    case "suspended":
      return "STOPPED";
    case "destroyed":
      return "DELETED";
    case "created":
    case "replacing":
      return "CREATING";
    default:
      return "UNKNOWN";
  }
}

export const flyProvider: InstanceProvider = {
  name: "fly",

  async createInstance(config: CreateInstanceConfig): Promise<ProviderResult> {
    const flyAppName = `openclaw-${config.userId.slice(0, 8)}-${String(Date.now())}`.toLowerCase();

    // Create Fly app
    await createApp(flyAppName);

    // Create machine with env vars
    const machine = await createMachine(flyAppName, {
      region: config.region ?? "iad",
      config: {
        image: "ghcr.io/openclaw/openclaw:latest",
        env: {
          TELEGRAM_BOT_TOKEN: config.telegramBotToken,
          ...(config.aiProvider === "openai" && { OPENAI_API_KEY: config.aiApiKey }),
          ...(config.aiProvider === "anthropic" && { ANTHROPIC_API_KEY: config.aiApiKey }),
          ...(config.aiProvider === "google" && { GOOGLE_API_KEY: config.aiApiKey }),
          AI_MODEL: config.aiModel,
          AI_PROVIDER: config.aiProvider,
        },
        services: [
          {
            ports: [
              { port: 80, handlers: ["http"] },
              { port: 443, handlers: ["tls", "http"] },
            ],
            protocol: "tcp",
            internal_port: 8080,
          },
        ],
      },
    });

    return {
      providerId: machine.id,
      providerAppId: flyAppName,
      ipAddress: machine.private_ip,
    };
  },

  async startInstance(data: ProviderInstanceData): Promise<void> {
    if (
      data.flyAppName === null ||
      data.flyAppName === undefined ||
      data.flyMachineId === null ||
      data.flyMachineId === undefined
    ) {
      throw new Error("Missing Fly.io app name or machine ID");
    }
    await startMachine(data.flyAppName, data.flyMachineId);
  },

  async stopInstance(data: ProviderInstanceData): Promise<void> {
    if (
      data.flyAppName === null ||
      data.flyAppName === undefined ||
      data.flyMachineId === null ||
      data.flyMachineId === undefined
    ) {
      throw new Error("Missing Fly.io app name or machine ID");
    }
    await stopMachine(data.flyAppName, data.flyMachineId);
  },

  async deleteInstance(data: ProviderInstanceData): Promise<void> {
    if (data.flyAppName === null || data.flyAppName === undefined) {
      return;
    }

    if (data.flyMachineId !== null && data.flyMachineId !== undefined) {
      await deleteMachine(data.flyAppName, data.flyMachineId);
    }
    await deleteApp(data.flyAppName);
  },

  async getInstanceStatus(data: ProviderInstanceData): Promise<string> {
    if (
      data.flyAppName === null ||
      data.flyAppName === undefined ||
      data.flyMachineId === null ||
      data.flyMachineId === undefined
    ) {
      return "UNKNOWN";
    }
    const machine = await getMachine(data.flyAppName, data.flyMachineId);
    return mapFlyState(machine.state);
  },
};
