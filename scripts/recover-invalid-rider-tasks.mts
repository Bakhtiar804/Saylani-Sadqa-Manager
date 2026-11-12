import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd());
if(process.argv.includes('--help')) {
  console.log('Usage: jiti scripts/recover-invalid-rider-tasks.mts TASK-ID [TASK-ID ...] [--apply]\nDefault is a rolled-back dry run. Only unconfirmed, uncounted departure-side-effect records can be recovered; all original rows and amounts remain audited.');
  process.exit(0);
}
const taskIds=process.argv.slice(2).filter(value=>value!=='--apply');
assert.ok(taskIds.length>0&&taskIds.every(id=>/^[A-Za-z0-9-]{1,20}$/.test(id)),'Pass the affected task IDs.');
const apply=process.argv.includes('--apply');
const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
const client=await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT set_config('saylani.workflow_recovery','on',true)");
  let recovered=0;
  for(const taskId of taskIds) {
    const {rows:[task]}=await client.query(`SELECT task.*,rider.team_id FROM rider_tasks task JOIN riders rider USING(rider_id) WHERE task.task_id=$1 FOR UPDATE OF task`,[taskId]);
    assert.ok(task,'Affected task must exist.');
    const prior=(await client.query("SELECT 1 FROM activity_audit_log WHERE entity_type='rider_task' AND entity_id=$1 AND action='workflow_recovered'",[taskId])).rowCount;
    if(prior&&task.task_status==='Assigned')continue;
    assert.equal(task.task_type,'Scheduled Collection');assert.equal(task.task_status,'Completed');
    assert.equal((await client.query('SELECT count(*)::int AS count FROM field_collection_logs WHERE task_id=$1',[taskId])).rows[0].count,0,'Do not undo a recorded cash-count visit.');
    const {rows:collections}=await client.query(`SELECT * FROM collections WHERE box_id=$1 AND rider_id=$2 AND collection_date=$3 AND collection_status<>'Voided' FOR UPDATE`,[task.box_id,task.rider_id,task.task_date]);
    assert.equal(collections.length,1,'Exactly one unconfirmed departure-side-effect record must exist.');
    const collection=collections[0];
    assert.equal(collection.rider_task_id,null);assert.equal(collection.cash_breakdown,null);
    assert.equal(collection.collection_status,'Pending Verification');
    assert.ok(!collection.verified_at&&!collection.verified_by_team_id&&!collection.deposit_amount_pkr&&!collection.deposit_date&&!collection.handover_reference);
    assert.ok(!collection.cash_handover_status||collection.cash_handover_status==='Pending');
    assert.ok(!collection.deposit_status||collection.deposit_status==='Pending');
    const reason='Rider reported only departure was clicked. Completion had no ordered workflow, task-linked denomination count or field visit. System recovery preserves the original cash record as Voided for audit.';
    await client.query(`UPDATE collections SET collection_status='Voided',notes=CONCAT_WS(CHR(10),notes,$2::text) WHERE collection_id=$1`,[collection.collection_id,reason]);
    await client.query(`UPDATE rider_tasks SET task_status='Assigned',workflow_stage='assigned',completion_time=NULL,
      notification_read_at=NULL,notes=CONCAT_WS(CHR(10),notes,$2::text),
      workflow_events=jsonb_build_array(jsonb_build_object('stage','assigned','status','Assigned','event','workflow_recovered','at',CURRENT_TIMESTAMP,'note',$2::text)) WHERE task_id=$1`,[taskId,reason]);
    for(const [entityType,entityId,action,before,after] of [
      ['collection',collection.collection_id,'voided_invalid_workflow',collection,{status:'Voided',reason,performedBy:'authorized_system_recovery'}],
      ['rider_task',taskId,'workflow_recovered',task,{status:'Assigned',stage:'assigned',voidedCollectionId:collection.collection_id,reason,performedBy:'authorized_system_recovery'}],
    ]) await client.query(`INSERT INTO activity_audit_log(audit_id,entity_type,entity_id,action,actor_team_id,before_data,after_data)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,[randomBytes(16).toString('hex'),entityType,entityId,action,task.team_id,JSON.stringify(before),JSON.stringify(after)]);
    recovered++;
  }
  await client.query(apply?'COMMIT':'ROLLBACK');
  console.log(`${apply?'Recovered':'Verified dry run for'} ${recovered} tasks. Original collection rows and amounts preserved; invalid collections ${apply?'marked':'would be marked'} Voided with full before/after audit.`);
} catch(error){await client.query('ROLLBACK');throw error;}
finally{client.release();await pool.end();}
