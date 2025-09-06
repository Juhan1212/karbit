import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-32-char-secret-key-here-must-be-32-chars";
const ALGORITHM = "aes-256-cbc";

// 키가 정확히 32바이트인지 확인하고 조정
function getKey(): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY, "utf8");
  if (key.length === 32) {
    return key;
  } else if (key.length < 32) {
    // 32바이트보다 짧으면 0으로 패딩
    return Buffer.concat([key, Buffer.alloc(32 - key.length)]);
  } else {
    // 32바이트보다 길면 잘라냄
    return key.slice(0, 32);
  }
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
