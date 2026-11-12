import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getActiveTeamBranch } from "@/lib/city-branches";

const boxStatuses = ["Active", "Inactive", "Damaged", "Under Review"] as const;

async function handlePATCH(request: Request, context: { params: Promise<{ boxId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to update a box." }, { status: 401 });
  if (!["admin", "city_manager"].includes(session.role)) return Response.json({ error: "Your role has read-only access to boxes." }, { status: 403 });
  if (session.role !== "super_admin" && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { boxId } = await context.params;
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Choose a status and give a reason." }, { status: 400 }); }
  if (typeof input !== "object" || input === null) return Response.json({ error: "Choose a status and give a reason." }, { status: 400 });
  const body = input as Record<string, unknown>;
  const status = body.status;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (typeof status !== "string" || !boxStatuses.includes(status as typeof boxStatuses[number])) return Response.json({ error: "Choose a valid box status." }, { status: 400 });
  if (reason.length < 3) return Response.json({ error: "Enter a reason of at least three characters." }, { status: 400 });

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ box_status: string; city_id: string }>(
      "SELECT box_status, city_id FROM donation_boxes WHERE box_id = $1 FOR UPDATE", [boxId],
    );
    const current = result.rows[0];
    const branch = session.role === 'city_manager' && session.cityId ? await getActiveTeamBranch(session.userId, session.cityId) : null;
    const branchBox = branch ? await client.query("SELECT 1 FROM branch_box_assignments WHERE box_id = $1 AND city_id = $2 AND branch_id = $3", [boxId, session.cityId, branch.branchId]) : null;
    if (!current || current.city_id !== session.cityId || (session.role === 'city_manager' && !branchBox?.rowCount)) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This box is not available in your scope." }, { status: 404 });
    }
    if (current.box_status === status) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This box already has that status." }, { status: 409 });
    }
    await client.query("UPDATE donation_boxes SET box_status = $2 WHERE box_id = $1", [boxId, status]);
    await client.query(`
      INSERT INTO box_status_history (history_id, box_id, previous_status, new_status, changed_on, changed_by_team_id, reason)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
    `, [randomBytes(8).toString("hex").toUpperCase(), boxId, current.box_status, status, session.userId, reason]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'donation_box', $2, 'status_changed', $3, $4::jsonb, $5::jsonb)
    `, [randomBytes(16).toString("hex"), boxId, session.userId, JSON.stringify({ status: current.box_status }), JSON.stringify({ status, reason })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ boxId, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not update donation box status.", error);
    return Response.json({ error: "The box status could not be updated." }, { status: 503 });
  } finally { client.release(); }
}

export const PATCH = withApiErrors(handlePATCH);
