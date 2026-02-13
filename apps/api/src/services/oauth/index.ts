/**
 * OAuth Provider Factory
 *
 * Provides a centralized way to get OAuth providers by name.
 */

import { googleProvider } from "./providers/google.js";
import { slackProvider } from "./providers/slack.js";
import { githubProvider } from "./providers/github.js";
import type { OAuthProvider } from "./types.js";

/**
 * Get an OAuth provider by name
 * @param provider - Provider name ('google', 'slack', 'github')
 * @returns OAuthProvider implementation
 * @throws Error if provider is unknown
 */
export function getOAuthProvider(provider: string): OAuthProvider {
  switch (provider.toLowerCase()) {
    case "google":
      return googleProvider;
    case "slack":
      return slackProvider;
    case "github":
      return githubProvider;
    default:
      throw new Error(`Unknown OAuth provider: ${provider}`);
  }
}

/**
 * Check if a provider is supported
 * @param provider - Provider name to check
 * @returns True if provider is supported
 */
export function isSupportedProvider(provider: string): boolean {
  return ["google", "slack", "github"].includes(provider.toLowerCase());
}

/**
 * Get list of all supported providers
 * @returns Array of supported provider names
 */
export function getSupportedProviders(): string[] {
  return ["google", "slack", "github"];
}

// Re-export types for convenience
export type { OAuthProvider, OAuthTokens, AccountInfo } from "./types.js";
