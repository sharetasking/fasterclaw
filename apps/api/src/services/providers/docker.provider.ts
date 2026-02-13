/**
 * Docker Provider
 *
 * Uses Docker CLI commands to manage local containers for development/testing.
 * No additional npm packages required - uses child_process to run docker commands.
 *
 * This provider has been refactored to use:
 * - MCP servers for integrations (GitHub, Slack, etc.)
 * - Configuration builder for generating openclaw.json
 * - Simplified startup script
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

// Use custom FasterClaw image with CLIs pre-installed (gh, mcporter)
// Build from: docker/openclaw/Dockerfile
const OPENCLAW_IMAGE = "fasterclaw/openclaw:latest";

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
 * Build the startup script for Docker container.
 * This script runs when the container starts and:
 * 1. Writes AI credentials to ~/.openclaw/.env
 * 2. Configures GitHub CLI if token provided
 * 3. Writes proxy instructions to SOUL.md
 * 4. Configures OpenClaw settings
 * 5. Starts the gateway
 */
function buildDockerStartupScript(
  config: CreateInstanceConfig
): string {
  const { aiProvider, aiModel, instanceId, integrations } = config;

  const commands: string[] = [];

  commands.push(`#!/bin/sh
set -e

echo "=== FasterClaw OpenClaw Initialization ==="

# Ensure directories exist
mkdir -p ~/.openclaw/workspace

# Write AI credentials to OpenClaw's .env file
# OpenClaw reads credentials from this file, not shell env vars
cat > ~/.openclaw/.env << CREDEOF
# AI Provider Credentials - Managed by FasterClaw
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
CREDEOF
echo "AI credentials written to ~/.openclaw/.env"

# Configure GitHub CLI if token is provided
if [ -n "$GITHUB_TOKEN" ]; then
  echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null && echo "GitHub CLI authenticated" || echo "GitHub CLI auth failed"
fi`);

  // Configure native Slack channel if tokens are provided
  // OpenClaw uses Socket Mode with appToken + botToken
  const hasSlack = Boolean(integrations?.slack) && Boolean(process.env.SLACK_APP_TOKEN);
  if (hasSlack) {
    commands.push(`
# Configure native Slack channel (Socket Mode)
if [ -n "$SLACK_APP_TOKEN" ] && [ -n "$SLACK_BOT_TOKEN" ]; then
  node openclaw.mjs config set channels.slack.enabled true 2>/dev/null || true
  node openclaw.mjs config set channels.slack.mode socket 2>/dev/null || true
  node openclaw.mjs config set channels.slack.appToken "$SLACK_APP_TOKEN" 2>/dev/null || true
  node openclaw.mjs config set channels.slack.botToken "$SLACK_BOT_TOKEN" 2>/dev/null || true
  node openclaw.mjs config set channels.slack.dmPolicy open 2>/dev/null || true
  node openclaw.mjs config set channels.slack.groupPolicy open 2>/dev/null || true
  node openclaw.mjs config set plugins.entries.slack.enabled true 2>/dev/null || true
  echo "Slack channel configured (Socket Mode)"
fi

# Add multi-channel awareness to SOUL.md
cat >> ~/.openclaw/workspace/SOUL.md << 'CHANNELEOF'

---

## Multi-Channel Setup

You are connected to multiple communication channels simultaneously:

- **Telegram**: You receive and respond to messages via Telegram
- **Slack**: You receive and respond to messages via Slack

**Important**: When someone messages you, you are ALREADY responding in their channel.
- If a message comes from Slack, your response goes directly to Slack
- If a message comes from Telegram, your response goes directly to Telegram

You do NOT need to ask "should I send this to Slack?" - you are already IN that channel.

### Cross-Channel Messaging
You CAN send messages to a different channel using the slack or telegram tools:
- Use the \`slack\` tool to send a message TO Slack from Telegram
- This is useful when someone on Telegram asks you to notify someone on Slack

---
CHANNELEOF
echo "Multi-channel awareness added to SOUL.md"`);
  }

  // Add proxy instructions for Google (still uses proxy - gog CLI doesn't work on Linux)
  const hasGoogle = Boolean(integrations?.google);
  if (hasGoogle && instanceId) {
    const proxyUrl = process.env.NGROK_DOMAIN
      ? `https://${process.env.NGROK_DOMAIN}`
      : process.env.API_URL || "http://localhost:3001";

    const soulAdditions = `

---

## FasterClaw Instance

This instance is managed by FasterClaw (Instance ID: \\\`${instanceId}\\\`).

### Google Services (via Secure Proxy)

For Google services (Gmail, Calendar), use the secure proxy:

\\\`\\\`\\\`bash
curl -X POST "${proxyUrl}/proxy/v2/google/{action}" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"instanceId": "${instanceId}", "params": {}}'
\\\`\\\`\\\`

Available Google actions:
- \\\`list-emails\\\` - List recent emails
- \\\`get-email\\\` - Get email by ID (params: id)
- \\\`send-email\\\` - Send an email (params: to, subject, body)
- \\\`list-events\\\` - List calendar events
- \\\`create-event\\\` - Create event (params: summary, start, end)

---
`;

    commands.push(`
# Write Google proxy instructions to SOUL.md
cat >> ~/.openclaw/workspace/SOUL.md << 'FASTERCLAW_EOF'
${soulAdditions}
FASTERCLAW_EOF
echo "Google proxy instructions written to SOUL.md"`);
  }

  commands.push(`

# Set AI model
node openclaw.mjs models set "${aiProvider}/${aiModel}" 2>/dev/null || true
echo "AI model set to ${aiProvider}/${aiModel}"

# Configure gateway and channels
node openclaw.mjs config set gateway.mode local 2>/dev/null || true
node openclaw.mjs config set channels.telegram.enabled true 2>/dev/null || true
node openclaw.mjs config set channels.telegram.dmPolicy open 2>/dev/null || true
node openclaw.mjs config set 'channels.telegram.allowFrom' '["*"]' 2>/dev/null || true
node openclaw.mjs config set plugins.entries.telegram.enabled true 2>/dev/null || true
echo "OpenClaw configured"

echo "Starting OpenClaw gateway..."
exec node openclaw.mjs gateway`);

  return commands.join("\n");
}

