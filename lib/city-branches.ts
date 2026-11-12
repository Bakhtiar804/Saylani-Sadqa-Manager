import "server-only";

import { getDatabasePool } from "@/lib/db";

export type CityBranch = {
  branchId: string;
  cityId: string;
  cityName: string;
  name: string;
  code: string | null;
  address: string | null;
  contactPhone: string | null;
  status: "active" | "inactive";
  createdAt: string;
};

export type AssignedTeamBranch = { branchId: string; branchName: string; cityId: string };

type BranchRow = {
  branch_id: string;
  city_id: string;
  city_name: string;
  branch_name: string;
  branch_code: string | null;
  address: string | null;
  contact_phone: string | null;
  status: "active" | "inactive";
  created_at: Date;
};

function mapBranch(row: BranchRow): CityBranch {
  return {
    branchId: row.branch_id,
    cityId: row.city_id,
    cityName: row.city_name,
    name: row.branch_name,
    code: row.branch_code,
    address: row.address,
    contactPhone: row.contact_phone,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listCityBranches(cityId: string): Promise<CityBranch[]> {
  const result = await getDatabasePool().query<BranchRow>(`
    SELECT branch.branch_id, branch.city_id, city.city_name,
      branch.branch_name, branch.branch_code, branch.address,
      branch.contact_phone, branch.status, branch.created_at
    FROM branches branch
    JOIN cities city ON city.city_id = branch.city_id
    WHERE branch.city_id = $1
    ORDER BY branch.status, branch.branch_name
  `, [cityId]);
  return result.rows.map(mapBranch);
}

export async function getActiveTeamBranch(teamId: string, cityId: string): Promise<AssignedTeamBranch | null> {
  const result = await getDatabasePool().query<{
    branch_id: string;
    branch_name: string;
    city_id: string;
  }>(`
    SELECT branch.branch_id, branch.branch_name, branch.city_id
    FROM team_members member
    JOIN roles role ON role.role_id = member.role_id
    LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = member.team_id
    JOIN branches branch ON branch.branch_id = COALESCE(member.branch_id, assignment.branch_id)
    WHERE member.team_id = $1 AND member.city_id = $2
      AND member.identity_type = 'login_account'
      AND member.account_status = 'active' AND member.deleted_at IS NULL
      AND role.role_key IN ('branch_admin', 'city_manager')
      AND branch.status = 'active'
    LIMIT 1
  `, [teamId, cityId]);
  const branch = result.rows[0];
  return branch ? { branchId: branch.branch_id, branchName: branch.branch_name, cityId: branch.city_id } : null;
}

export async function createCityBranch(input: {
  cityId: string;
  name: string;
  code: string | null;
  address: string | null;
  contactPhone: string | null;
  status: "active" | "inactive";
  createdByTeamId: string;
}): Promise<CityBranch> {
  const result = await getDatabasePool().query<BranchRow>(`
    INSERT INTO branches (
      city_id, branch_name, branch_code, address, contact_phone, status, created_by_team_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING branch_id, city_id,
      (SELECT city_name FROM cities WHERE city_id = $1) AS city_name,
      branch_name, branch_code, address, contact_phone, status, created_at
  `, [input.cityId, input.name, input.code, input.address, input.contactPhone, input.status, input.createdByTeamId]);
  const branch = result.rows[0];
  if (!branch) throw new Error("The branch could not be created.");
  return mapBranch(branch);
}
