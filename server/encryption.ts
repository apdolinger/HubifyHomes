import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const CANARY_PLAINTEXT = "hubify-encryption-canary-v1";

function getKey(): Buffer | null {
  const keyEnv = process.env.PLATFORM_ENCRYPTION_KEY;
  if (!keyEnv) return null;
  const buf = Buffer.from(keyEnv, "base64");
  if (buf.length !== 32) {
    console.warn("[ENCRYPTION] PLATFORM_ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded). Falling back to plaintext storage.");
    return null;
  }
  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Format on wire: base64(iv):base64(authTag):base64(ciphertext)
 * If PLATFORM_ENCRYPTION_KEY is not set, returns plaintext (dev-mode fallback).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;
  return encryptWithKey(plaintext, key);
}

/**
 * Encrypt using an explicit key buffer. Used for re-encryption with a new key.
 */
export function encryptWithKey(plaintext: string, keyBuf: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a value encrypted with encrypt().
 * If PLATFORM_ENCRYPTION_KEY is not set, or the value does not look encrypted,
 * returns the value as-is (handles plaintext legacy values gracefully).
 */
export function decrypt(value: string): string {
  const key = getKey();
  if (!key) return value;

  const parts = value.split(":");
  if (parts.length !== 3) {
    return value;
  }

  try {
    return decryptWithKey(value, key);
  } catch {
    return value;
  }
}

/**
 * Decrypt using an explicit key buffer. Returns the plaintext or throws if
 * decryption fails (wrong key, corrupted data, etc.).
 */
export function decryptWithKey(value: string, keyBuf: Buffer): string {
  const parts = value.split(":");
  if (parts.length !== 3) {
    return value; // plaintext passthrough
  }

  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

export function isEncryptionEnabled(): boolean {
  return getKey() !== null;
}

/**
 * Parse an old-key string (base64) supplied by the admin.
 * Returns null if invalid.
 */
export function parseKeyBase64(b64: string): Buffer | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== 32) return null;
    return buf;
  } catch {
    return null;
  }
}

/**
 * Returns the canary plaintext we use when writing/checking the stored canary.
 */
export function getCanaryPlaintext(): string {
  return CANARY_PLAINTEXT;
}
