/**
 * Instance Provider Interface
 * Abstracts the underlying infrastructure provider (Fly.io, Docker, etc.)
 */

export interface CreateInstanceConfig {
  name: string;
  userId: string;
  telegramBotToken: string;
  aiProvider: "openai" | "anthropic" | "google";
  aiApiKey: string;
  aiModel: string;
  region?: string;
}

export interface ProviderResult {
  providerId: string; // flyMachineId or dockerContainerId
  providerAppId: string; // flyAppName or container name
  ipAddress?: string;
  port?: number;
}

export interface ProviderInstanceData {
  flyMachineId?: string | null;
  flyAppName?: string | null;
  dockerContainerId?: string | null;
  dockerPort?: number | null;
}

export interface InstanceProvider {
  readonly name: "fly" | "docker";

  createInstance(config: CreateInstanceConfig): Promise<ProviderResult>;
  startInstance(data: ProviderInstanceData): Promise<void>;
  stopInstance(data: ProviderInstanceData): Promise<void>;
  deleteInstance(data: ProviderInstanceData): Promise<void>;
  getInstanceStatus(data: ProviderInstanceData): Promise<string>;
}
