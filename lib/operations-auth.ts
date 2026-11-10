import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { getDatabasePool } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";

export const getOperationsSession = cache(async () => {
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;

  const { rows } = await getDatabasePool().query<{ city_id: string | null }>(`
    SELECT NULLIF(city.city_id, 'all') AS city_id
    FROM users account
    JOIN roles role USING (role_id)
    LEFT JOIN cities city ON city.city_id = account.city_id
    WHERE account.user_id = $1 AND role.role_key = $2
      AND account.identity_type = 'login_account'
      AND account.account_status = 'active' AND account.deleted_at IS NULL
  `, [session.userId, session.role]);
  const account = rows[0];
  return account ? { ...session, cityId: account.city_id } : null;
});

export function hasValidRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
