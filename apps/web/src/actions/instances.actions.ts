"use server";

import {
  getInstances as getInstancesApi,
  getInstancesById,
  postInstances,
  postInstancesByIdStart,
  postInstancesByIdStop,
  deleteInstancesById,
  postInstancesValidateTelegramToken,
  type Instance,
  type CreateInstanceRequest,
  type ValidateTelegramTokenResponse,
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

export async function getInstances(): Promise<Instance[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getInstancesApi({ client });

    if (error !== undefined) {
      console.error("Get instances error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Get instances error:", error);
    return [];
  }
}

export async function getInstance(id: string): Promise<Instance | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await getInstancesById({
      client,
      path: { id },
    });

    if (error !== undefined) {
      console.error("Get instance error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Get instance error:", error);
    return null;
  }
}

export async function createInstance(
  input: CreateInstanceRequest
): Promise<ActionResult<Instance>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstances({
      client,
      body: input,
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Create instance error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteInstance(id: string): Promise<ActionResult<void>> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteInstancesById({
      client,
      path: { id },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Delete instance error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function startInstance(id: string): Promise<ActionResult<Instance>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesByIdStart({
      client,
      path: { id },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Start instance error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function stopInstance(id: string): Promise<ActionResult<Instance>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesByIdStop({
      client,
      path: { id },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Stop instance error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function validateTelegramToken(
  telegramToken: string
): Promise<ValidateTelegramTokenResponse> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesValidateTelegramToken({
      client,
      body: { token: telegramToken },
    });

    if (error !== undefined) {
      return { valid: false, error: "Failed to validate token" };
    }

    return data;
  } catch (error) {
    console.error("Validate Telegram token error:", error);
    return { valid: false, error: "Failed to validate token" };
  }
}
