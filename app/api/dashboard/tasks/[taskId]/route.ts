import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getPakistanDate } from "@/lib/task-assignment";

const taskStatuses = ["In Progress", "Skipped", "Completed"] as const;

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to update a task." }, { status: 401 });
  if (session.role !== "rider") return Response.json({ error: "Only the assigned rider can update this task." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { taskId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Provide a task status." }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("status" in body) || !taskStatuses.includes(body.status as typeof taskStatuses[number])) {
    return Response.json({ error: "Choose In Progress, Skipped, or Completed." }, { status: 400 });
  }
  const notes = "notes" in body && typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ task_date: string; task_status: string; task_type: string; employment_status: string }>(`
      SELECT task.task_date::text AS task_date, task.task_status, task.task_type, rider.employment_status FROM rider_tasks task
      JOIN riders rider ON rider.rider_id = task.rider_id
      WHERE task.task_id = $1 AND rider.user_id = $2
      FOR UPDATE OF task FOR SHARE OF rider
    `, [taskId, session.userId]);
    const current = result.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task is not assigned to your account." }, { status: 404 });
    }
    if (current.employment_status !== "Active") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Only active riders can update tasks." }, { status: 403 });
    }
    if (current.task_status === "Completed") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Completed tasks cannot be changed." }, { status: 409 });
    }
    if (current.task_date > getPakistanDate()) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Task actions are available on or after the scheduled date." }, { status: 409 });
    }
    const status = body.status as typeof taskStatuses[number];
    if (status === "Completed" && current.task_status === "Skipped") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Resume this task before completing it." }, { status: 409 });
    }
    if (status === "Completed" && current.task_type === "Scheduled Collection") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Submit the cash collection to complete this task." }, { status: 409 });
    }
    await client.query(`
      UPDATE rider_tasks SET task_status = $2::text,
        notes = CASE WHEN $3 = '' THEN notes ELSE CONCAT_WS(E'\\n', notes, 'Rider update: ' || $3) END,
        completion_time = CASE WHEN $2::text = 'Completed' THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time ELSE NULL END
      WHERE task_id = $1
    `, [taskId, status, notes]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
      VALUES ($1, 'rider_task', $2, 'status_updated', $3, $4::jsonb, $5::jsonb)
    `, [randomBytes(16).toString("hex"), taskId, session.userId, JSON.stringify({ status: current.task_status }), JSON.stringify({ status, notes })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ taskId, status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not update rider task.", error);
    return Response.json({ error: "The task could not be updated." }, { status: 503 });
  } finally { client.release(); }
}
