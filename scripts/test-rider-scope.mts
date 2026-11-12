import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';
import { getRiderDetails, currentReportingMonth, previousReportingMonth } from '../lib/rider-details';
import { getDatabasePool } from '../lib/db';
import type { UserSession } from '../lib/session';
import { getRiderTaskNotifications, markRiderTaskNotificationsRead } from '../lib/rider-notifications';

nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL!);
url.hostname=url.hostname.replace(/-pooler(?=\.)/,'');url.searchParams.set('sslmode','verify-full');
const owner=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:15000});
const schema=`test_rider_scope_${randomBytes(8).toString('hex')}`;
assert.match(schema,/^test_rider_scope_[0-9a-f]{16}$/);
const fixtureUrl=new URL(url);fixtureUrl.searchParams.set('options',`-c search_path=${schema}`);
process.env.DATABASE_URL=fixtureUrl.toString();
const fixture=getDatabasePool();
const session=(userId:string,cityId:string|null,role:UserSession['role']='rider'):UserSession=>({userId,cityId,role,email:'fixture@example.invalid',name:'Fixture',expiresAt:Math.floor(Date.now()/1000)+600});
const snapshot=async()=>(await owner.query(`SELECT
  (SELECT count(*) FROM public.team_members)::text AS accounts,
  (SELECT count(*) FROM public.collections)::text AS collections,
  (SELECT sum(collection_amount_pkr) FROM public.collections)::text AS amount`)).rows;
