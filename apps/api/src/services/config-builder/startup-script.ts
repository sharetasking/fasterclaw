/**
 * Startup Script Builder
 *
 * Generates the startup script that configures OpenClaw
 * before starting the gateway.
 */

import type { StartupScriptConfig, WorkspaceFiles } from "./types.js";
import { escapeForHeredoc } from "./workspace.js";

/**
 * Build the startup script for container initialization
 *
 * This script:
 * 1. Decodes and writes openclaw.json
 * 2. Writes workspace files (SOUL.md additions, USER.md, etc.)
 * 3. Starts the OpenClaw gateway
 */
export function buildStartupScript(config: StartupScriptConfig): string {
  const commands: string[] = [];

  // Ensure directories exist
  commands.push("mkdir -p ~/.openclaw/workspace");

  // Write AI provider credentials to OpenClaw's .env file
  // OpenClaw reads credentials from ~/.openclaw/.env, not shell environment variables
  commands.push(`
# Write AI credentials to OpenClaw's .env file
# Using shell variable expansion (no heredoc quoting so vars expand)
cat > ~/.openclaw/.env << CREDEOF
# AI Provider Credentials - Managed by FasterClaw
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
CREDEOF
echo "AI credentials written to ~/.openclaw/.env"
`);

  // Write openclaw.json from base64 encoded env var
  commands.push(`
if [ -n "$OPENCLAW_CONFIG_B64" ]; then
  echo "$OPENCLAW_CONFIG_B64" | base64 -d > ~/.openclaw/openclaw.json
  echo "OpenClaw config written from OPENCLAW_CONFIG_B64"
fi
`);

  // Write workspace files
  for (const [filename, content] of Object.entries(config.workspaceFiles)) {
    if (content) {
      const escapedContent = escapeForHeredoc(content);
      // Append to existing files (like SOUL.md) rather than overwrite
      const appendOp = filename === "SOUL.md" ? ">>" : ">";
      commands.push(`
cat ${appendOp} ~/.openclaw/workspace/${filename} << 'FASTERCLAW_EOF'
${escapedContent}
FASTERCLAW_EOF
echo "Wrote ${filename}"
`);
    }
  }

  // Set AI model using OpenClaw CLI
  commands.push(`
node openclaw.mjs models set "${config.aiProvider}/${config.aiModel}" 2>/dev/null || true
echo "AI model set to ${config.aiProvider}/${config.aiModel}"
`);

  // Configure gateway and channels
  commands.push(`
node openclaw.mjs config set gateway.mode local 2>/dev/null || true
node openclaw.mjs config set channels.telegram.enabled true 2>/dev/null || true
node openclaw.mjs config set channels.telegram.dmPolicy open 2>/dev/null || true
node openclaw.mjs config set 'channels.telegram.allowFrom' '["*"]' 2>/dev/null || true
node openclaw.mjs config set plugins.entries.telegram.enabled true 2>/dev/null || true
echo "OpenClaw configured"
`);

  // Start the gateway
  commands.push(`
echo "Starting OpenClaw gateway..."
exec node openclaw.mjs gateway
`);

  return commands.join("\n");
}

/**
 * Build a minimal startup script for when no special configuration is needed
 */
export function buildMinimalStartupScript(aiProvider: string, aiModel: string): string {
  return `#!/bin/sh
set -e

# Ensure directories exist
mkdir -p ~/.openclaw

# Write AI credentials to OpenClaw's .env file
cat > ~/.openclaw/.env << CREDEOF
# AI Provider Credentials - Managed by FasterClaw
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
CREDEOF
echo "AI credentials written to ~/.openclaw/.env"

# Set AI model
node openclaw.mjs models set "${aiProvider}/${aiModel}" 2>/dev/null || true

# Configure basic settings
node openclaw.mjs config set gateway.mode local 2>/dev/null || true
node openclaw.mjs config set channels.telegram.enabled true 2>/dev/null || true
node openclaw.mjs config set channels.telegram.dmPolicy open 2>/dev/null || true
node openclaw.mjs config set 'channels.telegram.allowFrom' '["*"]' 2>/dev/null || true
node openclaw.mjs config set plugins.entries.telegram.enabled true 2>/dev/null || true

echo "Starting OpenClaw gateway..."
exec node openclaw.mjs gateway
`;
}

/**
 * Build startup script for Docker provider
 * Uses environment variables that are set during docker run
 */
export function buildDockerStartupScript(config: StartupScriptConfig): string {
  return buildStartupScript(config);
}

/**
 * Build startup script for Fly.io provider
 * Similar to Docker but may have different paths
 */
export function buildFlyStartupScript(config: StartupScriptConfig): string {
  // Fly.io uses the same script structure
  return buildStartupScript(config);
}