// NOTE: MCP configuration removed - OpenClaw doesn't support native MCP
// GitHub uses gh CLI (configured in startup script)
// Slack and Google use secure proxy (instructions added to SOUL.md in startup script)

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

    // Add integration tokens
    if (config.integrations?.github) {
      runArgs.push("-e", `GITHUB_TOKEN=${config.integrations.github}`);
    }

    // Slack: Pass both tokens for native OpenClaw Slack channel
    // - SLACK_APP_TOKEN: From FasterClaw's server env (shared for all users)
    // - SLACK_BOT_TOKEN: From user's OAuth (per-user workspace access)
    if (config.integrations?.slack && process.env.SLACK_APP_TOKEN) {
      runArgs.push("-e", `SLACK_APP_TOKEN=${process.env.SLACK_APP_TOKEN}`);
      runArgs.push("-e", `SLACK_BOT_TOKEN=${config.integrations.slack}`);
    }

    // Note: Google tokens are NOT passed - they use secure proxy

    // Build the startup script (handles AI credentials, GitHub CLI, and proxy instructions)
    const startupScript = buildDockerStartupScript(config);

    // Add port mapping, use custom entrypoint with startup script
    runArgs.push(
      "-p", "18789",
      "--entrypoint", "sh",
      OPENCLAW_IMAGE,
      "-c", startupScript
    );

    // Create and start container with port 18789 (OpenClaw default)
    const containerId = await dockerExec(runArgs);

    // Get the assigned port
    const port = await getContainerPort(containerId);

    console.log(`Container ${containerName} created with startup script`);

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
