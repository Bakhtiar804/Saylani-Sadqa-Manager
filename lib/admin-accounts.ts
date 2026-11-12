import "server-only";

import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import type { AppRole } from "@/lib/session";
import type { UserSession } from "@/lib/session";
import type { QueryResultRow } from "pg";
import { deletableRoles, editableRoles } from './permissions';
import { getActiveTeamBranch } from '@/lib/city-branches';

export type TeamRole = "admin" | "city_manager" | "rider";
export type TeamAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "City Admin" | "Branch Admin" | "Rider";
  cityId: string | null;
  cityName: string | null;
  branchId: string | null;
  branchName: string | null;
  zone: string | null;
  accountStatus: "active" | "inactive" | "suspended";
  employmentStatus: "Active" | "Inactive" | null;
  createdAt: string | null;
};

export type TeamBranchOption = { branch_id: string; city_id: string; branch_name: string };

export async function listActiveTeamBranches(cityId?: string | null): Promise<TeamBranchOption[]> {
  const result = await getDatabasePool().query<TeamBranchOption>(
    `SELECT branch_id, city_id, branch_name FROM branches WHERE status = 'active' AND ($1::text IS NULL OR city_id = $1) ORDER BY branch_name`,
    [cityId ?? null],
  );
  return result.rows;
}

function getTeamRoleLabel(role: TeamRole): TeamAccount["role"] {
  if (role === "admin") return "City Admin";
  if (role === "city_manager") return "Branch Admin";
  return "Rider";
}

