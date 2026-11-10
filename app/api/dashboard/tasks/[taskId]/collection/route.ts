import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { getPakistanDate } from "@/lib/task-assignment";

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to submit a collection." }, { status: 401 });
  if (session.role !== "rider") return Response.json({ error: "Only a rider can submit a field collection." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { taskId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Enter the collected amount." }, { status: 400 }); }
  const amountInput = typeof body === "object" && body !== null && "amount" in body ? body.amount : undefined;
  const amountText = typeof amountInput === "string" || typeof amountInput === "number" ? String(amountInput) : "";
  const amount = Number(amountText);
  const notes = typeof body === "object" && body !== null && "notes" in body && typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return Response.json({ error: "Enter an amount greater than zero with no more than two decimal places." }, { status: 400 });
  }

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ task_date: string; task_type: string; task_status: string; box_id: string; rider_id: string; city_id: string; partner_id: string | null; box_status: string; employment_status: string }>(`
      SELECT task.task_date::text AS task_date, task.task_type, task.task_status, task.box_id, task.rider_id,
        box.city_id, box.partner_id, box.box_status, rider.employment_status
      FROM rider_tasks task
      JOIN riders rider ON rider.rider_id = task.rider_id
      JOIN donation_boxes box ON box.box_id = task.box_id
      WHERE task.task_id = $1 AND rider.user_id = $2
      FOR UPDATE OF task FOR SHARE OF rider
    `, [taskId, session.userId]);
    const task = result.rows[0];
    if (!task) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task is not assigned to your account." }, { status: 404 });
    }
    if (task.employment_status !== "Active") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Only active riders can submit collections." }, { status: 403 });
    }
    if (task.task_status === "Completed") {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task already has a completed collection." }, { status: 409 });
    }
    if (task.task_status === "Cancelled") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Cancelled tasks cannot accept collections." }, { status: 409 });
    }
    if (task.task_date > getPakistanDate()) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Submit the collection on or after the scheduled date." }, { status: 409 });
    }
    if (task.task_status === "Skipped") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Resume this task before submitting a collection." }, { status: 409 });
    }
    if (task.task_type !== "Scheduled Collection") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Only scheduled collection tasks accept cash submissions." }, { status: 409 });
    }
    if (task.box_status !== "Active") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Collections can only be submitted for active boxes." }, { status: 409 });
    }

    const collectionId = `COL-${randomBytes(8).toString("hex").toUpperCase()}`;
    await client.query(`
      INSERT INTO collections (
        collection_id, box_id, rider_id, city_id, partner_id, collection_date, collection_time,
        collection_amount_pkr, collection_status, recorded_by_user_id, notes, is_demo_record
      ) VALUES ($1, $2, $3, $4, $5, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time, $6, 'Pending Verification', $7, $8, FALSE)
    `, [collectionId, task.box_id, task.rider_id, task.city_id, task.partner_id, amount, session.userId, notes || null]);
    await client.query(`UPDATE rider_tasks SET task_status = 'Completed', completion_time = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time WHERE task_id = $1`, [taskId]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
      VALUES ($1, 'collection', $2, 'submitted', $3, NULL, $4::jsonb)
    `, [randomBytes(16).toString("hex"), collectionId, session.userId, JSON.stringify({ taskId, boxId: task.box_id, amount, status: "Pending Verification" })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ collectionId, status: "Pending Verification" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not save rider collection.", error);
    return Response.json({ error: "The collection could not be saved." }, { status: 503 });
  } finally { client.release(); }
}
