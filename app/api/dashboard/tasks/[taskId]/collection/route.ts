import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { countCash } from '@/lib/rider-workflow';

async function handlePOST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to submit a collection." }, { status: 401 });
  if (session.role !== "rider") return Response.json({ error: "Only a rider can submit a field collection." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { taskId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Enter the collected amount." }, { status: 400 }); }
  let cash: ReturnType<typeof countCash>;
  try {
    cash = countCash(typeof body === 'object' && body !== null && 'counts' in body ? body.counts : undefined);
    if (cash.total <= 0) throw new Error('Enter at least one coin or note before submitting.');
  } catch(error) {
    return Response.json({error:error instanceof Error ? error.message : 'Invalid cash counts.'},{status:400});
  }
  const amount = cash.total;
  const notes = typeof body === "object" && body !== null && "notes" in body && typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ task_id: string; task_status: string; workflow_stage:string; task_type:string; box_id: string; rider_id: string; city_id: string; partner_id: string | null; box_status: string }>(`
      SELECT task.task_id, task.task_status, task.workflow_stage, task.task_type, task.box_id, task.rider_id,
        box.city_id, box.partner_id, box.box_status
      FROM rider_tasks task
      JOIN riders rider ON rider.rider_id = task.rider_id
      JOIN donation_boxes box ON box.box_id = task.box_id
      WHERE task.task_id = $1 AND rider.team_id = $2 AND rider.employment_status='Active'
      FOR UPDATE OF task, box
    `, [taskId, session.userId]);
    const task = result.rows[0];
    if (!task) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task is not assigned to your account." }, { status: 404 });
    }
    if (task.task_status !== 'In Progress' || task.workflow_stage !== 'counting' || task.task_type!=='Scheduled Collection') {
      await client.query("ROLLBACK");
      return Response.json({ error: "Mark departure, arrival and cash counting before submitting this collection. Resume skipped tasks first." }, { status: 409 });
    }
    if (task.box_status !== "Active") {
      await client.query("ROLLBACK");
      return Response.json({ error: "Collections can only be submitted for active boxes." }, { status: 409 });
    }

    const collectionId = `COL-${randomBytes(8).toString("hex").toUpperCase()}`;
    await client.query(`
      INSERT INTO collections (
        collection_id, box_id, rider_id, city_id, partner_id, collection_date, collection_time,
        collection_amount_pkr, collection_status, recorded_by_team_id, notes, is_demo_record
      ) VALUES ($1, $2, $3, $4, $5, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time, $6, 'Pending Verification', $7, $8, FALSE)
    `, [collectionId, task.box_id, task.rider_id, task.city_id, task.partner_id, amount, session.userId, notes || null]);
    await client.query(`UPDATE collections SET cash_breakdown=$2::jsonb,rider_task_id=$3,cash_notes_pkr=$4,cash_coins_pkr=$5,other_cash_pkr=0,cash_total_counted_pkr=$6,counted_by_team_id=$7,cash_handover_status='Pending',deposit_status='Pending' WHERE collection_id=$1`,[collectionId,JSON.stringify(cash.counts),taskId,cash.notes,cash.coins,amount,session.userId]);
    await client.query(`INSERT INTO field_collection_logs(field_collection_id,collection_date,collection_time,box_id,city_id,rider_id,task_id,box_status_at_visit,cash_notes_pkr,cash_coins_pkr,other_cash_pkr,total_cash_counted_pkr,counted_by_team_id,collection_status,cash_handover_status,deposit_status,remarks,created_at,is_demo_record,area,location_type,full_location_description,partner_id)
      SELECT $1::text,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time,$2::text,$3::text,$4::text,$5::text,$6::text,$7::numeric,$8::numeric,0,$9::numeric,$10::text,'Pending Verification','Pending','Pending',$11::text,CURRENT_TIMESTAMP,FALSE,box.area,box.location_type,box.location_description,box.partner_id FROM donation_boxes box WHERE box.box_id=$2::text`,[`FLD-${randomBytes(8).toString('hex').toUpperCase()}`,task.box_id,task.city_id,task.rider_id,taskId,task.box_status,cash.notes,cash.coins,amount,session.userId,notes||null]);
    await client.query(`UPDATE rider_tasks SET task_status = 'Completed',workflow_stage='submitted',workflow_events=workflow_events || jsonb_build_array(jsonb_build_object('stage','submitted','at',CURRENT_TIMESTAMP,'collectionId',$2::text)), completion_time = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time WHERE task_id = $1`, [taskId,collectionId]);
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'collection', $2, 'submitted', $3, NULL, $4::jsonb)
    `, [randomBytes(16).toString("hex"), collectionId, session.userId, JSON.stringify({ taskId, boxId: task.box_id, amount, status: "Pending Verification" })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ collectionId, amount, status: "Pending Verification" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Could not save rider collection.", error);
    return Response.json({ error: "The collection could not be saved." }, { status: 503 });
  } finally { client.release(); }
}

export const POST = withApiErrors(handlePOST);
