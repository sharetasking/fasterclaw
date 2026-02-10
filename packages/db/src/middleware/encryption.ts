import { Prisma, PrismaClient } from "@prisma/client";
import { encrypt, decrypt, isEncryptionEnabled } from "../encryption.js";

/**
 * Configuration for fields that should be encrypted.
 * Maps model names to arrays of field names to encrypt.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Instance: ["telegramBotToken"],
};

/**
 * Helper to encrypt fields in data object.
 */
function encryptDataFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[]
): T {
  if (!isEncryptionEnabled()) return data;

  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      (result as Record<string, unknown>)[field] = encrypt(result[field] as string);
    }
  }
  return result;
}

/**
 * Helper to decrypt fields in result object.
 */
function decryptResultFields<T>(result: T, fields: string[]): T {
  if (!isEncryptionEnabled()) return result;
  if (!result || typeof result !== "object") return result;

  // Handle arrays
  if (Array.isArray(result)) {
    return result.map((item) => decryptResultFields(item, fields)) as T;
  }

  // Handle single record
  const record = { ...result } as Record<string, unknown>;
  for (const field of fields) {
    if (typeof record[field] === "string") {
      record[field] = decrypt(record[field] as string);
    }
  }
  return record as T;
}

/**
 * Creates a Prisma Client extension that automatically encrypts and decrypts sensitive fields.
 *
 * - On create/update: encrypts specified fields before writing to database
 * - On read: decrypts specified fields after reading from database
 *
 * Fields are only encrypted if ENCRYPTION_KEY environment variable is set.
 * Legacy unencrypted data is returned as-is for backwards compatibility.
 */
export function createEncryptionExtension() {
  return Prisma.defineExtension({
    name: "encryption",
    query: {
      instance: {
        async create({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          if (args.data && fields.length > 0) {
            args.data = encryptDataFields(args.data, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async update({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          if (args.data && fields.length > 0) {
            args.data = encryptDataFields(args.data, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async upsert({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          if (args.create && fields.length > 0) {
            args.create = encryptDataFields(args.create, fields);
          }
          if (args.update && fields.length > 0) {
            args.update = encryptDataFields(args.update, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findUnique({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findFirst({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findMany({ args, query }) {
          const fields = ENCRYPTED_FIELDS["Instance"] || [];
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
      },
    },
  });
}
