/**
 * Workspace Files Builder
 *
 * Generates OpenClaw workspace files (SOUL.md, USER.md, etc.)
 * based on instance configuration.
 */

import type {
  InstanceWithRelations,
  InstanceIntegrationWithRelations,
  WorkspaceFiles,
} from "./types.js";

/**
 * Build workspace files for an instance
 */
export function buildWorkspaceFiles(instance: InstanceWithRelations): WorkspaceFiles {
  const files: WorkspaceFiles = {};

  // Build SOUL.md additions
  const soulAdditions = buildSoulAdditions(instance);
  if (soulAdditions) {
    files["SOUL.md"] = soulAdditions;
  }

  // Build USER.md if user info available
  if (instance.user) {
    files["USER.md"] = buildUserMd(instance.user);
  }

  // Build PROXY.md for proxy-based integrations
  const proxyInstructions = buildProxyInstructions(instance);
  if (proxyInstructions) {
    files["PROXY.md"] = proxyInstructions;
  }

  return files;
}

/**
 * Build SOUL.md additions (minimal - MCP handles most capabilities)
 */
function buildSoulAdditions(instance: InstanceWithRelations): string | undefined {
  const integrations = instance.instanceIntegrations;

  if (integrations.length === 0) {
    return undefined;
  }

  const mcpIntegrations = integrations.filter(
    (ii) => ii.userIntegration.integration.preferredMethod === "mcp"
  );
  const proxyIntegrations = integrations.filter(
    (ii) => ii.userIntegration.integration.preferredMethod === "proxy"
  );

  const sections: string[] = [];

  sections.push(`
---

## FasterClaw Instance

This instance is managed by FasterClaw (Instance ID: \`${instance.id}\`).
`);

  // MCP integrations section
  if (mcpIntegrations.length > 0) {
    sections.push(`
### MCP Integrations

The following integrations are available via MCP tools:

${mcpIntegrations
  .map((ii) => {
    const integration = ii.userIntegration.integration;
    const account = ii.userIntegration.accountIdentifier;
    return `- **${integration.name}**${account ? ` (${account})` : ""} - Use MCP tools for ${integration.provider} operations`;
  })
  .join("\n")}

MCP tools are automatically available. Use them directly for API operations.
`);
  }

  // Proxy integrations section
  if (proxyIntegrations.length > 0) {
    sections.push(`
### Secure Proxy Integrations

The following integrations use the FasterClaw secure proxy:

${proxyIntegrations
  .map((ii) => {
    const integration = ii.userIntegration.integration;
    const account = ii.userIntegration.accountIdentifier;
    return `- **${integration.name}**${account ? ` (${account})` : ""}`;
  })
  .join("\n")}

See PROXY.md for usage instructions.
`);
  }

  sections.push("---");

  return sections.join("\n");
}

/**
 * Build USER.md with user information
 */
function buildUserMd(user: { email: string; name: string | null }): string {
  return `# User Information

- **Name:** ${user.name || "Not specified"}
- **Email:** ${user.email}

This information helps personalize responses and identify the user in integrations.
`;
}

/**
 * Build PROXY.md with secure proxy instructions
 */
function buildProxyInstructions(instance: InstanceWithRelations): string | undefined {
  const proxyIntegrations = instance.instanceIntegrations.filter(
    (ii) => ii.userIntegration.integration.preferredMethod === "proxy"
  );

  if (proxyIntegrations.length === 0) {
    return undefined;
  }

  const proxyUrl = process.env.NGROK_DOMAIN
    ? `https://${process.env.NGROK_DOMAIN}`
    : process.env.API_URL || "http://localhost:3001";

  return `# FasterClaw Secure Proxy

Use the secure proxy for API calls. The proxy handles authentication automatically.

## Configuration

- **Proxy URL:** ${proxyUrl}
- **Instance ID:** ${instance.id}

## Available Providers

${proxyIntegrations
  .map((ii) => {
    const integration = ii.userIntegration.integration;
    return `### ${integration.name}

Provider: \`${integration.provider}\`

**Example Request:**
\`\`\`bash
curl -X POST "${proxyUrl}/proxy/v2/${integration.provider}/{action}" \\
  -H "Content-Type: application/json" \\
  -d '{"instanceId": "${instance.id}", "params": {}}'
\`\`\`

**Available Actions:**
- Use \`GET ${proxyUrl}/proxy/v2/actions\` to see all available actions
`;
  })
  .join("\n")}

## Important Notes

1. Always include the \`instanceId\` in your requests
2. The proxy handles token management - never include tokens in requests
3. Check the response for \`success: false\` to handle errors
`;
}

/**
 * Escape content for use in heredoc
 */
export function escapeForHeredoc(content: string): string {
  // Escape single quotes and backslashes for heredoc
  return content.replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}
