/**
 * MCP Servers API Routes
 *
 * Endpoints for managing MCP (Model Context Protocol) servers.
 * These are the available servers that can be used for integrations.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@fasterclaw/db";
import {
  McpServerSchema,
  McpServerListSchema,
  ApiErrorSchema,
} from "@fasterclaw/shared";

export async function mcpServersRoutes(app: FastifyInstance) {
  // ============================================================================
  // GET /mcp-servers - List all available MCP servers
  // ============================================================================

  app.get(
    "/mcp-servers",
    {
      schema: {
        tags: ["MCP Servers"],
        summary: "List available MCP servers",
        description:
          "Get all available MCP servers that can be used for integrations",
        response: {
          200: McpServerListSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        const servers = await prisma.mcpServer.findMany({
          orderBy: [{ isOfficial: "desc" }, { name: "asc" }],
        });

        return servers.map((server) => ({
          ...server,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
        }));
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch MCP servers",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /mcp-servers/:provider - Get MCP server by provider
  // ============================================================================

  app.get(
    "/mcp-servers/:provider",
    {
      schema: {
        tags: ["MCP Servers"],
        summary: "Get MCP server by provider",
        description: "Get detailed information about a specific MCP server",
        params: z.object({
          provider: z.string(),
        }),
        response: {
          200: McpServerSchema,
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { provider } = request.params as { provider: string };

        const server = await prisma.mcpServer.findUnique({
          where: { provider },
        });

        if (!server) {
          return reply.status(404).send({
            error: "MCP server not found",
            message: `No MCP server found for provider: ${provider}`,
          });
        }

        return {
          ...server,
          createdAt: server.createdAt.toISOString(),
          updatedAt: server.updatedAt.toISOString(),
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch MCP server",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /mcp-servers/:provider/capabilities - Get MCP server capabilities
  // ============================================================================

  app.get(
    "/mcp-servers/:provider/capabilities",
    {
      schema: {
        tags: ["MCP Servers"],
        summary: "Get MCP server capabilities",
        description: "Get the list of capabilities/tools provided by an MCP server",
        params: z.object({
          provider: z.string(),
        }),
        response: {
          200: z.object({
            provider: z.string(),
            name: z.string(),
            capabilities: z.array(z.string()),
            requiredEnvVars: z.array(z.string()),
          }),
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { provider } = request.params as { provider: string };

        const server = await prisma.mcpServer.findUnique({
          where: { provider },
          select: {
            provider: true,
            name: true,
            capabilities: true,
            requiredEnvVars: true,
          },
        });

        if (!server) {
          return reply.status(404).send({
            error: "MCP server not found",
            message: `No MCP server found for provider: ${provider}`,
          });
        }

        return server;
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch MCP server capabilities",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // ============================================================================
  // GET /integrations/:integrationId/mcp-server - Get MCP server for integration
  // ============================================================================

  app.get(
    "/integrations/:integrationId/mcp-server",
    {
      schema: {
        tags: ["MCP Servers", "Integrations"],
        summary: "Get MCP server for integration",
        description: "Get the MCP server associated with a specific integration",
        params: z.object({
          integrationId: z.string().cuid(),
        }),
        response: {
          200: McpServerSchema.nullable(),
          404: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params as { integrationId: string };

        const integration = await prisma.integration.findUnique({
          where: { id: integrationId },
          include: {
            mcpServer: true,
          },
        });

        if (!integration) {
          return reply.status(404).send({
            error: "Integration not found",
            message: `No integration found with ID: ${integrationId}`,
          });
        }

        if (!integration.mcpServer) {
          return null;
        }

        return {
          ...integration.mcpServer,
          createdAt: integration.mcpServer.createdAt.toISOString(),
          updatedAt: integration.mcpServer.updatedAt.toISOString(),
        };
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Failed to fetch MCP server for integration",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
