/**
 * Fly.io Provider
 *
 * Wraps the existing Fly.io service to implement the InstanceProvider interface.
 *
 * This provider has been refactored to use:
 * - MCP servers for integrations (GitHub, Slack, etc.)
 * - Configuration via environment variables
 * - Simplified startup script
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
 * Generate a startup script that configures OpenClaw with MCP servers.
 * This script runs before OpenClaw starts and sets up the configuration.
 */
function generateStartupScript(
  config: CreateInstanceConfig,
  instanceId?: string
): string {
  const commands: string[] = [];

  commands.push("echo '=== FasterClaw OpenClaw Initialization ==='");

  // Ensure workspace directory exists
  commands.push("mkdir -p ~/.openclaw/workspace");

  // Write AI credentials to OpenClaw's .env file
  // OpenClaw reads credentials from this file, not shell env vars
  commands.push(`
# Write AI credentials to OpenClaw's .env file
cat > ~/.openclaw/.env << CREDEOF
# AI Provider Credentials - Managed by FasterClaw
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
CREDEOF
echo "AI credentials written to ~/.openclaw/.env"
`);

  // Configure GitHub CLI if token is provided
  commands.push(`
# Configure GitHub CLI if token is provided
if [ -n "$GITHUB_TOKEN" ]; then
  echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null && echo "GitHub CLI authenticated" || echo "GitHub CLI auth failed"
fi
`);

  // Configure native Slack channel if tokens are provided
  // OpenClaw uses Socket Mode with appToken + botToken
  const hasSlack = Boolean(config.integrations?.slack) && Boolean(process.env.SLACK_APP_TOKEN);
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
  const hasGoogle = Boolean(config.integrations?.google);
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

    commands.push(`cat >> ~/.openclaw/workspace/SOUL.md << 'FASTERCLAW_EOF'
${soulAdditions}
FASTERCLAW_EOF`);
  }

  // Configure gateway settings
  commands.push(`
# Configure OpenClaw settings
node openclaw.mjs models set "${config.aiProvider}/${config.aiModel}" 2>/dev/null || true
node openclaw.mjs config set gateway.mode local 2>/dev/null || true
node openclaw.mjs config set channels.telegram.enabled true 2>/dev/null || true
node openclaw.mjs config set channels.telegram.dmPolicy open 2>/dev/null || true
node openclaw.mjs config set 'channels.telegram.allowFrom' '["*"]' 2>/dev/null || true
node openclaw.mjs config set plugins.entries.telegram.enabled true 2>/dev/null || true
echo "OpenClaw configured"
`);

  // Return a script that runs the commands then starts OpenClaw
  commands.push("echo 'Starting OpenClaw gateway...'");
  commands.push("exec node openclaw.mjs gateway");

  return commands.join("\n");
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

export const flyProvider: InstanceProvider = {
  name: "fly",

  async createInstance(config: CreateInstanceConfig): Promise<ProviderResult> {
    const flyAppName = `openclaw-${config.userId.slice(0, 8)}-${String(Date.now())}`.toLowerCase();

    // Create Fly app
    await createApp(flyAppName);

    // Build environment variables
    const env: Record<string, string> = {
      TELEGRAM_BOT_TOKEN: config.telegramBotToken,
      ...(config.aiProvider === "openai" && { OPENAI_API_KEY: config.aiApiKey }),
      ...(config.aiProvider === "anthropic" && { ANTHROPIC_API_KEY: config.aiApiKey }),
      ...(config.aiProvider === "google" && { GOOGLE_API_KEY: config.aiApiKey }),
      AI_MODEL: config.aiModel,
      AI_PROVIDER: config.aiProvider,
    };

    // Add integration tokens
    if (config.integrations?.github) {
      env.GITHUB_TOKEN = config.integrations.github;
    }

    // Slack: Pass both tokens for native OpenClaw Slack channel
    // - SLACK_APP_TOKEN: From FasterClaw's server env (shared for all users)
    // - SLACK_BOT_TOKEN: From user's OAuth (per-user workspace access)
    if (config.integrations?.slack && process.env.SLACK_APP_TOKEN) {
      env.SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;
      env.SLACK_BOT_TOKEN = config.integrations.slack;
    }

    // Note: Google tokens are NOT passed - they use secure proxy

    // Generate startup script with proxy instructions
    const startupScript = generateStartupScript(config, config.instanceId);

    // Create machine with env vars and startup script
    const machine = await createMachine(flyAppName, {
      region: config.region ?? "iad",
      config: {
        image: "fasterclaw/openclaw:latest", // Custom image with CLIs (gh, mcporter)
        env,
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
        init: {
          cmd: ["sh", "-c", startupScript],
        },
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
