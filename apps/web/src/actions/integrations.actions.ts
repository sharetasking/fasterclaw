"use server";

import {
  getIntegrations as getIntegrationsApi,
  getIntegrationsUser,
  postIntegrationsOauthInitiate,
  deleteIntegrationsUserByIntegrationId,
  getInstancesByInstanceIdIntegrations,
  postInstancesByInstanceIdIntegrations,
  deleteInstancesByInstanceIdIntegrationsByIntegrationId,
  type Integration,
  type UserIntegration,
  type InstanceIntegration,
  type InitiateOAuthRequest,
  type OAuthUrlResponse,
  type EnableInstanceIntegrationRequest,
} from "@fasterclaw/api-client";
import { createAuthenticatedClient } from "@/lib/api-client";

// NOTE: Types are NOT re-exported from Server Actions files.
// Import types directly from @fasterclaw/api-client instead.

/**
 * Result type for actions that may fail.
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function getErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object" && "error" in error) {
    return String((error as { error: unknown }).error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Get all available integrations
 */
export async function getIntegrations(): Promise<Integration[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getIntegrationsApi({ client });

    if (error !== undefined) {
      console.error("Get integrations error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get integrations error:", error);
    return [];
  }
}

/**
 * Get user's connected integrations
 */
export async function getUserIntegrations(): Promise<UserIntegration[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getIntegrationsUser({ client });

    if (error !== undefined) {
      console.error("Get user integrations error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get user integrations error:", error);
    return [];
  }
}

/**
 * Initiate OAuth flow for an integration
 * Returns the authorization URL to redirect the user to
 */
export async function initiateOAuth(
  input: InitiateOAuthRequest
): Promise<ActionResult<OAuthUrlResponse>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postIntegrationsOauthInitiate({
      client,
      body: input,
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Initiate OAuth error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  integrationId: string
): Promise<ActionResult<void>> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteIntegrationsUserByIntegrationId({
      client,
      path: { integrationId },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Disconnect integration error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Get integrations enabled for a specific instance
 */
export async function getInstanceIntegrations(
  instanceId: string
): Promise<InstanceIntegration[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getInstancesByInstanceIdIntegrations({
      client,
      path: { instanceId },
    });

    if (error !== undefined) {
      console.error("Get instance integrations error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get instance integrations error:", error);
    return [];
  }
}

/**
 * Enable an integration for an instance
 */
export async function enableInstanceIntegration(
  instanceId: string,
  input: EnableInstanceIntegrationRequest
): Promise<ActionResult<InstanceIntegration>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesByInstanceIdIntegrations({
      client,
      path: { instanceId },
      body: input,
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Enable instance integration error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Disable an integration for an instance
 */
export async function disableInstanceIntegration(
  instanceId: string,
  integrationId: string
): Promise<ActionResult<void>> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteInstancesByInstanceIdIntegrationsByIntegrationId({
      client,
      path: { instanceId, integrationId },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Disable instance integration error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