export async function listTeamAccounts(session: UserSession): Promise<TeamAccount[]> {
  const parameters: unknown[] = [];
  let filter = "r.role_key IN ('admin', 'city_admin', 'city_manager', 'branch_admin', 'rider')";
  if (session.role !== "super_admin") {
    if (!session.cityId) return [];
    parameters.push(session.cityId);
    filter += ` AND u.city_id = $${parameters.length}`;
    filter += session.role === "admin" ? " AND r.role_key IN ('city_manager', 'branch_admin', 'rider')" : " AND r.role_key = 'rider'";
  }
  if (session.role === "city_manager") {
    const branch = await getActiveTeamBranch(session.userId, session.cityId!);
    if (!branch) return [];
    parameters.push(branch.branchId);
    filter += ` AND COALESCE(u.branch_id, branch_assignment.branch_id) = $${parameters.length}`;
  }
  const branchColumns = session.role === "super_admin"
    ? "NULL::VARCHAR AS branch_id, NULL::VARCHAR AS branch_name"
    : "COALESCE(u.branch_id, branch_assignment.branch_id) AS branch_id, branch.branch_name";
  const branchJoins = session.role === "super_admin" ? "" : `
    LEFT JOIN team_member_branch_assignments branch_assignment ON branch_assignment.team_id = u.team_id
    LEFT JOIN branches branch ON branch.branch_id = COALESCE(u.branch_id, branch_assignment.branch_id)`;
  const result = await getDatabasePool().query<QueryResultRow & {
    team_id: string; full_name: string; email: string; phone: string; role_key: TeamRole;
    city_id: string | null; city_name: string | null;
    branch_id: string | null; branch_name: string | null;
    assigned_zone: string | null; account_status: TeamAccount["accountStatus"];
    employment_status: TeamAccount["employmentStatus"]; created_at: Date | null;
  }>(`
    SELECT u.team_id, u.full_name, u.email, u.phone, u.account_status,
      CASE r.role_key WHEN 'city_admin' THEN 'admin' WHEN 'branch_admin' THEN 'city_manager' ELSE r.role_key END AS role_key, u.city_id, city.city_name,
      rider.assigned_zone, rider.employment_status, u.created_at, ${branchColumns}
    FROM team_members u
    JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN cities city ON city.city_id = u.city_id
    LEFT JOIN riders rider ON rider.team_id = u.team_id
    ${branchJoins}
    WHERE u.identity_type = 'login_account' AND u.deleted_at IS NULL AND ${filter}
    ORDER BY u.created_at DESC, u.full_name
  `, parameters);
  return result.rows.map((row) => ({
    id: row.team_id, name: row.full_name, email: row.email, phone: row.phone,
    role: getTeamRoleLabel(row.role_key), cityId: row.city_id, cityName: row.city_name,
    branchId: row.branch_id, branchName: row.branch_name,
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
  const allowedTargets = deletableRoles[input.actor.role];
  if (!allowedTargets?.length || !deletableRoles[input.actor.role].length) throw new TeamAccountDeleteError("You cannot delete team accounts.", 403);
  const actorBranch = input.actor.role === "city_manager" && input.actor.cityId
    ? await getActiveTeamBranch(input.actor.userId, input.actor.cityId)
    : null;
  if (input.actor.role === "city_manager" && !actorBranch) throw new TeamAccountDeleteError("Your account needs an active branch assignment.", 403);

  if (input.userId === input.actor.userId) {
    throw new TeamAccountDeleteError("You cannot delete your own account.", 403);
  }

  const client = await getDatabasePool().connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const result = await client.query<QueryResultRow & {
      team_id: string; email: string; city_id: string | null; role_key: string; branch_id: string | null;
    }>(`
      SELECT u.team_id, u.email, u.city_id, role.role_key,
        COALESCE(u.branch_id, assignment.branch_id) AS branch_id
      FROM team_members u
      JOIN roles role ON role.role_id = u.role_id
      LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = u.team_id
      WHERE u.team_id = $1
        AND u.identity_type = 'login_account'
        AND u.deleted_at IS NULL
      FOR UPDATE OF u
    `, [input.userId]);
    const target = result.rows[0];
    if (!target) throw new TeamAccountDeleteError("This account was not found or has already been deleted.", 404);
    const targetRole = normalizeLoginRole(target.role_key);
    if (!targetRole || !allowedTargets.includes(targetRole as TeamRole)) {
      throw new TeamAccountDeleteError("You are not allowed to delete this role.", 403);
    }
    if (input.actor.role !== "super_admin" && (!input.actor.cityId || target.city_id !== input.actor.cityId)) {
      throw new TeamAccountDeleteError("You can only delete accounts in your assigned city.", 403);
    }
    if (input.actor.role === "city_manager" && target.branch_id !== actorBranch?.branchId) {
      throw new TeamAccountDeleteError("You can only delete Riders assigned to your branch.", 403);
    }
    if (target.email.trim().toLowerCase() !== input.confirmedEmail.trim().toLowerCase()) {
      throw new TeamAccountDeleteError("The confirmation email does not match this account.", 400);
    }

    await client.query(`
      UPDATE team_members
      SET account_status = 'inactive', deleted_at = CURRENT_TIMESTAMP
      WHERE team_id = $1
    `, [target.team_id]);
    if (target.role_key === "rider") {
      await client.query("UPDATE riders SET employment_status = 'Inactive' WHERE team_id = $1", [target.team_id]);
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

export async function updateTeamAccount(input:{userId:string;name:string;email:string;phone:string;accountStatus:TeamAccount['accountStatus'];assignedZone:string;employmentStatus:string;actor:UserSession}):Promise<TeamAccount> {
  if(input.userId===input.actor.userId || !editableRoles[input.actor.role].length) throw new TeamAccountDeleteError('You cannot edit this account.',403);
  const actorBranch = input.actor.role === "city_manager" && input.actor.cityId
    ? await getActiveTeamBranch(input.actor.userId, input.actor.cityId)
    : null;
  if (input.actor.role === "city_manager" && !actorBranch) throw new TeamAccountDeleteError("Your account needs an active branch assignment.", 403);
  const client=await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    const {rows:[target]}=await client.query<{role_key:string;city_id:string|null;branch_id:string|null}>(`SELECT r.role_key,u.city_id,COALESCE(u.branch_id,assignment.branch_id) AS branch_id FROM team_members u JOIN roles r USING(role_id) LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id=u.team_id WHERE u.team_id=$1 AND u.identity_type='login_account' AND u.deleted_at IS NULL FOR UPDATE OF u`,[input.userId]);
    if(!target) throw new TeamAccountDeleteError('This account was not found or has been removed.',404);
    const role=normalizeLoginRole(target.role_key);
    if(!role || !editableRoles[input.actor.role].includes(role as TeamRole) || (input.actor.role!=='super_admin'&&(!input.actor.cityId||target.city_id!==input.actor.cityId))) throw new TeamAccountDeleteError('You cannot edit this role or accounts outside your city.',403);
    if(input.actor.role==='city_manager'&&target.branch_id!==actorBranch?.branchId) throw new TeamAccountDeleteError('You can only edit Riders assigned to your branch.',403);
    if(role==='rider'&&(!input.assignedZone||input.assignedZone.length>80||!['Active','Inactive'].includes(input.employmentStatus))) throw new TeamAccountDeleteError('Enter a rider zone and valid employment status.',400);
    await client.query(`UPDATE team_members SET full_name=$2,email=$3,phone=$4,account_status=$5 WHERE team_id=$1`,[input.userId,input.name,input.email,input.phone,input.accountStatus]);
    if(role==='rider') {
      const updated=await client.query('UPDATE riders SET assigned_zone=$2,employment_status=$3 WHERE team_id=$1',[input.userId,input.assignedZone,input.employmentStatus]);
      if(updated.rowCount!==1) throw new TeamAccountDeleteError('Rider profile is missing. Contact your administrator.',409);
    }
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
  revalidateTag('dashboard-db-records',{expire:0});
  const account=(await listTeamAccounts(input.actor)).find(account=>account.id===input.userId);
  if(!account) throw new Error('Saved account could not be loaded.');
  return account;
}

export async function isActiveLoginAccount(userId: string): Promise<boolean> {
  const result = await getDatabasePool().query(`
    SELECT 1 FROM team_members
    WHERE team_id = $1
      AND identity_type = 'login_account'
      AND account_status = 'active'
      AND deleted_at IS NULL
    LIMIT 1
  `, [userId]);
  return result.rowCount === 1;
}

export async function isCurrentLoginSession(session: UserSession): Promise<boolean> {
  const result=await getDatabasePool().query<{role_key:string;city_id:string|null}>(`
    SELECT role.role_key,account.city_id FROM team_members account JOIN roles role USING(role_id)
    WHERE account.team_id=$1 AND account.identity_type='login_account'
      AND account.account_status='active' AND account.deleted_at IS NULL LIMIT 1`,[session.userId]);
  const account=result.rows[0];
  return Boolean(account && normalizeLoginRole(account.role_key)===session.role && account.city_id===session.cityId);
}
export async function createTeamAccount(input: {
  name: string; email: string; phone: string; passwordHash: string; role: TeamRole;
  cityId: string; accountStatus: TeamAccount["accountStatus"];
  assignedZone?: string; employmentStatus?: "Active" | "Inactive"; branchId?: string; assignedBranch?: string; assignedByTeamId?: string;
}): Promise<TeamAccount> {
  const pool = getDatabasePool();
  const client = input.role === "rider" || input.role === "city_manager" ? await pool.connect() : null;
  try {
    if (client) await client.query("BEGIN");
    const result = await (client ?? pool).query<QueryResultRow & {
      team_id: string; full_name: string; email: string; phone: string; role_key: TeamRole;
      city_id: string; city_name: string; branch_id: string | null; branch_name: string | null;
      account_status: TeamAccount["accountStatus"]; created_at: Date;
    }>(`
      INSERT INTO team_members (full_name, email, phone, city_id, role_id, identity_type, account_status, password_hash, assigned_branch, branch_id)
      VALUES ($1, $2, $3, $4,
        (SELECT role_id FROM roles WHERE role_key IN ($5::text, $8::text)
         ORDER BY CASE WHEN role_key = $5::text THEN 0 ELSE 1 END LIMIT 1),
        'login_account', $6, $7, $10, $9)
      RETURNING team_id, full_name, email, phone, city_id, account_status, created_at, branch_id,
        $5::VARCHAR AS role_key,
        (SELECT city_name FROM cities WHERE city_id = $4) AS city_name,
        (SELECT branch_name FROM branches WHERE branch_id = $9) AS branch_name
    `, [input.name, input.email.toLowerCase(), input.phone, input.cityId, input.role, input.accountStatus, input.passwordHash,
      input.role === 'admin' ? 'city_admin' : input.role === 'city_manager' ? 'branch_admin' : 'rider', input.branchId ?? null, input.assignedBranch ?? null]);
    const account = result.rows[0];
    if (!account) throw new Error("Account could not be created. Check that the selected role and city exist.");
    if (input.role === "city_manager" && !input.branchId) {
      throw new Error("Choose a branch for this Branch Admin account.");
    }
    if (input.branchId) {
      if (!input.assignedBranch || input.assignedBranch.length > 120 || !input.assignedByTeamId) {
        throw new Error("Choose a valid branch for this Branch Admin account.");
      }
      await client!.query(`
        INSERT INTO team_member_branch_assignments (team_id, city_id, branch_id, assigned_by_team_id)
        VALUES ($1, $2, $3, $4)
      `, [account.team_id, input.cityId, input.branchId, input.assignedByTeamId]);
    }
    if (input.role === "rider") {
      await client!.query(`
        INSERT INTO riders (team_id, employment_status, assigned_zone)
        VALUES ($1, $2, $3)
      `, [account.team_id, input.employmentStatus, input.assignedZone]);
    }
    if (client) {
      await client.query("COMMIT");
    }
    revalidateTag("dashboard-db-records", { expire: 0 });
    return {
      id: account.team_id, name: account.full_name, email: account.email, phone: account.phone,
      role: getTeamRoleLabel(account.role_key), cityId: account.city_id, cityName: account.city_name,
      branchId: account.branch_id, branchName: account.branch_name,
      zone: input.role === "rider" ? input.assignedZone ?? null : null,
      accountStatus: account.account_status,
      employmentStatus: input.role === "rider" ? input.employmentStatus ?? "Active" : null,
      createdAt: account.created_at?.toISOString() ?? null,
    };
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    client?.release();
  }
}

type DatabaseAdmin = QueryResultRow & {
  team_id: string;
  full_name: string;
  email: string;
  password_hash?: string;
  created_at: Date | null;
  role_key: string;
  display_name: string;
};

function normalizeLoginRole(roleKey: string): AppRole | null {
  switch (roleKey) {
    case "super_admin":
    case "admin":
    case "city_manager":
    case "rider":
      return roleKey;
    case "city_admin":
      return "admin";
    case "branch_admin":
      return "city_manager";
    default:
      return null;
  }
}

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
    SELECT u.team_id, u.full_name, u.email, u.password_hash, u.created_at,
           u.city_id, u.account_status, u.identity_type,
           r.role_key, r.display_name
    FROM team_members AS u
    JOIN roles AS r ON r.role_id = u.role_id
    WHERE LOWER(u.email) = $1
      AND u.identity_type = 'login_account'
      AND u.deleted_at IS NULL
    LIMIT 1
  `, [email.toLowerCase()]);

  const user = result.rows[0];
  if (!user || user.account_status !== "active" || !user.password_hash) return null;
  const role = normalizeLoginRole(user.role_key);
  if (!role) return null;

  return {
    id: user.team_id,
    email: user.email,
    name: user.full_name,
    passwordHash: user.password_hash,
    role,
    cityId: user.city_id,
  };
}
