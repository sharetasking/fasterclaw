/**
 * Token Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for OAuth tokens.
 * Tokens are stored encrypted in the database for security.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32"
  );
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
  );
}

/**
 * Encrypt a plaintext token
 * @param plaintext - The token to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encryptToken(plaintext: string): string {
  // Generate random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    iv
  );

  // Encrypt the plaintext
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get authentication tag
  const authTag = cipher.getAuthTag().toString("hex");

  // Return in format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted token
 * @param ciphertext - Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plaintext token
 */
export function decryptToken(ciphertext: string): string {
  // Parse the encrypted string
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format. Expected: iv:authTag:encrypted");
  }

  const [ivHex, authTagHex, encrypted] = parts;

  // Create decipher
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    Buffer.from(ivHex, "hex")
  );

  // Set authentication tag
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  // Decrypt
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Test encryption/decryption to verify ENCRYPTION_KEY is valid
 */
export function testEncryption(): boolean {
  try {
    const testData = "test-token-12345";
    const encrypted = encryptToken(testData);
    const decrypted = decryptToken(encrypted);
    return decrypted === testData;
  } catch (error) {
    console.error("Encryption test failed:", error);
    return false;
  }
}
