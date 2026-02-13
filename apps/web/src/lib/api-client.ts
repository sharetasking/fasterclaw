/**
 * Server-side API client configuration for @fasterclaw/api-client
 *
 * This module provides helpers for making authenticated API calls from
 * Next.js Server Actions and Server Components.
 *
 * Usage:
 *   import { createAuthenticatedClient, getApiClient } from '@/lib/api-client';
 *   import { getInstances } from '@fasterclaw/api-client';
 *
 *   // In a Server Action:
 *   const client = await createAuthenticatedClient();
 *   const { data, error } = await getInstances({ client });
 */

import { cookies } from "next/headers";
import { createClient, createConfig, type Client } from "@fasterclaw/api-client";

// Server-side only - no NEXT_PUBLIC_ needed since we only call from server actions
const API_BASE_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Get the auth token from cookies (server-side only)
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}

/**
 * Create an authenticated API client for use in Server Actions
 * Returns a client configured with the auth token from cookies
 */
export async function createAuthenticatedClient(): Promise<Client> {
  const token = await getAuthToken();

  return createClient(
    createConfig({
      baseUrl: API_BASE_URL,
      headers: token !== null && token !== "" ? { Authorization: `Bearer ${token}` } : {},
    })
  );
}

/**
 * Create an unauthenticated API client
 * Use this for public endpoints like login/register
 */
export function getApiClient(): Client {
  return createClient(
    createConfig({
      baseUrl: API_BASE_URL,
    })
  );
}

/**
 * Re-export types from api-client for convenience
 */
export type {
  User,
  Instance,
  Subscription,
  Invoice,
  PlanConfig,
  SubscriptionResponse,
} from "@fasterclaw/api-client";
