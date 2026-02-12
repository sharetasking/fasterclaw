import { prisma } from "@fasterclaw/db";
import {
  getProvider,
  getProviderType,
} from "./providers/index.js";

/**
 * Determine AI provider from model name.
 */
export function getAIProvider(model: string): "openai" | "anthropic" | "google" {
  if (model.startsWith("gpt-") || model.startsWith("o1-")) {
    return "openai";
  }
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  if (model.startsWith("gemini-")) {
    return "google";
  }
  return "anthropic"; // default to anthropic for OpenClaw
}

/**
 * Get the correct API key for the AI provider.
 */
export function getAPIKeyForProvider(provider: "openai" | "anthropic" | "google"): string {
  const keys: Record<typeof provider, string | undefined> = {
    openai: process.env.OPENAI_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GEMINI_API_KEY,
  };

  const envVarNames: Record<typeof provider, string> = {
    openai: "OPENAI_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GEMINI_API_KEY",
  };

  const key = keys[provider];
  if (key === undefined || key === "") {
    throw new Error(
      `Missing API key for provider "${provider}". Set ${envVarNames[provider]} environment variable.`
    );
  }
  return key;
}

interface ProvisionInstanceOptions {
  userId: string;
  name: string;
  telegramBotToken?: string;
  aiModel?: string;
  region?: string;
  quickStart?: boolean;
  isDefault?: boolean;
}

/**
 * Create and provision an OpenClaw instance.
 * Creates the DB record synchronously and provisions in the background.
 * Returns the created instance ID.
 */
export async function provisionInstance(options: ProvisionInstanceOptions): Promise<string> {
  const {
    userId,
    name,
    telegramBotToken,
    aiModel = "gemini-2.0-flash",
    region = "lax",
    quickStart = false,
    isDefault = false,
  } = options;

  const providerType = getProviderType();
  const provider = getProvider();

  // Create instance record
  const instance = await prisma.instance.create({
    data: {
      userId,
      name,
      ...(telegramBotToken !== undefined && { telegramBotToken }),
      provider: providerType,
      region,
      aiModel,
      status: "CREATING",
      isDefault,
    },
  });

  // Provision in background
  void (async () => {
    try {
      const aiProvider = getAIProvider(aiModel);
      const apiKey = getAPIKeyForProvider(aiProvider);

      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: "PROVISIONING" },
      });

      const result = await provider.createInstance({
        name,
        userId,
        telegramBotToken: telegramBotToken ?? undefined,
        aiProvider,
        aiApiKey: apiKey,
        aiModel,
        region,
        quickStart,
      });

      const updateData: Record<string, unknown> = {
        ipAddress: result.ipAddress,
        status: "RUNNING",
      };

      if (providerType === "fly") {
        updateData.flyMachineId = result.providerId;
        updateData.flyAppName = result.providerAppId;
      } else {
        updateData.dockerContainerId = result.providerId;
        updateData.dockerPort = result.port;
      }

      await prisma.instance.update({
        where: { id: instance.id },
        data: updateData,
      });
    } catch (error: unknown) {
      console.error(`Failed to provision instance ${instance.id}:`, error);
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: "FAILED" },
      });
    }
  })();

  return instance.id;
}
