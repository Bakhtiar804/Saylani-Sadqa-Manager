import 'server-only';
import { getDatabasePool } from './db';
import { getActiveTeamBranch } from './city-branches';
import type { UserSession } from './session';
import type { DataRecord } from './dashboard-types';

export function currentReportingMonth(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(part=>part.type==='year')!.value);const month=Number(parts.find(part=>part.type==='month')!.value);
  return `${year}-${String(month).padStart(2,'0')}`;
}
<<<<<<< HEAD
export function previousReportingMonth(now=new Date()) {
  const current=currentReportingMonth(now);
  return new Date(Date.UTC(Number(current.slice(0,4)),Number(current.slice(5,7))-2,1)).toISOString().slice(0,7);
}
export async function getRiderDetails(session:UserSession,requestedMonth?:string,now=new Date()) {
  const currentMonth=currentReportingMonth(now);
  const month=requestedMonth && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)?requestedMonth:currentMonth;
  const start=`${month}-01`;const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const ownProfile=session.role==='rider';
  // Rider scope is always the authenticated account, never a requested rider/city ID.
  // Separate predicates prevent an absent Rider identity from falling back to city access.
  const scope=ownProfile?'person.team_id=$1::text':'($1::boolean OR person.city_id=$2::text)';
  const scopeParams=ownProfile?[session.userId]:[session.role==='super_admin',session.cityId];
  const historyParams=[...scopeParams,start,end];
  const collectionCity=ownProfile?'':'AND ($1::boolean OR collection.city_id=$2::text)';
  const taskCity=ownProfile?'':'AND ($1::boolean OR box.city_id=$2::text)';
  const boxScope=ownProfile
    ? 'EXISTS (SELECT 1 FROM riders owner WHERE owner.rider_id=box.assigned_rider_id AND owner.team_id=$1::text)'
    : '($1::boolean OR box.city_id=$2::text)';
=======

export function currentReportingMonth(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit'}).formatToParts(now);
  return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;
}

export async function getRiderDetails(session:UserSession,requestedMonth?:string) {
  const month=requestedMonth && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)?requestedMonth:currentReportingMonth();
  const start=`${month}-01`;const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const branch=session.role==='city_manager'&&session.cityId?await getActiveTeamBranch(session.userId,session.cityId):null;
  if(session.role==='city_manager'&&!branch)return {month,profiles:[],history:[],boxes:[],tasks:[]};

  const personJoin = session.role === 'city_manager'
    ? 'LEFT JOIN team_member_branch_assignments branch_assignment ON branch_assignment.team_id=person.team_id'
    : '';
  const personScope = session.role === 'super_admin'
    ? 'TRUE'
    : session.role === 'rider'
      ? 'person.team_id=$1'
      : session.role === 'city_manager'
        ? 'person.city_id=$1 AND COALESCE(person.branch_id,branch_assignment.branch_id)=$2'
        : 'person.city_id=$1';
  const personParams = session.role === 'city_manager'
    ? [session.cityId,branch!.branchId]
    : session.role === 'rider'
      ? [session.userId]
      : session.role === 'super_admin'
        ? []
        : [session.cityId];
  const boxScope=session.role==='super_admin'?'TRUE':session.role==='rider'?'box.assigned_rider_id=(SELECT rider_id FROM riders WHERE team_id=$1)':session.role==='city_manager'?'box.city_id=$1 AND box_assignment.branch_id=$2':'box.city_id=$1';
