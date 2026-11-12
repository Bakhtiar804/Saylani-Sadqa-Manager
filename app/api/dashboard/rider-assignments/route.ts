import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getActiveTeamBranch } from "@/lib/city-branches";

const taskTypes = ["Scheduled Collection", "Box Verification", "Follow-up Visit"] as const;

async function handlePOST(request: Request) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to assign a rider." }, { status: 401 });
  if (!['admin', 'city_manager'].includes(session.role) || !session.cityId) return Response.json({ error: "A city-scoped operational account is required." }, { status: 403 });
  const assignedBranch = session.role === 'city_manager' ? await getActiveTeamBranch(session.userId, session.cityId) : null;
  if (session.role === 'city_manager' && !assignedBranch) return Response.json({ error: "An active branch assignment is required." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Enter the rider assignment details." }, { status: 400 }); }
  if (typeof input !== "object" || input === null) return Response.json({ error: "Enter the rider assignment details." }, { status: 400 });

  const body = input as Record<string, unknown>;
  const riderId = typeof body.riderId === "string" ? body.riderId.trim() : "";
  const boxId = typeof body.boxId === "string" ? body.boxId.trim() : "";
  const taskDate = typeof body.taskDate === "string" ? body.taskDate.trim() : "";
  const taskType = typeof body.taskType === "string" ? body.taskType : "";
  if (!riderId || riderId.length > 16 || !boxId || boxId.length > 16) {
    return Response.json({ error: "Choose a rider and a donation box." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(taskDate) || Number.isNaN(Date.parse(`${taskDate}T00:00:00.000Z`)) || new Date(`${taskDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== taskDate) {
    return Response.json({ error: "Choose a valid task date." }, { status: 400 });
  }
  if (!taskTypes.includes(taskType as typeof taskTypes[number])) {
    return Response.json({ error: "Choose a valid task type." }, { status: 400 });
  }

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const riderResult = await client.query<{ rider_id: string; city_id: string; branch_id: string | null }>(`
      SELECT rider.rider_id, account.city_id,
        COALESCE(account.branch_id, branch_assignment.branch_id) AS branch_id
      FROM riders rider JOIN team_members account USING (team_id)
      LEFT JOIN team_member_branch_assignments branch_assignment ON branch_assignment.team_id = account.team_id
      WHERE rider.rider_id = $1 AND rider.employment_status = 'Active'
        AND account.account_status = 'active' AND account.deleted_at IS NULL
      FOR UPDATE OF rider
    `, [riderId]);
    const rider = riderResult.rows[0];
    if (rider && rider.city_id !== session.cityId) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'This rider is outside your city.' }, { status: 403 });
    }
    if (!rider) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Choose an active rider." }, { status: 400 });
    }
    if (assignedBranch && rider.branch_id !== assignedBranch.branchId) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'Choose an active rider assigned to your branch.' }, { status: 403 });
    }

    const boxResult = await client.query<{ box_id: string; city_id: string; box_status: string; branch_id: string | null }>(`
      SELECT box.box_id, box.city_id, box.box_status, branch_assignment.branch_id
      FROM donation_boxes box
      LEFT JOIN branch_box_assignments branch_assignment ON branch_assignment.box_id = box.box_id
      WHERE box.box_id = $1 FOR UPDATE OF box
    `, [boxId]);
    const box = boxResult.rows[0];
    if (!box) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Choose a valid donation box." }, { status: 400 });
    }
    if (box.city_id !== rider.city_id) {
      await client.query("ROLLBACK");
      return Response.json({ error: "The selected rider and box must belong to the same city." }, { status: 400 });
    }
    if (assignedBranch && box.branch_id !== assignedBranch.branchId) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'Choose a donation box assigned to your branch.' }, { status: 403 });
    }
    if (box.box_status !== "Active" && taskType === "Scheduled Collection") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Collection tasks can only be assigned to active boxes." }, { status: 409 });
    }

    const taskResult = await client.query<{ task_id: string }>(`
      INSERT INTO rider_tasks (rider_id, box_id, task_date, task_type, task_status, workflow_stage, workflow_events)
      VALUES ($1, $2, $3, $4, 'Assigned', 'assigned', jsonb_build_array(jsonb_build_object(
        'event', 'assigned', 'status', 'Assigned', 'actor_team_id', $5::text, 'at', CURRENT_TIMESTAMP
      )))
      RETURNING task_id
    `, [riderId, boxId, taskDate, taskType, session.userId]);
    const taskId = taskResult.rows[0].task_id;
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'rider_task', $2, 'assigned', $3, NULL, $4::jsonb)
    `, [randomBytes(16).toString("hex"), taskId, session.userId, JSON.stringify({ riderId, boxId, taskDate, taskType, status: "Assigned" })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ taskId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not assign rider task.", error);
    return Response.json({ error: "The rider assignment could not be saved." }, { status: 503 });
  } finally {
    client.release();
  }
}

export const POST = withApiErrors(handlePOST);
