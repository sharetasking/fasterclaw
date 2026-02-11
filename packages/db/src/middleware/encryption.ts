import { Prisma } from "@prisma/client";
import { encrypt, decrypt, isEncryptionEnabled } from "../encryption.js";

/**
 * Configuration for fields that should be encrypted.
 * Maps model names to arrays of field names to encrypt.
 */
const ENCRYPTED_FIELDS = {
  Instance: ["telegramBotToken"],
} as const;

type ModelWithEncryption = keyof typeof ENCRYPTED_FIELDS;

/**
 * Helper to encrypt fields in data object.
 * Also handles Prisma nested `set` operations.
 */
function encryptDataFields<T extends Record<string, unknown>>(
  data: T,
  fields: readonly string[]
): T {
  if (!isEncryptionEnabled()) {
    return data;
  }

  const result = { ...data };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field] = encrypt(value);
    } else if (value !== null && typeof value === "object" && "set" in value) {
      // Handle Prisma nested { set: 'value' } syntax
      const setObj = value as { set: unknown };
      if (typeof setObj.set === "string") {
        (result as Record<string, unknown>)[field] = { set: encrypt(setObj.set) };
      }
    }
  }
  return result;
}

/**
 * Helper to decrypt fields in result object.
 */
function decryptResultFields<T>(result: T, fields: readonly string[]): T {
  if (!isEncryptionEnabled()) {
    return result;
  }
  if (result === null || result === undefined || typeof result !== "object") {
    return result;
  }

  // Handle arrays
  if (Array.isArray(result)) {
    return result.map((item: unknown) => decryptResultFields(item, fields)) as T;
  }

  // Handle single record
  const record = { ...result } as Record<string, unknown>;
  for (const field of fields) {
    const fieldValue = record[field];
    if (typeof fieldValue === "string") {
      record[field] = decrypt(fieldValue);
    }
  }
  return record as T;
}

/**
 * Get encrypted fields for a model, or empty array if not configured.
 */
function getEncryptedFields(model: ModelWithEncryption): readonly string[] {
  return ENCRYPTED_FIELDS[model];
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
          const fields = getEncryptedFields("Instance");
          if (fields.length > 0) {
            args.data = encryptDataFields(args.data, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async update({ args, query }) {
          const fields = getEncryptedFields("Instance");
          if (fields.length > 0) {
            args.data = encryptDataFields(args.data, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async updateMany({ args, query }) {
          const fields = getEncryptedFields("Instance");
          if (fields.length > 0) {
            args.data = encryptDataFields(args.data as Record<string, unknown>, fields);
          }
          // updateMany returns a count, not records, so no decryption needed
          return query(args);
        },
        async createMany({ args, query }) {
          const fields = getEncryptedFields("Instance");
          if (fields.length > 0) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) =>
                encryptDataFields(item as Record<string, unknown>, fields)
              ) as typeof args.data;
            } else {
              args.data = encryptDataFields(
                args.data as Record<string, unknown>,
                fields
              ) as typeof args.data;
            }
          }
          // createMany returns a count, not records, so no decryption needed
          return query(args);
        },
        async upsert({ args, query }) {
          const fields = getEncryptedFields("Instance");
          if (fields.length > 0) {
            args.create = encryptDataFields(args.create, fields);
            args.update = encryptDataFields(args.update, fields);
          }
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findUnique({ args, query }) {
          const fields = getEncryptedFields("Instance");
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findFirst({ args, query }) {
          const fields = getEncryptedFields("Instance");
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
        async findMany({ args, query }) {
          const fields = getEncryptedFields("Instance");
          const result = await query(args);
          return decryptResultFields(result, fields);
        },
      },
    },
  });
}