>>>>>>> origin/usmanwork
  const pool=getDatabasePool();
  const [profiles,history,boxes,tasks]=await Promise.all([
    pool.query(`SELECT rider.rider_id,rider.team_id,person.full_name AS rider_name,person.email,person.phone,
      person.city_id,city.city_name,rider.assigned_zone,rider.employment_status,person.account_status,
<<<<<<< HEAD
      person.created_at::text AS joined_at FROM riders rider
      JOIN team_members person ON person.team_id=rider.team_id
      LEFT JOIN cities city ON city.city_id=person.city_id
      WHERE ${scope} ORDER BY person.full_name`,scopeParams),
=======
      person.created_at::text AS joined_at FROM riders rider JOIN team_members person USING(team_id)
      ${personJoin} LEFT JOIN cities city ON city.city_id=person.city_id
      WHERE ${personScope} ORDER BY person.full_name`,personParams),
>>>>>>> origin/usmanwork
    pool.query(`SELECT collection.collection_id,collection.rider_id,TO_CHAR(collection.collection_date,'YYYY-MM-DD') AS collection_date,
      collection.box_id,box.area,box.location_description,collection.collection_amount_pkr::float8 AS amount_pkr,
      collection.collection_status,collection.verified_by_team_id,verifier.full_name AS verified_by_name,
      TO_CHAR(collection.verified_at AT TIME ZONE 'Asia/Karachi','YYYY-MM-DD HH24:MI') AS verified_at,
      collection.cash_handover_status,collection.deposit_status
<<<<<<< HEAD
      FROM collections collection JOIN riders rider USING(rider_id)
      JOIN team_members person ON person.team_id=rider.team_id
      JOIN donation_boxes box ON box.box_id=collection.box_id
      WHERE ${scope} ${collectionCity} AND collection.collection_status<>'Voided' AND collection.collection_date >= $${scopeParams.length+1}::date AND collection.collection_date < $${scopeParams.length+2}::date
      ORDER BY collection.collection_date DESC,collection.collection_id`,historyParams),
    pool.query(`SELECT box.box_id,box.city_id,box.area,box.box_status,box.assigned_rider_id,city.city_name
      FROM donation_boxes box JOIN cities city USING(city_id) WHERE ${boxScope} ORDER BY box.box_id`,scopeParams),
    pool.query(`SELECT task.task_id,task.rider_id,task.task_status,TO_CHAR(task.task_date,'YYYY-MM-DD') AS task_date,task.box_id,box.city_id,task.task_type
      FROM rider_tasks task JOIN riders rider USING(rider_id)
      JOIN team_members person ON person.team_id=rider.team_id
      JOIN donation_boxes box ON box.box_id=task.box_id
      WHERE ${scope} ${taskCity} ORDER BY task.task_date DESC`,scopeParams),
=======
      FROM collections collection JOIN riders rider USING(rider_id) JOIN team_members person USING(team_id)
      LEFT JOIN team_members verifier ON verifier.team_id=collection.verified_by_team_id
      ${personJoin} JOIN donation_boxes box ON box.box_id=collection.box_id
      LEFT JOIN branch_box_assignments box_assignment ON box_assignment.box_id=box.box_id
      WHERE ${personScope} AND (${session.role==='city_manager'?'box_assignment.branch_id=$2':'TRUE'})
        AND collection.collection_date >= $${personParams.length+1}::date AND collection.collection_date < $${personParams.length+2}::date
      ORDER BY collection.collection_date DESC,collection.collection_id`,[...personParams,start,end]),
    pool.query(`SELECT box.box_id,box.city_id,box.area,box.box_status,box.assigned_rider_id,city.city_name
      FROM donation_boxes box JOIN cities city USING(city_id)
      LEFT JOIN branch_box_assignments box_assignment ON box_assignment.box_id=box.box_id
      WHERE ${boxScope} ORDER BY box.box_id`,personParams),
    pool.query(`SELECT task.task_id,task.rider_id,person.full_name AS rider_name,task.task_status,
      TO_CHAR(task.task_date,'YYYY-MM-DD') AS task_date,task.box_id,box.city_id,task.task_type,
      task.workflow_stage,task.completion_time,
      TO_CHAR(task.completed_at AT TIME ZONE 'Asia/Karachi','YYYY-MM-DD HH24:MI') AS completed_at,
      task.notes,submitted_collection.collection_id,submitted_collection.collection_amount_pkr::float8 AS collected_amount_pkr,
      submitted_collection.collection_status
      FROM rider_tasks task JOIN riders rider USING(rider_id) JOIN team_members person USING(team_id)
      ${personJoin} JOIN donation_boxes box ON box.box_id=task.box_id
      LEFT JOIN LATERAL (
        SELECT submission.collection_id FROM (
          SELECT event.value->>'collection_id' AS collection_id,(event.value->>'at')::timestamptz AS submitted_at
          FROM jsonb_array_elements(COALESCE(task.workflow_events,'[]'::jsonb)) event(value)
          WHERE event.value->>'event'='collection_submitted'
          UNION ALL
          SELECT audit.entity_id AS collection_id,audit.occurred_at AS submitted_at
          FROM activity_audit_log audit
          WHERE audit.entity_type='collection' AND audit.after_data->>'taskId'=task.task_id
        ) submission ORDER BY submission.submitted_at DESC NULLS LAST LIMIT 1
      ) task_submission ON TRUE
      LEFT JOIN collections submitted_collection ON submitted_collection.collection_id=task_submission.collection_id
      LEFT JOIN branch_box_assignments box_assignment ON box_assignment.box_id=box.box_id
      WHERE ${personScope} AND (${session.role==='city_manager'?'box_assignment.branch_id=$2':'TRUE'})
      ORDER BY task.task_date DESC,task.task_id`,personParams),
>>>>>>> origin/usmanwork
  ]);
  return {month,currentMonth,profiles:profiles.rows as DataRecord[],history:history.rows as DataRecord[],boxes:boxes.rows as DataRecord[],tasks:tasks.rows as DataRecord[]};
}
