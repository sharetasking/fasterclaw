/**
 * Configuration Builder Types
 *
 * Type definitions for the OpenClaw configuration builder service.
 */

import type { McpConfig, OpenClawConfig } from "@fasterclaw/shared";

// ============================================================================
// Instance Configuration Types
// ============================================================================

export interface InstanceWithRelations {
  id: string;
  userId: string;
  name: string;
  provider: string;
  aiModel: string;
  status: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  instanceIntegrations: InstanceIntegrationWithRelations[];
  instanceSkills: InstanceSkillWithRelations[];
}

export interface InstanceIntegrationWithRelations {
  id: string;
  instanceId: string;
  userIntegrationId: string;
  enabledAt: Date;
  userIntegration: {
    id: string;
    userId: string;
    integrationId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken: string | null;
    tokenExpiresAt: Date | null;
    accountIdentifier: string | null;
    integration: {
      id: string;
      slug: string;
      name: string;
      provider: string;
      preferredMethod: string;
      mcpServerId: string | null;
      mcpServer: McpServerData | null;
    };
  };
}

export interface InstanceSkillWithRelations {
  id: string;
  instanceId: string;
  skillId: string;
  enabledAt: Date;
  skill: {
    id: string;
    slug: string;
    name: string;
    description: string;
    markdownContent: string;
    requiresBins: string[];
    requiresEnvVars: string[];
  };
}

export interface McpServerData {
  id: string;
  provider: string;
  name: string;
  npmPackage: string;
  version: string;
  requiredEnvVars: string[];
  capabilities: string[];
}

// ============================================================================
// Configuration Output Types
// ============================================================================

export interface WorkspaceFiles {
  "SOUL.md"?: string;
  "USER.md"?: string;
  "TOOLS.md"?: string;
  "PROXY.md"?: string;
}

export interface ConfigBuilderOutput {
  openclawConfig: OpenClawConfig;
  workspaceFiles: WorkspaceFiles;
  startupScript: string;
  envVars: Record<string, string>;
}

// ============================================================================
// MCP Configuration Types
// ============================================================================

export interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface IntegrationTokens {
  github?: string;
  slack?: string;
  google?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Startup Script Configuration
// ============================================================================

export interface StartupScriptConfig {
  openclawConfig: OpenClawConfig;
  workspaceFiles: WorkspaceFiles;
  aiProvider: string;
  aiModel: string;
}

// Re-export shared types
export type { McpConfig, OpenClawConfig };
