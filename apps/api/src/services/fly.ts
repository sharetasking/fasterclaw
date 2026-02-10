/**
 * Fly.io Machines API Client
 * Handles interaction with Fly.io Machines API for creating and managing OpenClaw instances
 *
 * API Documentation: https://fly.io/docs/machines/api/
 */

const FLY_API_BASE = "https://api.machines.dev/v1";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/** Retryable HTTP status codes (server errors + rate limiting) */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class FlyApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly detail: string,
    public readonly operation: string
  ) {
    super(`Fly.io ${operation} failed (${status}): ${detail}`);
    this.name = "FlyApiError";
  }

  get isRetryable(): boolean {
    return RETRYABLE_STATUSES.has(this.status);
  }
}

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
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request to the Fly.io Machines API with automatic retries
 * and exponential backoff for transient failures.
 */
async function flyRequest(
  path: string,
  options: RequestInit = {},
  operation = "request"
): Promise<unknown> {
  const flyApiToken = process.env.FLY_API_TOKEN;
  if (flyApiToken === undefined || flyApiToken === "") {
    throw new Error("FLY_API_TOKEN environment variable is required");
  }

  const url = `${FLY_API_BASE}${path}`;
  let lastError: FlyApiError | Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${flyApiToken}`,
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        const detail = await response.text();
        const error = new FlyApiError(
          response.status,
          response.statusText,
          detail,
          operation
        );

        // Only retry on transient/server errors
        if (error.isRetryable && attempt < MAX_RETRIES) {
          lastError = error;
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await sleep(backoff);
          continue;
        }

        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {};
      }

      return await response.json();
    } catch (error) {
      // If it's already a FlyApiError that's non-retryable, re-throw
      if (error instanceof FlyApiError && !error.isRetryable) {
        throw error;
      }

      // Network errors (fetch failures) are retryable
      if (error instanceof FlyApiError) {
        lastError = error;
      } else {
        lastError = new FlyApiError(
          0,
          "NetworkError",
          error instanceof Error ? error.message : String(error),
          operation
        );
      }

      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Fly.io ${operation} failed after ${MAX_RETRIES} retries`);
}

/**
 * Create a new Fly app
 */
export async function createApp(name: string): Promise<void> {
  await flyRequest(
    "/apps",
    {
      method: "POST",
      body: JSON.stringify({
        app_name: name,
        org_slug: process.env.FLY_ORG_SLUG ?? "personal",
      }),
    },
    "createApp"
  );
}

/**
 * Create a new machine in a Fly app
 */
export async function createMachine(
  appName: string,
  config: MachineConfig
): Promise<Machine> {
  const response = await flyRequest(
    `/apps/${appName}/machines`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${appName}-machine`,
        region: config.region,
        config: config.config,
      }),
    },
    "createMachine"
  );

  return response as Machine;
}

/**
 * Start a stopped machine
 */
export async function startMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(
    `/apps/${appName}/machines/${machineId}/start`,
    { method: "POST" },
    "startMachine"
  );
}

/**
 * Stop a running machine
 */
export async function stopMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(
    `/apps/${appName}/machines/${machineId}/stop`,
    { method: "POST" },
    "stopMachine"
  );
}

/**
 * Delete a machine
 */
export async function deleteMachine(
  appName: string,
  machineId: string
): Promise<void> {
  await flyRequest(
    `/apps/${appName}/machines/${machineId}`,
    { method: "DELETE" },
    "deleteMachine"
  );
}

/**
 * Delete a Fly app
 */
export async function deleteApp(appName: string): Promise<void> {
  await flyRequest(
    `/apps/${appName}`,
    { method: "DELETE" },
    "deleteApp"
  );
}

/**
 * Get machine status
 */
export async function getMachine(
  appName: string,
  machineId: string
): Promise<Machine> {
  return flyRequest(
    `/apps/${appName}/machines/${machineId}`,
    {},
    "getMachine"
  ) as Promise<Machine>;
}

/**
 * List all machines in an app
 */
export async function listMachines(appName: string): Promise<Machine[]> {
  return flyRequest(
    `/apps/${appName}/machines`,
    {},
    "listMachines"
  ) as Promise<Machine[]>;
}
