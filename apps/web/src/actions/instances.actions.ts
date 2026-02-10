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

export async function getInstances(): Promise<Instance[]> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await getInstancesApi({ client });

    if (!data) {
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
    const { data } = await getInstancesById({
      client,
      path: { id },
    });

    if (!data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Get instance error:", error);
    return null;
  }
}

export async function createInstance(input: CreateInstanceRequest): Promise<Instance | null> {
  try {
    const client = await createAuthenticatedClient();
    const { data } = await postInstances({
      client,
      body: input,
    });

    if (!data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Create instance error:", error);
    return null;
  }
}

export async function deleteInstance(id: string): Promise<boolean> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await deleteInstancesById({
      client,
      path: { id },
    });

    return !error;
  } catch (error) {
    console.error("Delete instance error:", error);
    return false;
  }
}

export async function startInstance(id: string): Promise<boolean> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await postInstancesByIdStart({
      client,
      path: { id },
    });

    return !error;
  } catch (error) {
    console.error("Start instance error:", error);
    return false;
  }
}

export async function stopInstance(id: string): Promise<boolean> {
  try {
    const client = await createAuthenticatedClient();
    const { error } = await postInstancesByIdStop({
      client,
      path: { id },
    });

    return !error;
  } catch (error) {
    console.error("Stop instance error:", error);
    return false;
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

    if (error || !data) {
      return { valid: false, error: "Failed to validate token" };
    }

    return data;
  } catch (error) {
    console.error("Validate Telegram token error:", error);
    return { valid: false, error: "Failed to validate token" };
  }
}
