/**
 * Fly.io Machines API Client
 * Handles interaction with Fly.io Machines API for creating and managing OpenClaw instances
 *
 * API Documentation: https://fly.io/docs/machines/api/
 */

const FLY_API_BASE = "https://api.machines.dev/v1";

interface MachineConfig {
  region: string;
  config: {
    image: string;
    services?: {
      ports: {
        port: number;
        handlers?: string[];
      }[];
      protocol: string;
      internal_port: number;
    }[];
    env?: Record<string, string>;
  };
}

interface Machine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  config: MachineConfig["config"];
  created_at: string;
}

/**
 * Make a request to the Fly.io Machines API
 */
async function flyRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const flyApiToken = process.env.FLY_API_TOKEN;
  if (flyApiToken === undefined || flyApiToken === "") {
    throw new Error("FLY_API_TOKEN environment variable is required");
  }

  const url = `${FLY_API_BASE}${path}`;
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${flyApiToken}`,
    "Content-Type": "application/json",
  };

  // Merge additional headers if provided as a plain object
  const mergedHeaders =
    options.headers !== undefined &&
    typeof options.headers === "object" &&
    !Array.isArray(options.headers)
      ? { ...baseHeaders, ...(options.headers as Record<string, string>) }
      : baseHeaders;

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fly.io API error: ${String(response.status)} ${error}`);
  }

  return response.json();
}

/**
 * Create a new Fly app
 */
export async function createApp(name: string): Promise<void> {
  await flyRequest("/apps", {
    method: "POST",
    body: JSON.stringify({
      app_name: name,
      org_slug: process.env.FLY_ORG_SLUG ?? "personal",
    }),
  });
}

/**
 * Create a new machine in a Fly app
 */
export async function createMachine(appName: string, config: MachineConfig): Promise<Machine> {
  return flyRequest(`/apps/${appName}/machines`, {
    method: "POST",
    body: JSON.stringify({
      name: `${appName}-machine`,
      region: config.region,
      config: config.config,
    }),
  }) as Promise<Machine>;
}

/**
 * Start a stopped machine
 */
export async function startMachine(appName: string, machineId: string): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}/start`, {
    method: "POST",
  });
}

/**
 * Stop a running machine
 */
export async function stopMachine(appName: string, machineId: string): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}/stop`, {
    method: "POST",
  });
}

/**
 * Delete a machine
 */
export async function deleteMachine(appName: string, machineId: string): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}`, {
    method: "DELETE",
  });
}

/**
 * Delete a Fly app
 */
export async function deleteApp(appName: string): Promise<void> {
  await flyRequest(`/apps/${appName}`, {
    method: "DELETE",
  });
}

/**
 * Get machine status
 */
export async function getMachine(appName: string, machineId: string): Promise<Machine> {
  return flyRequest(`/apps/${appName}/machines/${machineId}`) as Promise<Machine>;
}

/**
 * List all machines in an app
 */
export async function listMachines(appName: string): Promise<Machine[]> {
  return flyRequest(`/apps/${appName}/machines`) as Promise<Machine[]>;
}
