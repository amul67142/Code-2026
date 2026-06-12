/**
 * AES-256-GCM token encryption for Facebook Page Access Tokens.
 * Tokens are stored as "iv.tag.ciphertext" (all hex).
 * NEVER store or log plaintext tokens.
 */
import crypto from "crypto";

function getKey(): Buffer {
  const hex = process.env.FACEBOOK_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "FACEBOOK_TOKEN_ENC_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext token using AES-256-GCM.
 * @returns "iv.tag.ciphertext" (all hex, dot-separated)
 */
export function encryptToken(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(".");
}

/**
 * Decrypt a token blob ("iv.tag.ciphertext") back to plaintext.
 */
export function decryptToken(blob: string): string {
  const key = getKey();
  const parts = blob.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format — expected iv.tag.ciphertext");
  }
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
