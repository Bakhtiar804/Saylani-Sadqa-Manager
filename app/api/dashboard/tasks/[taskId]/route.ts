import { withApiErrors } from '@/lib/api-errors';
import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession, hasValidRequestOrigin } from "@/lib/operations-auth";
import { canAdvanceCollection, getCollectionStage } from '@/lib/rider-workflow';

const taskStatuses = ["In Progress", "Skipped", "Completed"] as const;

async function handlePATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const session = await getOperationsSession();
  if (!session) return Response.json({ error: "Sign in to update a task." }, { status: 401 });
  if (session.role !== "rider") return Response.json({ error: "Only the assigned rider can update this task." }, { status: 403 });
  if (!hasValidRequestOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { taskId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Provide a task status." }, { status: 400 }); }
  if (typeof body !== "object" || body === null || (!("stage" in body) && !("status" in body)) || ('status' in body && !taskStatuses.includes(body.status as typeof taskStatuses[number]))) {
    return Response.json({ error: "Choose In Progress, Skipped, or Completed." }, { status: 400 });
  }
  const notes = "notes" in body && typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";

  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
<<<<<<< HEAD
    const result = await client.query<{ task_id: string; task_status: string;task_type:string;workflow_stage:string }>(`
      SELECT task.task_id, task.task_status,task.task_type,task.workflow_stage FROM rider_tasks task
=======
    const result = await client.query<{ task_id: string; task_status: string; task_type: string; workflow_stage: string }>(`
      SELECT task.task_id, task.task_status, task.task_type, task.workflow_stage FROM rider_tasks task
>>>>>>> origin/usmanwork
      JOIN riders rider ON rider.rider_id = task.rider_id
      WHERE task.task_id = $1 AND rider.team_id = $2 AND rider.employment_status='Active' FOR UPDATE OF task
    `, [taskId, session.userId]);
    const current = result.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task is not assigned to your account." }, { status: 404 });
    }
    if (['Completed','Cancelled'].includes(current.task_status)) {
      await client.query("ROLLBACK");
      revalidateTag('dashboard-db-records',{expire:0});
      return Response.json({ error: "This task is already closed. Its latest status is now shown.",status:current.task_status,stage:getCollectionStage(current.task_status,current.workflow_stage) }, { status: 409 });
    }
    current.workflow_stage=getCollectionStage(current.task_status,current.workflow_stage);
    const status = ('status' in body ? body.status : 'In Progress') as typeof taskStatuses[number];
    const stage = 'stage' in body ? body.stage : undefined;
    let nextStage = current.workflow_stage;
    if (stage !== undefined || (status === 'In Progress' && current.task_type === 'Scheduled Collection')) {
      const resuming = current.task_status === 'Skipped' && stage === undefined;
      const target = stage ?? (resuming ? current.workflow_stage : current.workflow_stage === 'assigned' ? 'departed' : current.workflow_stage);
      if (status !== 'In Progress' || (current.task_status === 'Skipped' && !resuming) || (!resuming && !canAdvanceCollection(current.workflow_stage, String(target)))) {
        await client.query('ROLLBACK');
        revalidateTag('dashboard-db-records',{expire:0});
        return Response.json({error:'Task progress has changed. Its latest step is now shown.',status:current.task_status,stage:current.workflow_stage},{status:409});
      }
      nextStage = String(target);
    }
    if (status === 'Skipped' && !notes) {
      await client.query('ROLLBACK');
      return Response.json({error:'Add a reason before skipping this task.'},{status:400});
    }
<<<<<<< HEAD
=======
    const status = body.status as typeof taskStatuses[number];
    if (status === current.task_status) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This task already has that status." }, { status: 409 });
    }
    if (current.task_status === 'Skipped' && status !== 'In Progress') {
      await client.query("ROLLBACK");
      return Response.json({ error: "Resume a skipped task before changing its status." }, { status: 409 });
    }
>>>>>>> origin/usmanwork
    if(status==='Completed' && (current.task_type==='Scheduled Collection' || current.task_status==='Skipped')) {
      await client.query('ROLLBACK');
      return Response.json({error:'Collection tasks require a cash submission. Resume skipped tasks before completing them.'},{status:409});
    }
<<<<<<< HEAD
    await client.query(`UPDATE rider_tasks SET task_status = $2::text, notes = CASE WHEN $3::text = '' THEN notes ELSE CONCAT_WS(CHR(10), notes, 'Rider update: ' || $3::text) END, completion_time = CASE WHEN $2::text = 'Completed' THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time ELSE NULL END WHERE task_id = $1`, [taskId, status, notes]);
    await client.query(`UPDATE rider_tasks SET workflow_stage=$2::text, workflow_events=workflow_events || jsonb_build_array(jsonb_build_object('stage',$2::text,'status',$3::text,'at',CURRENT_TIMESTAMP,'note',$4::text)) WHERE task_id=$1`,[taskId,nextStage,status,notes]);
=======
    const stage = status === 'In Progress' ? 'in_progress' : status.toLowerCase();
    await client.query(`UPDATE rider_tasks SET
      task_status = $2::text,
      workflow_stage = $3,
      workflow_events = COALESCE(workflow_events, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'event', 'status_changed', 'from', $4::text, 'to', $2::text, 'actor_team_id', $5::text, 'notes', NULLIF($6::text, ''), 'at', CURRENT_TIMESTAMP
      )),
      notes = CASE WHEN $6::text = '' THEN notes ELSE CONCAT_WS(CHR(10), notes, 'Rider update: ' || $6::text) END,
      completed_at = CASE WHEN $2::text = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
      completion_time = CASE WHEN $2::text = 'Completed' THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::time ELSE NULL END
      WHERE task_id = $1`, [taskId, status, stage, current.task_status, session.userId, notes]);
>>>>>>> origin/usmanwork
    await client.query(`
      INSERT INTO activity_audit_log (audit_id, entity_type, entity_id, action, actor_team_id, before_data, after_data)
      VALUES ($1, 'rider_task', $2, 'status_updated', $3, $4::jsonb, $5::jsonb)
    `, [randomBytes(16).toString("hex"), taskId, session.userId, JSON.stringify({ status: current.task_status, stage: current.workflow_stage }), JSON.stringify({ status, stage: nextStage, notes })]);
    await client.query("COMMIT");
    revalidateTag("dashboard-db-records", { expire: 0 });
    return Response.json({ taskId, status, stage: nextStage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if(error && typeof error==='object' && 'code' in error && error.code==='23514') {
      return Response.json({error:'The task update was blocked because a collection step was skipped. Refresh the task and continue in order.'},{status:409});
    }
    console.error("Could not update rider task.", error);
    return Response.json({ error: "The task could not be updated." }, { status: 503 });
  } finally { client.release(); }
}

export const PATCH = withApiErrors(handlePATCH);
