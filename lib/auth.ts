import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function decodePasswordHash(encodedHash: string): { salt: Buffer; hash: Buffer } {
  const [encodedSalt, encodedKey, ...extraParts] = encodedHash.split(".");
  const salt = Buffer.from(encodedSalt ?? "", "base64url");
  const hash = Buffer.from(encodedKey ?? "", "base64url");

  if (
    extraParts.length > 0 ||
    salt.length !== 16 ||
    hash.length !== 64 ||
    salt.toString("base64url") !== encodedSalt ||
    hash.toString("base64url") !== encodedKey
  ) {
    throw new Error("Password hash must be a valid scrypt hash.");
  }

  return { salt, hash };
}

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { maxmem: 128 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(Buffer.from(derivedKey));
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return `${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const { salt, hash } = decodePasswordHash(encodedHash);
  const derivedPassword = await derivePassword(password, salt);
  return timingSafeEqual(derivedPassword, hash);
}

export function getSuperAdminEmail(): string {
  return requiredEnvironmentVariable("SUPER_ADMIN_EMAIL").toLowerCase();
}

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const matchesSuperAdmin = email.trim().toLowerCase() === getSuperAdminEmail();
  const encodedHash = requiredEnvironmentVariable("SUPER_ADMIN_PASSWORD_HASH");
  const validPassword = await verifyPassword(password, encodedHash);

  return matchesSuperAdmin && validPassword;
}
