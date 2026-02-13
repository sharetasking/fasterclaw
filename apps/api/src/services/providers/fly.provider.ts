/**
 * Fly.io Provider
 * Wraps the existing Fly.io service to implement the InstanceProvider interface.
 *
 * Chat and file upload use the Fly Machines exec API — the HTTP equivalent
 * of `docker exec` — so the same OpenClaw CLI commands work on both providers.
 */

import { randomUUID } from "crypto";
import {
  createApp,
  createMachine,
  startMachine,
  stopMachine,
  deleteMachine,
  deleteApp,
  getMachine,
  execOnMachine,
} from "../fly.js";
import type {
  InstanceProvider,
  CreateInstanceConfig,
  ProviderResult,
  ProviderInstanceData,
  ChatMessageResult,
  FileUploadResult,
} from "./types.js";

/**
 * Validate that the Fly.io-specific fields are present.
 */
function requireFlyData(data: ProviderInstanceData): { flyAppName: string; flyMachineId: string } {
  if (data.flyAppName == null || data.flyMachineId == null) {
    throw new Error("Missing Fly.io app name or machine ID");
  }
  return { flyAppName: data.flyAppName, flyMachineId: data.flyMachineId };
}

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

interface OpenClawAgentResponse {
  payloads: { text: string; mediaUrl: string | null }[];
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
          ...(config.telegramBotToken !== undefined && {
            TELEGRAM_BOT_TOKEN: config.telegramBotToken,
          }),
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
    const { flyAppName, flyMachineId } = requireFlyData(data);
    await startMachine(flyAppName, flyMachineId);
  },

  async stopInstance(data: ProviderInstanceData): Promise<void> {
    const { flyAppName, flyMachineId } = requireFlyData(data);
    await stopMachine(flyAppName, flyMachineId);
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
    if (data.flyAppName == null || data.flyMachineId == null) {
      return "UNKNOWN";
    }
    const machine = await getMachine(data.flyAppName, data.flyMachineId);
    return mapFlyState(machine.state);
  },

  async sendMessage(
    data: ProviderInstanceData,
    sessionId: string,
    message: string,
    timeoutSeconds = 120
  ): Promise<ChatMessageResult> {
    const { flyAppName, flyMachineId } = requireFlyData(data);

    // Use the Fly Machines exec API — same CLI command as Docker provider
    const result = await execOnMachine(
      flyAppName,
      flyMachineId,
      [
        "node",
        "openclaw.mjs",
        "agent",
        "--local",
        "--session-id",
        sessionId,
        "--message",
        message,
        "--json",
        "--timeout",
        String(timeoutSeconds),
      ],
      { timeout: timeoutSeconds + 10 }
    );

    // The agent may write warnings to stderr but still produce valid JSON on stdout
    const stdout = result.stdout;
    if (!stdout.includes('"payloads"')) {
      if (result.stderr) {
        throw new Error(`OpenClaw agent error: ${result.stderr}`);
      }
      throw new Error(`OpenClaw agent returned no output (exit code: ${String(result.exit_code)})`);
    }

    const parsed = JSON.parse(stdout) as OpenClawAgentResponse;

    if (parsed.payloads.length === 0) {
      return { response: "No response from assistant" };
    }

    return { response: parsed.payloads.map((p) => p.text).join("\n") };
  },

  async uploadFile(
    data: ProviderInstanceData,
    fileBuffer: Buffer,
    fileName: string
  ): Promise<FileUploadResult> {
    const { flyAppName, flyMachineId } = requireFlyData(data);

    // Ensure the uploads directory exists
    await execOnMachine(flyAppName, flyMachineId, ["mkdir", "-p", "/tmp/uploads"]);

    // Preserve the file extension
    const lastDot = fileName.lastIndexOf(".");
    const ext = lastDot !== -1 ? fileName.slice(lastDot) : "";
    const safeFilename = `${randomUUID()}${ext}`;
    const containerPath = `/tmp/uploads/${safeFilename}`;

    // Write the file via exec using base64 + heredoc piped through sh.
    // The Fly Machines exec API passes cmd as an argv array (no shell
    // interpolation), so the heredoc content is never parsed by a shell.
    // We chunk at 48 000 base64 chars (~36 KB decoded) to stay well under
    // typical exec argument-length limits (~128 KB on Linux).
    const CHUNK_SIZE = 48_000;
    const base64Content = fileBuffer.toString("base64");

    for (let offset = 0; offset < base64Content.length; offset += CHUNK_SIZE) {
      const chunk = base64Content.slice(offset, offset + CHUNK_SIZE);
      const op = offset === 0 ? ">" : ">>";
      await execOnMachine(flyAppName, flyMachineId, [
        "sh",
        "-c",
        `base64 -d ${op} ${containerPath} <<'B64EOF'\n${chunk}\nB64EOF`,
      ]);
    }

    return { filePath: containerPath };
  },
};
