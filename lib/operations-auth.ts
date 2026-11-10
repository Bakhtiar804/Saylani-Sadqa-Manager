import "server-only";

import { cookies } from "next/headers";
import { isActiveLoginAccount } from "@/lib/admin-accounts";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";

export async function getOperationsSession() {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !await isActiveLoginAccount(session.userId)) return null;
  return session;
}

export function hasValidRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    // Next.js can build request.url with the server's internal hostname.
    const expectedOrigin = host ? new URL(`${requestUrl.protocol}//${host}`).origin : requestUrl.origin;
    return origin === expectedOrigin;
  } catch {
    return false;
  }
}
