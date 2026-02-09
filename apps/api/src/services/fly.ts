/**
 * Fly.io Machines API Client
 * Handles interaction with Fly.io Machines API for creating and managing OpenClaw instances
 *
 * API Documentation: https://fly.io/docs/machines/api/
 */

const FLY_API_BASE = 'https://api.machines.dev/v1';
const FLY_API_TOKEN = process.env.FLY_API_TOKEN;

interface MachineConfig {
  region: string;
  config: {
    image: string;
    services?: Array<{
      ports: Array<{
        port: number;
        handlers?: string[];
      }>;
      protocol: string;
      internal_port: number;
    }>;
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
  config: any;
  created_at: string;
}

/**
 * Make a request to the Fly.io Machines API
 */
async function flyRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  if (!FLY_API_TOKEN) {
    throw new Error('FLY_API_TOKEN environment variable is required');
  }

  const url = `${FLY_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${FLY_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fly.io API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Create a new Fly app
 */
export async function createApp(name: string): Promise<void> {
  await flyRequest('/apps', {
    method: 'POST',
    body: JSON.stringify({
      app_name: name,
      org_slug: process.env.FLY_ORG_SLUG || 'personal',
    }),
  });
}

/**
 * Create a new machine in a Fly app
 */
export async function createMachine(
  appName: string,
  config: MachineConfig
): Promise<Machine> {
  const response = await flyRequest(`/apps/${appName}/machines`, {
    method: 'POST',
    body: JSON.stringify({
      name: `${appName}-machine`,
      region: config.region,
      config: config.config,
    }),
  });

  return response;
}

/**
 * Start a stopped machine
 */
export async function startMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}/start`, {
    method: 'POST',
  });
}

/**
 * Stop a running machine
 */
export async function stopMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}/stop`, {
    method: 'POST',
  });
}

/**
 * Delete a machine
 */
export async function deleteMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(`/apps/${appName}/machines/${machineId}`, {
    method: 'DELETE',
  });
}

/**
 * Delete a Fly app
 */
export async function deleteApp(appName: string): Promise<void> {
  await flyRequest(`/apps/${appName}`, {
    method: 'DELETE',
  });
}

/**
 * Get machine status
 */
export async function getMachine(
  appName: string,
  machineId: string
): Promise<Machine> {
  return flyRequest(`/apps/${appName}/machines/${machineId}`);
}

/**
 * List all machines in an app
 */
export async function listMachines(appName: string): Promise<Machine[]> {
  return flyRequest(`/apps/${appName}/machines`);
}
