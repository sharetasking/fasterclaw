/**
 * Integration Instructions Loader
 *
 * Loads integration instructions from markdown files for injection into
 * OpenClaw's SOUL.md system prompt. This allows easy customization and
 * addition of new integrations without modifying provider code.
 *
 * To add a new integration:
 * 1. Create a markdown file in ./instructions/ (e.g., slack.md)
 * 2. Add the integration key to INTEGRATION_FILES
 * 3. The instructions will be automatically loaded and injected
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Map of integration provider names to their instruction file names
 */
const INTEGRATION_FILES: Record<string, string> = {
  github: "github.md",
  slack: "slack.md",
  // Add more integrations here:
  // google: "google.md",
  // notion: "notion.md",
};

/**
 * Cache for loaded instructions
 */
const instructionsCache: Record<string, string> = {};

/**
 * Load integration instructions from markdown file
 *
 * @param provider - The integration provider name (e.g., "github")
 * @returns The markdown instructions content, or undefined if not found
 */
export function loadIntegrationInstructions(provider: string): string | undefined {
  // Check cache first
  if (instructionsCache[provider]) {
    return instructionsCache[provider];
  }

  const filename = INTEGRATION_FILES[provider];
  if (!filename) {
    console.warn(`No instruction file configured for provider: ${provider}`);
    return undefined;
  }

  try {
    const filePath = join(__dirname, "instructions", filename);
    const content = readFileSync(filePath, "utf-8");

    // Cache the content
    instructionsCache[provider] = content;

    return content;
  } catch (error) {
    console.error(`Failed to load instructions for ${provider}:`, error);
    return undefined;
  }
}

/**
 * Get all available integration providers
 */
export function getAvailableIntegrations(): string[] {
  return Object.keys(INTEGRATION_FILES);
}

/**
 * Build SOUL.md additions for enabled integrations
 *
 * @param integrations - Record of integration provider to token
 * @returns Formatted markdown string for SOUL.md
 */
export function buildSoulAdditions(integrations: Record<string, string>): string {
  let additions = "\n\n---\n\n## Integration Capabilities\n\n";

  for (const provider of Object.keys(integrations)) {
    const instructions = loadIntegrationInstructions(provider);
    if (instructions) {
      additions += `### ${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration\n\n`;
      additions += instructions;
      additions += "\n\n";
    }
  }

  return additions;
}

/**
 * Escape special characters for shell heredoc
 */
export function escapeForHeredoc(content: string): string {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}
