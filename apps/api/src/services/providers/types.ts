/**
 * Instance Provider Interface
 * Abstracts the underlying infrastructure provider (Fly.io, Docker, etc.)
 */

export interface CreateInstanceConfig {
  name: string;
  userId: string;
  telegramBotToken?: string; // Optional for quick start mode
  aiProvider: "openai" | "anthropic" | "google";
  aiApiKey: string;
  aiModel: string;
  region?: string;
  quickStart?: boolean; // If true, enables web channel instead of Telegram
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

export interface ChatMessageResult {
  response: string;
}

export interface FileUploadResult {
  /** Path where the file was stored on the instance */
  filePath: string;
}

export interface InstanceProvider {
  readonly name: "fly" | "docker";

  createInstance(config: CreateInstanceConfig): Promise<ProviderResult>;
  startInstance(data: ProviderInstanceData): Promise<void>;
  stopInstance(data: ProviderInstanceData): Promise<void>;
  deleteInstance(data: ProviderInstanceData): Promise<void>;
  getInstanceStatus(data: ProviderInstanceData): Promise<string>;

  /** Send a chat message to an OpenClaw instance and return the response text. */
  sendMessage(
    data: ProviderInstanceData,
    sessionId: string,
    message: string,
    timeoutSeconds?: number,
  ): Promise<ChatMessageResult>;

  /** Upload a file to an OpenClaw instance. Returns the file path on the instance. */
  uploadFile(
    data: ProviderInstanceData,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<FileUploadResult>;
}
