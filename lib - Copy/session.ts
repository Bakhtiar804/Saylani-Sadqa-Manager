import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;
export const SESSION_COOKIE_NAME = "saylani_admin_session";

export const APP_ROLES = ["super_admin", "admin", "city_manager", "rider"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type UserSession = {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  cityId: string | null;
  expiresAt: number;
};

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function signSession(payload: string): string {
  return createHmac("sha256", requiredEnvironmentVariable("AUTH_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function createUserSession(user: Omit<UserSession, "expiresAt">): {
  name: string;
  value: string;
  maxAge: number;
} {
  const maxAge = SESSION_DURATION_SECONDS;
  const payload = Buffer.from(JSON.stringify({
    ...user,
    expiresAt: Math.floor(Date.now() / 1000) + maxAge,
  } satisfies UserSession)).toString("base64url");

  return { name: SESSION_COOKIE_NAME, value: `${payload}.${signSession(payload)}`, maxAge };
}

export function verifyUserSession(value: string | undefined): UserSession | null {
  if (!value) return null;
  const [payload, signature, ...extraParts] = value.split(".");
  if (!payload || !signature || extraParts.length > 0) return null;

  try {
    const expectedSignature = Buffer.from(signSession(payload), "base64url");
    const receivedSignature = Buffer.from(signature, "base64url");
    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) return null;

    const session: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof session !== "object" || session === null) return null;
    if (
      !("userId" in session) || typeof session.userId !== "string" || !session.userId ||
      !("email" in session) || typeof session.email !== "string" ||
      !("name" in session) || typeof session.name !== "string" ||
      !("role" in session) || typeof session.role !== "string" ||
      !APP_ROLES.includes(session.role as AppRole) ||
      !("cityId" in session) || !(typeof session.cityId === "string" || session.cityId === null) ||
      !("expiresAt" in session) || typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null;

    return session as UserSession;
  } catch {
    return null;
  }
}
