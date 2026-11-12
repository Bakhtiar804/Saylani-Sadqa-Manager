import "server-only";

import { getDatabasePool } from "@/lib/db";
import type { DataRecord } from "@/lib/dashboard-types";
import type { AssignedTeamBranch } from "@/lib/city-branches";

export async function getDonationBoxPageData(cityId: string, branch: AssignedTeamBranch | null) {
  const pool = getDatabasePool();
  const params: string[] = [cityId];
  const branchFilter = branch ? `AND assignment.branch_id = $2` : "";
  if (branch) params.push(branch.branchId);
  const [boxes, partners, users, riders] = await Promise.all([
    pool.query(`
      SELECT box.box_id, box.qr_code, box.city_id, box.area, box.district,
        box.location_type, box.location_description, box.custodian_team_id,
        box.partner_id, box.assigned_rider_id, box.installation_date,
        box.box_status, box.last_verified_date, box.security_level,
        branch.branch_name AS branch_id
      FROM donation_boxes box
      LEFT JOIN branch_box_assignments assignment ON assignment.box_id = box.box_id
      LEFT JOIN branches branch ON branch.branch_id = assignment.branch_id
      WHERE box.city_id = $1 ${branchFilter}
      ORDER BY box.box_id
    `, params),
    pool.query("SELECT partner_id, partner_name, city_id FROM partners WHERE city_id = $1 ORDER BY partner_name", [cityId]),
    pool.query(`SELECT member.team_id, member.full_name, member.city_id, member.identity_type
      FROM team_members member
      LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = member.team_id
      WHERE member.city_id = $1 AND member.identity_type = 'field_staff' AND member.deleted_at IS NULL
      ${branch ? "AND COALESCE(member.branch_id, assignment.branch_id) = $2" : ""}
      ORDER BY member.full_name`, params),
    pool.query(`SELECT rider.rider_id, member.full_name AS rider_name, member.city_id
      FROM riders rider JOIN team_members member USING (team_id)
      LEFT JOIN team_member_branch_assignments assignment ON assignment.team_id = member.team_id
      WHERE member.city_id = $1 AND member.account_status = 'active' AND member.deleted_at IS NULL
      ${branch ? "AND COALESCE(member.branch_id, assignment.branch_id) = $2" : ""}
      ORDER BY member.full_name`, params),
  ]);
  return {
    boxes: boxes.rows as DataRecord[],
    partners: partners.rows as DataRecord[],
    users: users.rows as DataRecord[],
    riders: riders.rows as DataRecord[],
  };
}
