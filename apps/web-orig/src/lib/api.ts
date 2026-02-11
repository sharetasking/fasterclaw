/**
 * @deprecated Use @fasterclaw/api-client instead
 *
 * This file is deprecated. The application now uses the typed API client
 * generated from the OpenAPI specification.
 *
 * For Server Actions, use:
 *   import { createAuthenticatedClient } from '@/lib/api-client';
 *   import { getInstances } from '@fasterclaw/api-client';
 *   const client = await createAuthenticatedClient();
 *   const { data } = await getInstances({ client });
 *
 * For client-side usage, import directly from @fasterclaw/api-client:
 *   import { client, getInstances } from '@fasterclaw/api-client';
 *   client.setConfig({ baseUrl: 'http://localhost:3001' });
 *   const { data } = await getInstances();
 *
 * See docs/CONTRACT-ARCHITECTURE.md for full documentation.
 */

export {};
