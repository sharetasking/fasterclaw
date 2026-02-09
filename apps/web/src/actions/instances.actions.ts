"use server";

import { cookies } from "next/headers";

export type Instance = {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "stopping";
  region: string;
  model: string;
  apiKey: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateInstanceInput = {
  name: string;
  region: string;
  model: string;
};

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value || null;
}

export async function getInstances(): Promise<Instance[]> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch instance");
    }

    return await response.json();
  } catch (error) {
    console.error("Get instance error:", error);
    return null;
  }
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to create instance");
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
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update instance");
    }

    return await response.json();
  } catch (error) {
    console.error("Update instance error:", error);
    return null;
  }
}

export async function deleteInstance(id: string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Delete instance error:", error);
    return false;
  }
}

export async function startInstance(id: string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Start instance error:", error);
    return false;
  }
}

export async function stopInstance(id: string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Stop instance error:", error);
    return false;
  }
}

export async function restartInstance(id: string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // TODO: Replace with actual API call to Fastify backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/instances/${id}/restart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Restart instance error:", error);
    return false;
  }
}
