import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;
export const SESSION_COOKIE_NAME = "saylani_admin_session";

type AdminSession = {
  email: string;
  role: "super_admin" | "admin";
  adminId?: number;
  expiresAt: number;
};

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function signSession(payload: string): string {
  return createHmac("sha256", requiredEnvironmentVariable("AUTH_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function createAdminSession(
  email: string,
  role: AdminSession["role"],
  adminId?: number,
): {
  name: string;
  value: string;
  maxAge: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ email, role, adminId, expiresAt } satisfies AdminSession),
  ).toString("base64url");

  return {
    name: SESSION_COOKIE_NAME,
    value: `${payload}.${signSession(payload)}`,
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export function verifyAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null;

  const [payload, signature, ...extraParts] = value.split(".");
  if (!payload || !signature || extraParts.length > 0) return null;

  const expectedSignature = Buffer.from(signSession(payload), "base64url");
  const receivedSignature = Buffer.from(signature, "base64url");
  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof session !== "object" ||
      session === null ||
      !("email" in session) ||
      !("role" in session) ||
      !("expiresAt" in session) ||
      typeof session.email !== "string" ||
      (session.role !== "super_admin" && session.role !== "admin") ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    if (session.role === "super_admin") {
      const configuredEmail = requiredEnvironmentVariable("SUPER_ADMIN_EMAIL");
      if (session.email.toLowerCase() !== configuredEmail.toLowerCase()) {
        return null;
      }
      return { email: session.email, role: session.role, expiresAt: session.expiresAt };
    }

    if (
      !("adminId" in session) ||
      typeof session.adminId !== "number" ||
      !Number.isSafeInteger(session.adminId) ||
      session.adminId < 1
    ) {
      return null;
    }

    return {
      email: session.email,
      role: session.role,
      adminId: session.adminId,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}
