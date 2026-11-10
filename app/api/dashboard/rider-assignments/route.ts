import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getPakistanDate, taskTypes } from "@/lib/task-assignment";

export async function POST(request: Request) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to assign a rider." }, { status: 401 });
  const isManager = session.role === "city_manager";
  if (session.role !== "super_admin" && !isManager) return Response.json({ error: "Rider task assignment access is required." }, { status: 403 });
  if (isManager && !session.cityId) return Response.json({ error: "A city assignment is required." }, { status: 403 });
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
  if (taskDate < getPakistanDate()) {
    return Response.json({ error: "Choose today or a future task date." }, { status: 400 });
  }
  if (!taskTypes.includes(taskType as typeof taskTypes[number])) {
    return Response.json({ error: "Choose a valid task type." }, { status: 400 });
  }

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const managerCity = isManager ? session.cityId : null;
    if (isManager) {
      const manager = await client.query(`
        SELECT 1 FROM users account JOIN roles role USING (role_id)
        WHERE account.user_id = $1 AND account.city_id = $2 AND role.role_key = 'city_manager'
          AND account.account_status = 'active' AND account.deleted_at IS NULL
        FOR SHARE OF account
      `, [session.userId, managerCity]);
      if (!manager.rowCount) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Your city assignment or role changed. Sign in again." }, { status: 403 });
      }
    }

    const riderResult = await client.query<{ rider_id: string; city_id: string }>(`
      SELECT rider.rider_id, account.city_id
      FROM riders rider JOIN users account USING (user_id)
      LEFT JOIN roles role ON role.role_id = account.role_id
      WHERE rider.rider_id = $1 AND rider.employment_status = 'Active'
        AND account.account_status = 'active' AND account.deleted_at IS NULL
        AND ($2::text IS NULL OR (account.city_id = $2 AND account.identity_type = 'login_account' AND role.role_key = 'rider'))
      FOR UPDATE OF rider, account
    `, [riderId, managerCity]);
    const rider = riderResult.rows[0];
    if (!rider) {
      await client.query("ROLLBACK");
      return Response.json({ error: isManager ? "Choose an active rider login in your assigned city." : "Choose an active rider." }, { status: 400 });
    }

    const boxResult = await client.query<{ box_id: string; city_id: string; box_status: string }>(`
      SELECT box_id, city_id, box_status FROM donation_boxes
      WHERE box_id = $1 AND ($2::text IS NULL OR city_id = $2) FOR UPDATE
    `, [boxId, managerCity]);
    const box = boxResult.rows[0];
    if (!box) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Choose a valid donation box." }, { status: 400 });
    }
    if (box.city_id !== rider.city_id) {
      await client.query("ROLLBACK");
      return Response.json({ error: "The selected rider and box must belong to the same city." }, { status: 400 });
    }
    if (box.box_status !== "Active" && taskType === "Scheduled Collection") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Collection tasks can only be assigned to active boxes." }, { status: 409 });
    }

    // The rider row lock serializes assignments for this rider, including retries.
    const existingTask = await client.query(`
      SELECT 1 FROM rider_tasks
      WHERE rider_id = $1 AND box_id = $2 AND task_date = $3 AND task_type = $4
      LIMIT 1
    `, [riderId, boxId, taskDate, taskType]);
    if (existingTask.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This rider already has this task for the selected box and date." }, { status: 409 });
    }

    const taskId = `TSK-${randomBytes(8).toString("hex").toUpperCase()}`;
    await client.query(`
      INSERT INTO rider_tasks (task_id, rider_id, box_id, task_date, task_type, task_status)
      VALUES ($1, $2, $3, $4, $5, 'Assigned')
    `, [taskId, riderId, boxId, taskDate, taskType]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
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
