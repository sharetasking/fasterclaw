/**
 * MCP Configuration Builder
 *
 * Builds MCP (Model Context Protocol) server configuration
 * based on enabled integrations.
 */

import type { McpConfig } from "@fasterclaw/shared";
import type { InstanceIntegrationWithRelations, McpServerEntry } from "./types.js";

/**
 * Build MCP server configuration from enabled integrations
 *
 * @param integrations - List of enabled instance integrations
 * @returns MCP configuration object or undefined if no MCP integrations
 */
export function buildMcpConfig(
  integrations: InstanceIntegrationWithRelations[]
): McpConfig | undefined {
  const servers: Record<string, McpServerEntry> = {};

  for (const ii of integrations) {
    const integration = ii.userIntegration.integration;
    const mcpServer = integration.mcpServer;

    // Skip if no MCP server or method is not 'mcp'
    if (!mcpServer || integration.preferredMethod !== "mcp") {
      continue;
    }

    // Build env vars mapping
    // These reference environment variables that will be set on the container
    const env: Record<string, string> = {};
    for (const envVar of mcpServer.requiredEnvVars) {
      // Use shell variable syntax so OpenClaw can resolve at runtime
      env[envVar] = `\${${envVar}}`;
    }

    servers[integration.provider] = {
      command: "npx",
      args: ["-y", mcpServer.npmPackage],
      ...(Object.keys(env).length > 0 && { env }),
    };
  }

  // Return undefined if no MCP servers configured
  if (Object.keys(servers).length === 0) {
    return undefined;
  }

  return { servers };
}

/**
 * Get the environment variable name for a provider's token
 */
export function getTokenEnvVar(provider: string): string {
  const envVarMap: Record<string, string> = {
    github: "GITHUB_TOKEN",
    slack: "SLACK_BOT_TOKEN",
    google: "GOOGLE_OAUTH_TOKEN",
    "google-drive": "GOOGLE_OAUTH_TOKEN",
    gmail: "GOOGLE_OAUTH_TOKEN",
    "google-calendar": "GOOGLE_OAUTH_TOKEN",
  };

  return envVarMap[provider] || `${provider.toUpperCase()}_TOKEN`;
}

/**
 * Build environment variables for MCP servers from decrypted tokens
 *
 * @param integrations - List of enabled integrations
 * @param decryptedTokens - Map of integration ID to decrypted token
 * @returns Environment variables to set on container
 */
export function buildMcpEnvVars(
  integrations: InstanceIntegrationWithRelations[],
  decryptedTokens: Map<string, string>
): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const ii of integrations) {
    const integration = ii.userIntegration.integration;

    // Only add env vars for MCP-based integrations
    if (integration.preferredMethod !== "mcp") {
      continue;
    }

    const token = decryptedTokens.get(ii.userIntegration.id);
    if (token) {
      const envVar = getTokenEnvVar(integration.provider);
      envVars[envVar] = token;
    }
  }

  return envVars;
}
