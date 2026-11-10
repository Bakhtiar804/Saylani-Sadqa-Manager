import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import type { AppRole } from "@/lib/session";
import type { UserSession } from "@/lib/session";
import type { QueryResultRow } from "pg";

export type TeamRole = "admin" | "city_manager" | "rider";
export type TeamAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "Admin" | "City Manager" | "Rider";
  cityId: string | null;
  cityName: string | null;
  zone: string | null;
  accountStatus: "active" | "inactive" | "suspended";
  employmentStatus: "Active" | "Inactive" | null;
  createdAt: string | null;
};

export async function listTeamAccounts(session: UserSession): Promise<TeamAccount[]> {
  const parameters: unknown[] = [];
  let filter = "r.role_key IN ('admin', 'city_manager', 'rider')";
  if (session.role !== "super_admin") {
    if (!session.cityId) return [];
    parameters.push(session.cityId);
    filter += ` AND u.city_id = $${parameters.length}`;
    filter += session.role === "admin" ? " AND r.role_key IN ('city_manager', 'rider')" : " AND r.role_key = 'rider'";
  }
  const result = await getDatabasePool().query<QueryResultRow & {
    user_id: string; full_name: string; email: string; phone: string; role_key: TeamRole;
    display_name: TeamAccount["role"]; city_id: string | null; city_name: string | null;
    assigned_zone: string | null; account_status: TeamAccount["accountStatus"];
    employment_status: TeamAccount["employmentStatus"]; created_at: Date | null;
  }>(`
    SELECT u.user_id, u.full_name, u.email, u.phone, u.account_status,
      r.role_key, r.display_name, u.city_id, city.city_name,
      rider.assigned_zone, rider.employment_status, u.created_at
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN cities city ON city.city_id = u.city_id
    LEFT JOIN riders rider ON rider.user_id = u.user_id
    WHERE u.identity_type = 'login_account' AND u.deleted_at IS NULL AND ${filter}
    ORDER BY u.created_at DESC, u.full_name
  `, parameters);
  return result.rows.map((row) => ({
    id: row.user_id, name: row.full_name, email: row.email, phone: row.phone,
    role: row.display_name, cityId: row.city_id, cityName: row.city_name,
    zone: row.assigned_zone, accountStatus: row.account_status,
    employmentStatus: row.employment_status, createdAt: row.created_at?.toISOString() ?? null,
  }));
}

export class TeamAccountDeleteError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TeamAccountDeleteError";
  }
}

