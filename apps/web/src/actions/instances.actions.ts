"use server";

import { cookies } from "next/headers";

export type Instance = {
  id: string;
  userId: string;
  name: string;
  flyAppName: string | null;
  flyMachineId: string | null;
  status: string;
  region: string;
  ipAddress: string | null;
  telegramBotToken: string | null;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateInstanceInput = {
  name: string;
  region: string;
  telegramBotToken: string;
  aiModel?: string;
};

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value || null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getInstances(): Promise<Instance[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch instances");
    }

    return await response.json();
  } catch (error) {
    console.error("Get instances error:", error);
    return [];
  }
}

export async function getInstance(id: string): Promise<Instance | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch instance");
    }

    return await response.json();
  } catch (error) {
    console.error("Get instance error:", error);
    return null;
  }
}

export async function createInstance(
  input: CreateInstanceInput
): Promise<Instance | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create instance");
    }

    return await response.json();
  } catch (error) {
    console.error("Create instance error:", error);
    return null;
  }
}

export async function updateInstance(
  id: string,
  updates: Partial<CreateInstanceInput>
): Promise<Instance | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update instance");
    }

    return await response.json();
  } catch (error) {
    console.error("Update instance error:", error);
    return null;
  }
}

export async function startInstance(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances/${id}/start`,
      {
        method: "POST",
        headers,
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Start instance error:", error);
    return false;
  }
}

export async function stopInstance(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances/${id}/stop`,
      {
        method: "POST",
        headers,
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Stop instance error:", error);
    return false;
  }
}

export async function deleteInstance(id: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`,
      {
        method: "DELETE",
        headers,
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Delete instance error:", error);
    return false;
  }
}
