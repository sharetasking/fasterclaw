/**
 * Configuration Builder Service
 *
 * Builds complete OpenClaw configuration including:
 * - openclaw.json with MCP server configuration
 * - Workspace files (SOUL.md, USER.md, PROXY.md)
 * - Startup script for container initialization
 * - Environment variables for tokens
 */

import { prisma } from "@fasterclaw/db";
import type { OpenClawConfig } from "@fasterclaw/shared";
import { buildMcpConfig, buildMcpEnvVars, getTokenEnvVar } from "./mcp-config.js";
import { buildWorkspaceFiles } from "./workspace.js";
import { buildStartupScript, buildMinimalStartupScript } from "./startup-script.js";
import { decryptToken } from "../encryption.js";
import type {
  InstanceWithRelations,
  WorkspaceFiles,
  ConfigBuilderOutput,
  IntegrationTokens,
} from "./types.js";

export class ConfigBuilder {
  /**
   * Build complete configuration for an instance
   *
   * @param instanceId - Instance ID
   * @returns Complete configuration including openclaw.json, workspace files, and startup script
   */
  async buildFullConfig(instanceId: string): Promise<ConfigBuilderOutput> {
    const instance = await this.getInstanceWithRelations(instanceId);

    // Build OpenClaw config
    const openclawConfig = this.buildOpenClawConfig(instance);

    // Build workspace files
    const workspaceFiles = buildWorkspaceFiles(instance);

    // Get decrypted tokens for MCP integrations
    const decryptedTokens = await this.getDecryptedTokens(instance);

    // Build environment variables
    const envVars = buildMcpEnvVars(instance.instanceIntegrations, decryptedTokens);

    // Parse AI provider from model string (e.g., "anthropic/claude-sonnet-4-0")
    const [aiProvider, aiModel] = this.parseAiModel(instance.aiModel);

    // Build startup script
    const startupScript = buildStartupScript({
      openclawConfig,
      workspaceFiles,
      aiProvider,
      aiModel,
    });

    return {
      openclawConfig,
      workspaceFiles,
      startupScript,
      envVars,
    };
  }

  /**
   * Build OpenClaw configuration object
   */
  buildOpenClawConfig(instance: InstanceWithRelations): OpenClawConfig {
    // Build MCP configuration from enabled integrations
    const mcpConfig = buildMcpConfig(instance.instanceIntegrations);

    return {
      meta: {
        generatedBy: "fasterclaw",
        generatedAt: new Date().toISOString(),
        instanceId: instance.id,
      },
      agent: {
        model: instance.aiModel,
      },
      gateway: {
        mode: "local",
      },
      channels: {
        telegram: {
          enabled: true,
          dmPolicy: "open",
          allowFrom: ["*"],
        },
      },
      ...(mcpConfig && { mcp: mcpConfig }),
      plugins: {
        entries: {
          telegram: { enabled: true },
        },
      },
    };
  }

  /**
   * Build workspace files for an instance
   */
  async buildWorkspace(instanceId: string): Promise<WorkspaceFiles> {
    const instance = await this.getInstanceWithRelations(instanceId);
    return buildWorkspaceFiles(instance);
  }

  /**
   * Build startup script for an instance
   */
  async buildStartupScript(instanceId: string): Promise<string> {
    const instance = await this.getInstanceWithRelations(instanceId);
    const openclawConfig = this.buildOpenClawConfig(instance);
    const workspaceFiles = buildWorkspaceFiles(instance);
    const [aiProvider, aiModel] = this.parseAiModel(instance.aiModel);

    return buildStartupScript({
      openclawConfig,
      workspaceFiles,
      aiProvider,
      aiModel,
    });
  }

  /**
   * Get minimal startup script (no integrations)
   */
  getMinimalStartupScript(aiProvider: string, aiModel: string): string {
    return buildMinimalStartupScript(aiProvider, aiModel);
  }

  /**
   * Get integration tokens for an instance
   * Returns decrypted tokens mapped by provider
   */
  async getIntegrationTokens(instanceId: string): Promise<IntegrationTokens> {
    const instance = await this.getInstanceWithRelations(instanceId);
    const tokens: IntegrationTokens = {};

    for (const ii of instance.instanceIntegrations) {
      const provider = ii.userIntegration.integration.provider;
      try {
        tokens[provider] = decryptToken(ii.userIntegration.encryptedAccessToken);
      } catch (error) {
        console.error(`Failed to decrypt token for ${provider}:`, error);
      }
    }

    return tokens;
  }

  /**
   * Get environment variables for MCP integrations
   */
  async getMcpEnvVars(instanceId: string): Promise<Record<string, string>> {
    const instance = await this.getInstanceWithRelations(instanceId);
    const decryptedTokens = await this.getDecryptedTokens(instance);
    return buildMcpEnvVars(instance.instanceIntegrations, decryptedTokens);
  }

  /**
   * Private: Get instance with all relations
   */
  private async getInstanceWithRelations(instanceId: string): Promise<InstanceWithRelations> {
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        instanceIntegrations: {
          include: {
            userIntegration: {
              include: {
                integration: {
                  include: {
                    mcpServer: true,
                  },
                },
              },
            },
          },
        },
        instanceSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    return instance as InstanceWithRelations;
  }

  /**
   * Private: Get decrypted tokens for all integrations
   */
  private async getDecryptedTokens(
    instance: InstanceWithRelations
  ): Promise<Map<string, string>> {
    const tokens = new Map<string, string>();

    for (const ii of instance.instanceIntegrations) {
      try {
        const decrypted = decryptToken(ii.userIntegration.encryptedAccessToken);
        tokens.set(ii.userIntegration.id, decrypted);
      } catch (error) {
        console.error(
          `Failed to decrypt token for integration ${ii.userIntegration.id}:`,
          error
        );
      }
    }

    return tokens;
  }

  /**
   * Private: Parse AI model string into provider and model
   */
  private parseAiModel(aiModel: string): [string, string] {
    if (aiModel.includes("/")) {
      const [provider, model] = aiModel.split("/", 2);
      return [provider, model];
    }

    // Default to anthropic if no provider specified
    return ["anthropic", aiModel];
  }
}

// Export singleton instance
export const configBuilder = new ConfigBuilder();

// Re-export types
export type {
  InstanceWithRelations,
  WorkspaceFiles,
  ConfigBuilderOutput,
  IntegrationTokens,
} from "./types.js";

// Re-export utilities
export { buildMcpConfig, getTokenEnvVar } from "./mcp-config.js";
export { buildWorkspaceFiles, escapeForHeredoc } from "./workspace.js";
export { buildStartupScript, buildMinimalStartupScript } from "./startup-script.js";