export async function softDeleteTeamAccount(input: {
  userId: string;
  confirmedEmail: string;
  actor: UserSession;
}): Promise<void> {
  const deleteRoles: Partial<Record<AppRole, readonly TeamRole[]>> = {
    super_admin: ["admin", "city_manager", "rider"],
    admin: ["city_manager", "rider"],
    city_manager: ["rider"],
  };
  const allowedTargets = deleteRoles[input.actor.role];
  if (!allowedTargets) throw new TeamAccountDeleteError("You cannot delete team accounts.", 403);

  const client = await getDatabasePool().connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const result = await client.query<QueryResultRow & {
      user_id: string; email: string; city_id: string | null; role_key: string;
    }>(`
      SELECT u.user_id, u.email, u.city_id, role.role_key
      FROM users u
      JOIN roles role ON role.role_id = u.role_id
      WHERE u.user_id = $1
        AND u.identity_type = 'login_account'
        AND u.deleted_at IS NULL
      FOR UPDATE
    `, [input.userId]);
    const target = result.rows[0];
    if (!target) throw new TeamAccountDeleteError("This account was not found or has already been deleted.", 404);
    if (!allowedTargets.includes(target.role_key as TeamRole)) {
      throw new TeamAccountDeleteError("You are not allowed to delete this role.", 403);
    }
    if (input.actor.role !== "super_admin" && (!input.actor.cityId || target.city_id !== input.actor.cityId)) {
      throw new TeamAccountDeleteError("You can only delete accounts in your assigned city.", 403);
    }
    if (target.email.trim().toLowerCase() !== input.confirmedEmail.trim().toLowerCase()) {
      throw new TeamAccountDeleteError("The confirmation email does not match this account.", 400);
    }

    await client.query(`
      UPDATE users
      SET account_status = 'inactive', deleted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [target.user_id]);
    if (target.role_key === "rider") {
      await client.query("UPDATE riders SET employment_status = 'Inactive' WHERE user_id = $1", [target.user_id]);
    }
    await client.query("COMMIT");
    transactionOpen = false;
    revalidateTag("dashboard-db-records", { expire: 0 });
  } catch (error) {
    if (transactionOpen) {
      try { await client.query("ROLLBACK"); } catch { /* Preserve the original failure. */ }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function isActiveLoginAccount(userId: string): Promise<boolean> {
  const result = await getDatabasePool().query(`
    SELECT 1 FROM users
    WHERE user_id = $1
      AND identity_type = 'login_account'
      AND account_status = 'active'
      AND deleted_at IS NULL
    LIMIT 1
  `, [userId]);
  return result.rowCount === 1;
}

export async function createTeamAccount(input: {
  name: string; email: string; phone: string; passwordHash: string; role: TeamRole;
  cityId: string; accountStatus: TeamAccount["accountStatus"];
  assignedZone?: string; employmentStatus?: "Active" | "Inactive";
}): Promise<TeamAccount> {
  const pool = getDatabasePool();
  const client = await pool.connect();
  const userId = `USR-${randomUUID()}`;
  const riderId = `RID-${randomBytes(6).toString("hex")}`;
  try {
    await client.query("BEGIN");
    const result = await client.query<QueryResultRow & {
      user_id: string; full_name: string; email: string; phone: string; role_key: TeamRole;
      display_name: TeamAccount["role"]; city_id: string; city_name: string;
      account_status: TeamAccount["accountStatus"]; created_at: Date;
    }>(`
      INSERT INTO users (user_id, full_name, email, phone, city_id, role_id, identity_type, account_status, password_hash)
      VALUES ($1, $2, $3, $4, $5,
        (SELECT role_id FROM roles WHERE role_key = $6),
        'login_account', $7, $8)
      RETURNING user_id, full_name, email, phone, city_id, account_status, created_at,
        $6::VARCHAR AS role_key,
        (SELECT display_name FROM roles WHERE role_key = $6) AS display_name,
        (SELECT city_name FROM cities WHERE city_id = $5) AS city_name
    `, [userId, input.name, input.email.toLowerCase(), input.phone, input.cityId, input.role, input.accountStatus, input.passwordHash]);
    const account = result.rows[0];
    if (!account) throw new Error("Account could not be created. Check that the selected role and city exist.");
    if (input.role === "rider") {
      await client.query(`
        INSERT INTO riders (rider_id, user_id, employment_status, assigned_zone)
        VALUES ($1, $2, $3, $4)
      `, [riderId, userId, input.employmentStatus, input.assignedZone]);
    }
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return {
      id: account.user_id, name: account.full_name, email: account.email, phone: account.phone,
      role: account.display_name, cityId: account.city_id, cityName: account.city_name,
      zone: input.role === "rider" ? input.assignedZone ?? null : null,
      accountStatus: account.account_status,
      employmentStatus: input.role === "rider" ? input.employmentStatus ?? "Active" : null,
      createdAt: account.created_at?.toISOString() ?? null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

type DatabaseAdmin = QueryResultRow & {
  user_id: string;
  full_name: string;
  email: string;
  password_hash?: string;
  created_at: Date | null;
  role_key: string;
  display_name: string;
};

export async function findLoginAccountByEmail(email: string): Promise<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AppRole;
  cityId: string | null;
} | null> {
  const result = await getDatabasePool().query<DatabaseAdmin & {
    city_id: string | null;
    account_status: string;
    identity_type: string;
  }>(`
    SELECT u.user_id, u.full_name, u.email, u.password_hash, u.created_at,
           u.city_id, u.account_status, u.identity_type,
           r.role_key, r.display_name
    FROM users AS u
    JOIN roles AS r ON r.role_id = u.role_id
    WHERE LOWER(u.email) = $1
      AND u.identity_type = 'login_account'
      AND u.deleted_at IS NULL
    LIMIT 1
  `, [email.toLowerCase()]);

  const user = result.rows[0];
  if (!user || user.account_status !== "active" || !user.password_hash) return null;
  if (!(["super_admin", "admin", "city_manager", "rider"] as const).includes(user.role_key as AppRole)) {
    return null;
  }

  return {
    id: user.user_id,
    email: user.email,
    name: user.full_name,
    passwordHash: user.password_hash,
    role: user.role_key as AppRole,
    cityId: user.city_id,
  };
}
