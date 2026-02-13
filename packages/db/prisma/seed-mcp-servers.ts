/**
 * Seed MCP Servers
 *
 * This script seeds the available MCP (Model Context Protocol) servers
 * that can be used for integrations.
 *
 * Run with: pnpm ts-node prisma/seed-mcp-servers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mcpServers = [
  {
    provider: "github",
    name: "GitHub MCP Server",
    description:
      "Full GitHub API access via Model Context Protocol. Provides tools for repositories, issues, pull requests, and more.",
    npmPackage: "@modelcontextprotocol/server-github",
    version: "latest",
    requiredEnvVars: ["GITHUB_TOKEN"],
    capabilities: [
      "list-repos",
      "get-repo",
      "create-repo",
      "list-issues",
      "get-issue",
      "create-issue",
      "update-issue",
      "close-issue",
      "list-prs",
      "get-pr",
      "create-pr",
      "merge-pr",
      "get-file",
      "create-file",
      "update-file",
      "list-branches",
      "create-branch",
      "list-commits",
      "search-code",
      "search-repos",
    ],
    isOfficial: true,
    documentationUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
  },
  {
    provider: "slack",
    name: "Slack MCP Server",
    description:
      "Slack workspace integration via Model Context Protocol. Send messages, manage channels, and interact with your workspace.",
    npmPackage: "@modelcontextprotocol/server-slack",
    version: "latest",
    requiredEnvVars: ["SLACK_BOT_TOKEN"],
    capabilities: [
      "list-channels",
      "get-channel",
      "join-channel",
      "leave-channel",
      "send-message",
      "reply-to-thread",
      "update-message",
      "delete-message",
      "list-messages",
      "search-messages",
      "add-reaction",
      "remove-reaction",
      "list-users",
      "get-user",
      "upload-file",
      "list-files",
    ],
    isOfficial: true,
    documentationUrl: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
  },
  {
    provider: "google-drive",
    name: "Google Drive MCP Server",
    description:
      "Google Drive file access via Model Context Protocol. List, read, create, and manage files in Google Drive.",
    npmPackage: "@anthropic/mcp-server-google-drive",
    version: "latest",
    requiredEnvVars: ["GOOGLE_OAUTH_TOKEN"],
    capabilities: [
      "list-files",
      "get-file",
      "read-file",
      "create-file",
      "update-file",
      "delete-file",
      "search-files",
      "share-file",
      "list-folders",
      "create-folder",
      "move-file",
      "copy-file",
    ],
    isOfficial: true,
    documentationUrl: "https://github.com/anthropics/mcp-servers/tree/main/src/google-drive",
  },
  {
    provider: "gmail",
    name: "Gmail MCP Server",
    description:
      "Gmail integration via Model Context Protocol. Read, send, and manage emails.",
    npmPackage: "@anthropic/mcp-server-gmail",
    version: "latest",
    requiredEnvVars: ["GOOGLE_OAUTH_TOKEN"],
    capabilities: [
      "list-messages",
      "get-message",
      "send-message",
      "reply-to-message",
      "forward-message",
      "delete-message",
      "list-labels",
      "add-label",
      "remove-label",
      "search-messages",
      "list-threads",
      "get-thread",
    ],
    isOfficial: true,
    documentationUrl: "https://github.com/anthropics/mcp-servers/tree/main/src/gmail",
  },
  {
    provider: "google-calendar",
    name: "Google Calendar MCP Server",
    description:
      "Google Calendar integration via Model Context Protocol. Manage events and calendars.",
    npmPackage: "@anthropic/mcp-server-google-calendar",
    version: "latest",
    requiredEnvVars: ["GOOGLE_OAUTH_TOKEN"],
    capabilities: [
      "list-calendars",
      "get-calendar",
      "list-events",
      "get-event",
      "create-event",
      "update-event",
      "delete-event",
      "list-upcoming",
      "find-free-time",
    ],
    isOfficial: true,
    documentationUrl: "https://github.com/anthropics/mcp-servers/tree/main/src/google-calendar",
  },
];

async function seedMcpServers() {
  console.log("Seeding MCP servers...");

  for (const server of mcpServers) {
    const result = await prisma.mcpServer.upsert({
      where: { provider: server.provider },
      update: {
        name: server.name,
        description: server.description,
        npmPackage: server.npmPackage,
        version: server.version,
        requiredEnvVars: server.requiredEnvVars,
        capabilities: server.capabilities,
        isOfficial: server.isOfficial,
        documentationUrl: server.documentationUrl,
      },
      create: server,
    });
    console.log(`  ✓ ${result.name} (${result.provider})`);
  }

  console.log("\nLinking integrations to MCP servers...");

  // Link GitHub integration to GitHub MCP server
  const githubMcp = await prisma.mcpServer.findUnique({
    where: { provider: "github" },
  });
  if (githubMcp) {
    await prisma.integration.updateMany({
      where: { provider: "github" },
      data: {
        preferredMethod: "mcp",
        mcpServerId: githubMcp.id,
      },
    });
    console.log("  ✓ Linked GitHub integration to MCP server");
  }

  // Link Slack integration to Slack MCP server
  const slackMcp = await prisma.mcpServer.findUnique({
    where: { provider: "slack" },
  });
  if (slackMcp) {
    await prisma.integration.updateMany({
      where: { provider: "slack" },
      data: {
        preferredMethod: "mcp",
        mcpServerId: slackMcp.id,
      },
    });
    console.log("  ✓ Linked Slack integration to MCP server");
  }

  // Google uses proxy by default (more secure for OAuth tokens)
  await prisma.integration.updateMany({
    where: { provider: "google" },
    data: {
      preferredMethod: "proxy",
      mcpServerId: null,
    },
  });
  console.log("  ✓ Set Google integration to use secure proxy");

  console.log("\nMCP servers seeded successfully!");
}

seedMcpServers()
  .catch((e) => {
    console.error("Error seeding MCP servers:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
