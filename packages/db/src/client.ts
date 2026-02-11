import { PrismaClient } from "@prisma/client";
import { createEncryptionExtension } from "./middleware/encryption.js";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Prisma Client configuration
 *
 * For optimal connection pool settings during concurrent operations,
 * add these parameters to your DATABASE_URL:
 *
 * - connection_limit=25 (increase pool size from default 2-5)
 * - pool_timeout=30 (seconds to wait for available connection)
 * - connect_timeout=30 (seconds to establish new connection)
 *
 * Example: postgresql://user:pass@host:5432/db?connection_limit=25&pool_timeout=30
 *
 * For encryption of sensitive fields (telegramBotToken), set:
 * - ENCRYPTION_KEY (generate with: openssl rand -hex 32)
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  // Add encryption extension for sensitive fields
  return client.$extends(createEncryptionExtension());
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
