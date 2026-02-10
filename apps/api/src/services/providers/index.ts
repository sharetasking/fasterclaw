/**
 * Provider Factory
 * Selects the appropriate instance provider based on INSTANCE_PROVIDER env var.
 *
 * Usage:
 *   INSTANCE_PROVIDER=docker  → Local Docker containers (development)
 *   INSTANCE_PROVIDER=fly     → Fly.io Machines (production, default)
 */

import { flyProvider } from "./fly.provider.js";
import { dockerProvider } from "./docker.provider.js";
import type { InstanceProvider } from "./types.js";

export type ProviderType = "fly" | "docker";

/**
 * Get the configured instance provider.
 * Defaults to "fly" for production use.
 */
export function getProvider(): InstanceProvider {
  const providerType = (process.env.INSTANCE_PROVIDER || "fly") as ProviderType;

  switch (providerType) {
    case "docker":
      return dockerProvider;
    case "fly":
    default:
      return flyProvider;
  }
}

/**
 * Get the current provider type name.
 */
export function getProviderType(): ProviderType {
  return (process.env.INSTANCE_PROVIDER || "fly") as ProviderType;
}

// Re-export types and individual providers
export * from "./types.js";
export { flyProvider } from "./fly.provider.js";
export { dockerProvider } from "./docker.provider.js";
