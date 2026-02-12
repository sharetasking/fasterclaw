"use server";

import {
  getInstances as getInstancesApi,
  getInstancesById,
  postInstances,
  postInstancesByIdStart,
  postInstancesByIdStop,
  postInstancesByIdRetry,
  deleteInstancesById,
  postInstancesValidateTelegramToken,
  type Instance,
  type CreateInstanceRequest,
  type ValidateTelegramTokenResponse,
} from "@fasterclaw/api-client";
import { createAuthenticatedClient, getAuthToken } from "@/lib/api-client";

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

export async function retryInstance(id: string): Promise<ActionResult<Instance>> {
  try {
    const client = await createAuthenticatedClient();
    const { data, error } = await postInstancesByIdRetry({
      client,
      path: { id },
    });

    if (error !== undefined) {
      return { success: false, error: getErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Retry instance error:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Get the user's default instance (auto-created on signup).
 * If no instance exists, triggers creation of a default one via the API.
 */
export async function getDefaultInstance(): Promise<Instance | null> {
  try {
    const instances = await getInstances();
    const defaultInstance = instances.find((i) => "isDefault" in i && i.isDefault === true) ?? (instances.length > 0 ? instances[0] : undefined);

    if (defaultInstance !== undefined) {
      return defaultInstance;
    }

    // No instance found — create a default one
    const token = await getAuthToken();
    if (token == null || token === "") {
      return null;
    }

    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/instances/create-default`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Instance;
    return data;
  } catch (error) {
    console.error("Get default instance error:", error);
    return null;
  }
}

/**
 * Send a chat message to an OpenClaw instance
 */
export async function sendChatMessage(
  instanceId: string,
  message: string,
  filePath?: string
): Promise<ActionResult<{ response: string }>> {
  try {
    const token = await getAuthToken();
    if (token == null || token === "") {
      return { success: false, error: "Not authenticated" };
    }

    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/instances/${instanceId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, filePath }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      return { success: false, error: errorData.error ?? "Failed to send message" };
    }

    const data = (await response.json()) as { response: string };
    return { success: true, data };
  } catch (error) {
    console.error("Send chat message error:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Upload a file to an OpenClaw instance for use in chat
 */
export async function uploadChatFile(
  instanceId: string,
  formData: FormData
): Promise<ActionResult<{ filePath: string; fileName: string; fileSize: number; mimeType: string }>> {
  try {
    const token = await getAuthToken();
    if (token == null || token === "") {
      return { success: false, error: "Not authenticated" };
    }

    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/instances/${instanceId}/chat/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      return { success: false, error: errorData.error ?? "Failed to upload file" };
    }

    const data = (await response.json()) as {
      filePath: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    };
    return { success: true, data };
  } catch (error) {
    console.error("Upload chat file error:", error);
    return { success: false, error: "Failed to upload file" };
  }
}
