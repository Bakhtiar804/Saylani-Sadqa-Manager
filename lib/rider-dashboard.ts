import "server-only";

import { redirect } from "next/navigation";
import { getDatabasePool } from "@/lib/db";
import { getOperationsSession } from "@/lib/operations-auth";
import type { DataRecord } from "@/lib/dashboard-types";

type RiderProfile = {
  rider_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city_id: string | null;
  city_name: string | null;
  assigned_zone: string;
  employment_status: string;
};

const taskAssignmentJoin = `
  LEFT JOIN LATERAL (
    SELECT audit.actor_user_id, audit.occurred_at AS assigned_at
    FROM activity_audit_log audit
    WHERE audit.entity_type = 'rider_task' AND audit.entity_id = task.task_id AND audit.action = 'assigned'
    ORDER BY audit.occurred_at DESC, audit.audit_id DESC
    LIMIT 1
  ) assignment ON true
  LEFT JOIN users assigner ON assigner.user_id = assignment.actor_user_id
`;

export async function getRiderTaskNotifications(userId: string) {
  const { rows } = await getDatabasePool().query<{
    task_id: string; task_type: string; task_date: string; box_id: string;
    assigned_by_name: string | null; total: number;
  }>(`
    SELECT task.task_id, task.task_type, task.task_date::text AS task_date, task.box_id,
      assigner.full_name AS assigned_by_name, COUNT(*) OVER ()::int AS total
    FROM rider_tasks task
    JOIN riders rider ON rider.rider_id = task.rider_id
    ${taskAssignmentJoin}
    WHERE rider.user_id = $1 AND task.task_status = 'Assigned'
    ORDER BY assignment.assigned_at DESC NULLS LAST, task.task_date DESC, task.task_id DESC
    LIMIT 10
  `, [userId]);
  return { count: rows[0]?.total ?? 0, tasks: rows };
}

function normalizeRows(rows: Record<string, unknown>[]): DataRecord[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (value instanceof Date) return [key, value.toISOString()];
    if (typeof value === "string" && key.endsWith("_pkr")) return [key, Number(value)];
    return [key, value as DataRecord[string]];
  })));
}

export async function getRiderSession() {
  const session = await getOperationsSession();
  if (!session) redirect("/sign-in");
  if (session.role !== "rider") redirect("/dashboard");
  return session;
}

export async function getRiderDashboard(userId: string) {
  const pool = getDatabasePool();
  const profileResult = await pool.query<RiderProfile>(`
    SELECT rider.rider_id, user_record.user_id, user_record.full_name,
      user_record.email, user_record.phone, user_record.city_id, city.city_name,
      rider.assigned_zone, rider.employment_status
    FROM riders rider
    JOIN users user_record ON user_record.user_id = rider.user_id
    LEFT JOIN cities city ON city.city_id = user_record.city_id
    WHERE rider.user_id = $1
    LIMIT 1
  `, [userId]);
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const [taskResult, collectionResult, fieldLogResult, summaryResult] = await Promise.all([
    pool.query(`
      SELECT task.task_id, task.task_date::text AS task_date, task.task_type, task.task_status,
        task.completion_time, task.notes, box.box_id, box.qr_code, box.area,
        box.location_type, box.location_description, box.box_status,
        city.city_name, partner.partner_name, assignment.assigned_at,
        assigner.full_name AS assigned_by_name
      FROM rider_tasks task
      JOIN donation_boxes box ON box.box_id = task.box_id
      JOIN cities city ON city.city_id = box.city_id
      LEFT JOIN partners partner ON partner.partner_id = box.partner_id
      ${taskAssignmentJoin}
      WHERE task.rider_id = $1
      ORDER BY task.task_date DESC, task.task_id
    `, [profile.rider_id]),
    pool.query(`
      SELECT collection_id, collection_date::text AS collection_date, collection_time, box_id,
        collection_amount_pkr, collection_status, cash_handover_status,
        deposit_status, discrepancy_amount_pkr, notes
      FROM collections
      WHERE rider_id = $1
      ORDER BY collection_date DESC, collection_id DESC
      LIMIT 100
    `, [profile.rider_id]),
    pool.query(`
      SELECT field_collection_id, collection_date::text AS collection_date, collection_time, box_id,
        area, location_type, total_cash_counted_pkr, collection_status,
        cash_handover_status, deposit_status, discrepancy_amount_pkr, remarks
      FROM field_collection_logs
      WHERE rider_id = $1
      ORDER BY collection_date DESC, field_collection_id DESC
      LIMIT 100
    `, [profile.rider_id]),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM rider_tasks WHERE rider_id = $1) AS task_count,
        (SELECT COUNT(*)::int FROM rider_tasks WHERE rider_id = $1 AND task_status = 'Completed') AS completed_tasks,
        (SELECT COUNT(*)::int FROM rider_tasks WHERE rider_id = $1 AND task_status IN ('Assigned', 'In Progress')) AS open_tasks,
        (SELECT COUNT(*)::int FROM donation_boxes WHERE assigned_rider_id = $1 AND box_status = 'Active') AS active_boxes,
        (SELECT COUNT(*)::int FROM collections WHERE rider_id = $1) AS collection_count,
        (SELECT COALESCE(SUM(collection_amount_pkr), 0) FROM collections WHERE rider_id = $1 AND collection_status = 'Verified') AS verified_total
    `, [profile.rider_id]),
  ]);
  const summary = summaryResult.rows[0] ?? {};
  return {
    profile,
    tasks: normalizeRows(taskResult.rows),
    collections: normalizeRows(collectionResult.rows),
    fieldLogs: normalizeRows(fieldLogResult.rows),
    summary: {
      taskCount: Number(summary.task_count || 0),
      completedTasks: Number(summary.completed_tasks || 0),
      openTasks: Number(summary.open_tasks || 0),
      activeBoxes: Number(summary.active_boxes || 0),
      collectionCount: Number(summary.collection_count || 0),
      verifiedTotal: Number(summary.verified_total || 0),
    },
  };
}