const before=await snapshot();let created=false;
try {
  await owner.query(`CREATE SCHEMA ${schema}`);created=true;
  await fixture.query(await fs.readFile('database/schema.sql','utf8'));
  await fixture.query(`BEGIN; SET LOCAL saylani.workflow_recovery='on'; INSERT INTO cities VALUES('C1','Fixture City One','Fixture Province'),('C2','Fixture City Two','Fixture Province');
    INSERT INTO roles VALUES(1,'rider','Rider'),(2,'admin','City Admin'),(3,'city_manager','Branch Admin');
    INSERT INTO team_members(team_id,full_name,email,city_id,role_id,identity_type,password_hash) VALUES
      ('TEM-001','Rider One','one@example.invalid','C1',1,'login_account','fixture-only'),
      ('TEM-002','Rider Two','two@example.invalid','C1',1,'login_account','fixture-only'),
      ('TEM-003','Rider Three','three@example.invalid','C2',1,'login_account','fixture-only'),
      ('ADMIN','City Admin','admin@example.invalid','C1',2,'login_account','fixture-only'),
      ('MANAGER','Branch Admin','manager@example.invalid','C1',3,'login_account','fixture-only');
    INSERT INTO branches(branch_id,city_id,branch_name) VALUES('BR1','C1','Branch One'),('BR2','C1','Branch Two');
    UPDATE team_members SET branch_id='BR1' WHERE team_id IN ('MANAGER','TEM-001');
    UPDATE team_members SET branch_id='BR2' WHERE team_id='TEM-002';
    INSERT INTO team_member_branch_assignments(team_id,city_id,branch_id) VALUES('MANAGER','C1','BR1'),('TEM-001','C1','BR1'),('TEM-002','C1','BR2');
    INSERT INTO riders VALUES('R1','TEM-001','Active','Zone One'),('R2','TEM-002','Active','Zone Two'),('R3','TEM-003','Active','Zone Three');
    INSERT INTO donation_boxes(box_id,qr_code,city_id,area,location_type,location_description,assigned_rider_id,installation_date,box_status,security_level) VALUES
      ('B1','QR1','C1','Area One','Shop','Fixture street','R1','2026-01-01','Active','Standard'),
      ('B2','QR2','C1','Area Two','Shop','Fixture street','R2','2026-01-01','Active','Standard'),
      ('B3','QR3','C2','Area Three','Shop','Fixture street','R3','2026-01-01','Active','Standard'),
      ('B4','QR4','C1','Unassigned Area','Shop','Fixture street',NULL,'2026-01-01','Active','Standard'),
      ('B5','QR5','C2','Previous City Area','Shop','Fixture street','R1','2026-01-01','Active','Standard');
    INSERT INTO branch_box_assignments(box_id,city_id,branch_id) VALUES('B1','C1','BR1'),('B2','C1','BR2'),('B4','C1','BR1');
    INSERT INTO rider_tasks(task_id,rider_id,box_id,task_date,task_type,task_status) VALUES
      ('T1','R1','B1','2026-11-05','Scheduled Collection','Assigned'),
      ('T2','R2','B2','2026-11-05','Scheduled Collection','Assigned'),
      ('T3','R3','B3','2026-11-05','Scheduled Collection','Assigned'),
      ('T4','R1','B5','2026-11-05','Scheduled Collection','Completed');
    INSERT INTO collections(collection_id,box_id,rider_id,city_id,collection_date,collection_amount_pkr,collection_status,recorded_by_team_id) VALUES
      ('COL1','B1','R1','C1','2026-11-05',100,'Pending Verification','TEM-001'),
      ('COL2','B2','R2','C1','2026-11-05',200,'Pending Verification','TEM-002'),
      ('COL3','B3','R3','C2','2026-11-05',300,'Pending Verification','TEM-003'),
      ('COL4','B5','R1','C2','2026-11-05',50,'Pending Verification','TEM-001'),
      ('COL5','B1','R1','C1','2026-10-05',40,'Pending Verification','TEM-001'),
      ('COL-VOID','B1','R1','C1','2026-11-05',9999,'Voided','TEM-001'); COMMIT;`);
  for(const [teamId,riderId,cityId,historyIds,boxIds] of [
    ['TEM-001','R1','C1',['COL1','COL4'],['B1','B5']],
    ['TEM-002','R2','C1',['COL2'],['B2']],
    ['TEM-003','R3','C2',['COL3'],['B3']],
  ] as const) {
    const data=await getRiderDetails(session(teamId,cityId),'2026-11');
    assert.deepEqual(data.profiles.map(row=>row.team_id),[teamId]);
    assert.deepEqual(data.history.map(row=>row.collection_id).sort(),[...historyIds]);
    assert.deepEqual(data.boxes.map(row=>row.box_id).sort(),[...boxIds]);
    assert.ok(data.tasks.length>0&&data.tasks.every(row=>row.rider_id===riderId));
    assert.ok(data.history.every(row=>row.rider_id===riderId));
  }
  const previous=await getRiderDetails(session('TEM-001','C1'),'2026-10');
  assert.deepEqual(previous.history.map(row=>row.collection_id),['COL5']);
  const now=new Date('2026-11-12T10:00:00Z');
  for(const role of ['super_admin','admin','city_manager','rider'] as const) {
    const recent=await getRiderDetails(session(role==='city_manager'?'MANAGER':'TEM-001','C1',role),undefined,now);
    assert.equal(recent.month,'2026-11');assert.equal(recent.currentMonth,'2026-11');assert.ok(recent.history.length>0);
  }
  const explicitPrevious=await getRiderDetails(session('TEM-001','C1'),'2026-10',now);
  assert.equal(explicitPrevious.month,'2026-10');assert.equal(explicitPrevious.history.length,1);
  assert.equal((await getRiderDetails(session('TEM-001','C1'),'2026-13',now)).month,'2026-11');
  assert.equal(currentReportingMonth(new Date('2026-10-31T20:00:00Z')),'2026-11');
  assert.equal(currentReportingMonth(new Date('2026-10-31T18:59:00Z')),'2026-10');
  assert.equal(previousReportingMonth(new Date('2026-01-01T12:00:00Z')),'2025-12');
  console.log('PASS current-month defaults for all roles, explicit older month, invalid month fallback and Karachi month/year boundaries.');
  for(const userId of ['UNKNOWN','',null]) {
    const empty=await getRiderDetails(session(userId as unknown as string,'C1'),'2026-11');
    assert.ok(Object.values(empty).filter(Array.isArray).every(rows=>rows.length===0),'Missing identity must never fall back to city-wide access');
  }
  const changedCity=await getRiderDetails(session('TEM-001','C2'),'2026-11');
  assert.deepEqual(changedCity.history.map(row=>row.collection_id).sort(),['COL1','COL4']);
  for(const role of ['admin'] as const) {
    const admin=await getRiderDetails(session('ADMIN','C1',role),'2026-11');
    assert.equal(admin.profiles.length,2);assert.deepEqual(admin.history.map(row=>row.collection_id).sort(),['COL1','COL2']);
    assert.ok(admin.boxes.every(row=>row.city_id==='C1'));
    assert.ok(admin.tasks.every(row=>row.city_id==='C1'));
  }
  const manager=await getRiderDetails(session('MANAGER','C1','city_manager'),'2026-11');
  assert.deepEqual(manager.profiles.map(row=>row.team_id),['TEM-001']);
  assert.deepEqual(manager.history.map(row=>row.collection_id),['COL1']);
  assert.equal(manager.history[0].collection_status,'Pending Verification');
  assert.deepEqual(manager.boxes.map(row=>row.box_id),['B1','B4']);
  assert.deepEqual(manager.tasks.map(row=>row.task_id),['T1']);
  for(const managerId of ['UNASSIGNED-MANAGER','TEM-001']) {
    const unavailable=await getRiderDetails(session(managerId,'C1','city_manager'),'2026-11');
    assert.ok(Object.values(unavailable).filter(Array.isArray).every(rows=>rows.length===0));
  }
  console.log('PASS active-branch Rider/box/history/task isolation, verification fields and denied unassigned managers.');
  const network=await getRiderDetails(session('SUPER',null,'super_admin'),'2026-11');
  assert.equal(network.profiles.length,3);assert.equal(network.history.length,4);assert.equal(network.boxes.length,5);
  const notifications=await getRiderTaskNotifications('TEM-001');
  assert.deepEqual(notifications.notifications.map(row=>row.taskId),['T1']);assert.equal(notifications.unreadCount,1);
  assert.equal(await markRiderTaskNotificationsRead('TEM-001',['T1','T2']),false,'Mixed-owner updates must roll back completely');
  assert.equal((await getRiderTaskNotifications('TEM-001')).unreadCount,1);
  assert.equal(await markRiderTaskNotificationsRead('TEM-001',['T2']),false);
  assert.equal((await getRiderTaskNotifications('TEM-002')).unreadCount,1);
  assert.equal(await markRiderTaskNotificationsRead('TEM-001',['T1']),true);
  assert.equal((await getRiderTaskNotifications('TEM-001')).unreadCount,0);
  assert.equal(await markRiderTaskNotificationsRead('TEM-001',['T1']),true,'Reading again must be idempotent');
  await fixture.query("INSERT INTO rider_tasks(task_id,rider_id,box_id,task_date,task_type,task_status) VALUES('T5','R1','B1','2026-11-06','Scheduled Collection','Assigned')");
  const newFeed=await getRiderTaskNotifications('TEM-001');assert.equal(newFeed.unreadCount,1);assert.equal(newFeed.notifications[0].taskId,'T5');
  assert.equal((await fixture.query("SELECT task_status FROM rider_tasks WHERE task_id='T1'")).rows[0].task_status,'Assigned','Reading notifications must never change task progress');
  await assert.rejects(fixture.query("UPDATE rider_tasks SET task_status='Completed',workflow_stage='completed' WHERE task_id='T1'"),{code:'23514'});
  await assert.rejects(fixture.query("UPDATE rider_tasks SET workflow_stage='counting' WHERE task_id='T1'"),{code:'23514'});
  await assert.rejects(fixture.query(`INSERT INTO collections(collection_id,box_id,rider_id,city_id,collection_date,collection_amount_pkr,collection_status,recorded_by_team_id)
    VALUES('BAD-CASH','B1','R1','C1','2026-11-12',6000,'Pending Verification','TEM-001')`),{code:'23514'});
  for(const stage of ['departed','arrived','counting']) {
    await fixture.query("UPDATE rider_tasks SET task_status='In Progress',workflow_stage=$1 WHERE task_id='T1'",[stage]);
    const state=(await fixture.query("SELECT task_status,workflow_stage,completion_time FROM rider_tasks WHERE task_id='T1'")).rows[0];
    assert.equal(state.task_status,'In Progress');assert.equal(state.workflow_stage,stage);assert.equal(state.completion_time,null);
    assert.equal((await fixture.query("SELECT count(*)::int AS count FROM collections WHERE rider_task_id='T1'")).rows[0].count,0);
  }
  await fixture.query(`INSERT INTO collections(collection_id,box_id,rider_id,city_id,collection_date,collection_amount_pkr,collection_status,recorded_by_team_id,rider_task_id,cash_breakdown)
    VALUES('VALID-CASH','B1','R1','C1','2026-11-12',100,'Pending Verification','TEM-001','T1','{"note_100":1}')`);
  await assert.rejects(fixture.query("UPDATE rider_tasks SET task_status='Completed',workflow_stage='submitted' WHERE task_id='T1'"),{code:'23514'});
  await fixture.query(`INSERT INTO field_collection_logs(field_collection_id,collection_date,box_id,city_id,rider_id,task_id,total_cash_counted_pkr)
    VALUES('VALID-VISIT','2026-11-12','B1','C1','R1','T1',100)`);
  await fixture.query("UPDATE rider_tasks SET task_status='Completed',workflow_stage='submitted' WHERE task_id='T1'");
  await assert.rejects(fixture.query("UPDATE rider_tasks SET task_status='Assigned',workflow_stage='assigned' WHERE task_id='T1'"),{code:'23514'});
  console.log('PASS database guards: notifications and departure cannot complete tasks; skipped steps/raw cash/incomplete completion rejected; counted collection and field visit required.');
  console.log('PASS private task notifications, persisted/idempotent reads, mixed-owner rollback and unread badge for newly assigned tasks.');
  console.log('PASS isolated Rider privacy: same-city and cross-city isolation, TEM IDs, own historical records, assigned boxes, tasks, month filters, missing identities and preserved admin scopes.');
} finally {
  await fixture.end();
  if(created){assert.match(schema,/^test_rider_scope_[0-9a-f]{16}$/);await owner.query(`DROP SCHEMA ${schema} CASCADE`);}
  assert.deepEqual(await snapshot(),before,'Live records must not change');await owner.end();
}
