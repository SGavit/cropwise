import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

const scrypt = (password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number }) => new Promise<Buffer>((resolve, reject) => {
  nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(derivedKey);
  });
});
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must be between 8 and 128 characters.");
  }
  return password;
}

export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })) as Buffer;
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  try {
    const [algorithm, n, r, p, saltText, hashText] = encoded.split("$");
    if (algorithm !== "scrypt" || !n || !r || !p || !saltText || !hashText) return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const derived = (await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) })) as Buffer;
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function createResetToken() {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
}

export function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function sendPasswordResetEmail(input: { email: string; resetUrl: string }) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.resendFromEmail,
      to: [input.email],
      subject: "Reset your CropWise password",
      text: `Use this one-time CropWise password reset link within 30 minutes:\n\n${input.resetUrl}\n\nIf you did not request this, you can ignore this message.`,
    }),
  });
  return response.ok;
}
