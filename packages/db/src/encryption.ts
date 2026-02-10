import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable.
 * The key is derived using scrypt for additional security.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  // Derive a 32-byte key using scrypt
  return scryptSync(key, "fasterclaw-salt", 32);
}

/**
 * Check if encryption is enabled (ENCRYPTION_KEY is set).
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 *
 * @example
 * ```typescript
 * const encrypted = encrypt("my-secret-token");
 * // Returns: "a1b2c3...:d4e5f6...:g7h8i9..."
 * ```
 */
export function encrypt(plaintext: string): string {
  if (!isEncryptionEnabled()) {
    return plaintext; // Return as-is if encryption not configured
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an encrypted string.
 *
 * @param ciphertext - The encrypted string in format: iv:authTag:encrypted
 * @returns The original plaintext string
 * @throws Error if decryption fails or format is invalid
 *
 * @example
 * ```typescript
 * const decrypted = decrypt("a1b2c3...:d4e5f6...:g7h8i9...");
 * // Returns: "my-secret-token"
 * ```
 */
export function decrypt(ciphertext: string): string {
  if (!isEncryptionEnabled()) {
    return ciphertext; // Return as-is if encryption not configured
  }

  // Check if this looks like encrypted data (has the format iv:authTag:data)
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    // Not encrypted data, return as-is (legacy data)
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Validate hex strings
  if (!isValidHex(ivHex) || !isValidHex(authTagHex) || !isValidHex(encryptedHex)) {
    // Not valid encrypted format, return as-is
    return ciphertext;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    // Validate lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return ciphertext; // Invalid format, return as-is
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    // Decryption failed - might be legacy unencrypted data
    return ciphertext;
  }
}

/**
 * Check if a string is valid hexadecimal.
 */
function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
}

/**
 * Mask a sensitive token for display purposes.
 * Shows first 10 characters and last 4 characters.
 *
 * @param token - The token to mask
 * @returns Masked token like "1234567890...abcd"
 *
 * @example
 * ```typescript
 * const masked = maskToken("1234567890abcdefghij");
 * // Returns: "1234567890...ghij"
 * ```
 */
export function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 14) return "***";
  return `${token.slice(0, 10)}...${token.slice(-4)}`;
}
