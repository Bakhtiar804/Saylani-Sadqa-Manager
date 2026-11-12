import 'server-only';
import { getDatabasePool } from './db';
import type { UserSession } from './session';
import type { DataRecord } from './dashboard-types';

export function previousReportingMonth(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(part=>part.type==='year')!.value);const month=Number(parts.find(part=>part.type==='month')!.value);
  return new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7);
}
export async function getRiderDetails(session:UserSession,requestedMonth?:string) {
  const month=requestedMonth && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)?requestedMonth:previousReportingMonth();
  const start=`${month}-01`;const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
  const params=[session.role==='super_admin',session.cityId,session.role==='rider'?session.userId:null,start,end];
  const scope=`(($3::text IS NOT NULL AND person.team_id=$3) OR ($3::text IS NULL AND ($1::boolean OR person.city_id=$2)))`;
  const [profiles,history,boxes,tasks]=await Promise.all([
    getDatabasePool().query(`SELECT rider.rider_id,rider.team_id,person.full_name AS rider_name,person.email,person.phone,
      person.city_id,city.city_name,rider.assigned_zone,rider.employment_status,person.account_status,
      person.created_at::text AS joined_at FROM riders rider
      JOIN team_members person ON person.team_id=rider.team_id
      LEFT JOIN cities city ON city.city_id=person.city_id
      WHERE ${scope} ORDER BY person.full_name`,params.slice(0,3)),
    getDatabasePool().query(`SELECT collection.collection_id,collection.rider_id,TO_CHAR(collection.collection_date,'YYYY-MM-DD') AS collection_date,
      collection.box_id,box.area,box.location_description,collection.collection_amount_pkr::float8 AS amount_pkr,
      collection.cash_handover_status,collection.deposit_status
      FROM collections collection JOIN riders rider USING(rider_id)
      JOIN team_members person ON person.team_id=rider.team_id
      JOIN donation_boxes box ON box.box_id=collection.box_id
      WHERE ${scope} AND ($1::boolean OR collection.city_id=$2) AND collection.collection_date >= $4::date AND collection.collection_date < $5::date
      ORDER BY collection.collection_date DESC,collection.collection_id`,params),
    getDatabasePool().query(`SELECT box.box_id,box.city_id,box.area,box.box_status,box.assigned_rider_id,city.city_name
      FROM donation_boxes box JOIN cities city USING(city_id) WHERE $1::boolean OR box.city_id=$2 ORDER BY box.box_id`,params.slice(0,2)),
    getDatabasePool().query(`SELECT task.task_id,task.rider_id,task.task_status,TO_CHAR(task.task_date,'YYYY-MM-DD') AS task_date,task.box_id,box.city_id,task.task_type
      FROM rider_tasks task JOIN riders rider USING(rider_id)
      JOIN team_members person ON person.team_id=rider.team_id
      JOIN donation_boxes box ON box.box_id=task.box_id
      WHERE ${scope} AND ($1::boolean OR box.city_id=$2) ORDER BY task.task_date DESC`,params.slice(0,3)),
  ]);
  return {month,profiles:profiles.rows as DataRecord[],history:history.rows as DataRecord[],boxes:boxes.rows as DataRecord[],tasks:tasks.rows as DataRecord[]};
}
