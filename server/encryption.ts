import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

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

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

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
    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const encrypted = Buffer.from(encryptedB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return value;
  }
}

export function isEncryptionEnabled(): boolean {
  return getKey() !== null;
}
