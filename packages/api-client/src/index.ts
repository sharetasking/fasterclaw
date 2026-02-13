// ============================================================================
// @fasterclaw/api-client
// ============================================================================
// Auto-generated typed HTTP client for the FasterClaw API.
// Generated from @fasterclaw/contracts OpenAPI specification.
//
// Usage:
//   import { client, postAuthLogin } from '@fasterclaw/api-client';
//
//   // Configure the client
//   client.setConfig({
//     baseUrl: 'http://localhost:3001',
//   });
//
//   // Make typed API calls
//   const { data, error } = await postAuthLogin({
//     body: { email: 'user@example.com', password: 'password' }
//   });
// ============================================================================

export * from "./generated/index";

// Export client creation utilities
export { createClient } from "./generated/client/client.gen";
export { createConfig } from "./generated/client/utils.gen";
export type { Client, Config } from "./generated/client/types.gen";
