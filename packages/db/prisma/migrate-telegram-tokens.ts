import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error("ENCRYPTION_KEY must be 64-character hex string");
}

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function migrateTelegramTokens() {
  console.log("🔐 Starting Telegram bot token encryption migration...\n");

  // Find all instances with unencrypted tokens
  const instances = await prisma.$queryRaw<Array<{ id: string; telegramBotToken: string | null }>>`
    SELECT id, "telegramBotToken"
    FROM "Instance"
    WHERE "telegramBotToken" IS NOT NULL
      AND "encryptedTelegramBotToken" IS NULL
  `;

  if (instances.length === 0) {
    console.log("✅ No instances need migration - all tokens already encrypted!");
    return;
  }

  console.log(`Found ${instances.length} instance(s) with unencrypted tokens\n`);

  let encrypted = 0;
  let failed = 0;

  for (const instance of instances) {
    try {
      if (!instance.telegramBotToken) continue;

      const encryptedToken = encryptToken(instance.telegramBotToken);

      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          encryptedTelegramBotToken: encryptedToken,
        },
      });

      encrypted++;
      console.log(`✓ Encrypted token for instance ${instance.id}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to encrypt token for instance ${instance.id}:`, error);
    }
  }

  console.log(`\n🔐 Migration complete:`);
  console.log(`   ✅ Encrypted: ${encrypted}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
}

migrateTelegramTokens()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
