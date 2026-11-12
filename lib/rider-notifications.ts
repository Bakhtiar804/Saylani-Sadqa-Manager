import 'server-only';
import { getDatabasePool } from './db';
import type { RiderTaskNotificationFeed, RiderTaskNotification } from './rider-notification-types';

export async function getRiderTaskNotifications(teamId: string): Promise<RiderTaskNotificationFeed> {
  const { rows } = await getDatabasePool().query<RiderTaskNotification & {unread_count: number}>(`
    SELECT task.task_id AS "taskId",task.task_type AS "taskType",
      TO_CHAR(task.task_date,'YYYY-MM-DD') AS "taskDate",task.box_id AS "boxId",box.area,
      (task.notification_read_at IS NOT NULL) AS read,
      COUNT(*) FILTER (WHERE task.notification_read_at IS NULL) OVER ()::int AS unread_count
    FROM rider_tasks task JOIN riders rider USING(rider_id)
    JOIN donation_boxes box USING(box_id)
    WHERE rider.team_id=$1 AND task.task_status IN ('Assigned','In Progress','Skipped')
    ORDER BY task.notification_read_at NULLS FIRST,task.notification_created_at DESC NULLS LAST,task.task_date DESC,task.task_id DESC
    LIMIT 50`,[teamId]);
  return {notifications:rows.map(row=>({taskId:row.taskId,taskType:row.taskType,taskDate:row.taskDate,boxId:row.boxId,area:row.area,read:row.read})),unreadCount:rows[0]?.unread_count??0};
}

export async function markRiderTaskNotificationsRead(teamId: string, taskIds: string[]): Promise<boolean> {
  const client=await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    const owned=await client.query(`SELECT task.task_id FROM rider_tasks task JOIN riders rider USING(rider_id)
      WHERE rider.team_id=$1 AND task.task_id=ANY($2::text[]) FOR UPDATE OF task`,[teamId,taskIds]);
    if(owned.rowCount!==taskIds.length){await client.query('ROLLBACK');return false;}
    await client.query(`UPDATE rider_tasks SET notification_read_at=COALESCE(notification_read_at,CURRENT_TIMESTAMP) WHERE task_id=ANY($1::text[])`,[taskIds]);
    await client.query('COMMIT');return true;
  } catch(error){await client.query('ROLLBACK').catch(()=>undefined);throw error;}
  finally{client.release();}
}
