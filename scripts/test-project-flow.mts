import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn,type ChildProcess } from 'node:child_process';
import {createServer} from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import nextEnv from '@next/env';
import pg from 'pg';
import { scrypt as scryptCallback } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd());
const accountsOnly=process.argv.includes('--accounts-only');
const tasksOnly=process.argv.includes('--tasks-only');
const workbook=process.argv.slice(2).find(value=>!['--accounts-only','--tasks-only'].includes(value));assert.ok(accountsOnly||tasksOnly||workbook,'Pass the source workbook path');
const source=new URL(process.env.DATABASE_URL!);source.hostname=source.hostname.replace(/-pooler(?=\.)/,'');source.searchParams.set('sslmode','verify-full');
const schema=`test_flow_${randomBytes(8).toString('hex')}`;assert.match(schema,/^test_flow_[0-9a-f]{16}$/);
const owner=new pg.Pool({connectionString:source.toString(),max:1,connectionTimeoutMillis:10000});
const fixtureUrl=new URL(source);fixtureUrl.searchParams.set('options',`-c search_path=${schema}`);
const fixtures=new pg.Pool({connectionString:fixtureUrl.toString(),max:2,connectionTimeoutMillis:10000});
const password=`Flow-${randomBytes(12).toString('hex')}-Aa1!`;
const fixtureSecret=randomBytes(48).toString('hex');
const base='http://127.0.0.1:3117';let server:ChildProcess|undefined;let created=false;let checks=0;
let serverLog='';
type Session={cookie:string;redirect:string};
async function call(path:string,status:number,options:{session?:Session;method?:string;json?:unknown;form?:FormData;origin?:string;headers?:Record<string,string>}={}) {
  const response=await fetch(`${base}${path}`,{method:options.method||'GET',redirect:'manual',signal:AbortSignal.timeout(60000),
    headers:{...(options.session?{Cookie:options.session.cookie}:{}),...(options.json!==undefined?{'Content-Type':'application/json'}:{}),...(options.method?{Origin:options.origin||base}:{}),...options.headers},
    body:options.form ?? (options.json!==undefined?JSON.stringify(options.json):undefined)});
  assert.equal(response.status,status,`${options.method||'GET'} ${path}: expected ${status}, got ${response.status}`);checks++;return response;
}
async function login(email:string):Promise<Session> {
  const response=await call('/api/auth/login',200,{method:'POST',json:{email,password}});const data=await response.json();
  const cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
  return {cookie,redirect:data.redirectTo};
}
const account=(name:string,email:string,role:string,cityId='C001')=>({name,email,password,role,cityId,phone:'+923001234567',accountStatus:'active',employmentStatus:'Active',assignedZone:'Test zone',...(role==='city_manager'?{branchId:'QA-BR1'}:{})});
const hashPassword=(value:string)=>new Promise<string>((resolve,reject)=>{const salt=randomBytes(16);scryptCallback(value,salt,64,{maxmem:128*1024*1024},(error,key)=>error?reject(error):resolve(`${salt.toString('base64url')}.${Buffer.from(key).toString('base64url')}`));});
const liveAccountTable=(await owner.query("SELECT CASE WHEN to_regclass('public.team_members') IS NOT NULL THEN 'team_members' ELSE 'users' END AS name")).rows[0].name;
assert.ok(['users','team_members'].includes(liveAccountTable));
const liveSnapshot=async()=>({users:(await owner.query(`SELECT COUNT(*)::int AS count FROM public.${liveAccountTable}`)).rows,
  collections:(await owner.query('SELECT COUNT(*)::int AS count FROM public.collections')).rows,
  reports:(await owner.query('SELECT COUNT(*)::int AS count,SUM(amount_pkr)::text AS total FROM public.monthly_collection_reports')).rows});
const before=await liveSnapshot();
try {
  await owner.query(`CREATE SCHEMA ${schema}`);created=true;
  await fixtures.query(await fs.readFile('database/schema.sql','utf8'));
  await fixtures.query(await fs.readFile('database/migrate_monthly_reports.sql','utf8'));
  await fixtures.query(await fs.readFile('database/migrate_report_uploads.sql','utf8'));
  await fixtures.query(`INSERT INTO cities VALUES('C001','Karachi','Sindh'),('C002','Lahore','Punjab'),('C003','Multan','Punjab');
    INSERT INTO roles VALUES(1,'super_admin','Super Admin'),(2,'admin','City Admin'),(3,'city_manager','Branch Admin'),(4,'rider','Rider');`);
  if(process.env.FLOW_ROLE_KEYS!=='canonical')await fixtures.query("UPDATE roles SET role_key=CASE role_key WHEN 'admin' THEN 'city_admin' WHEN 'city_manager' THEN 'branch_admin' ELSE role_key END");
  const hash=await hashPassword(password);
  for(const [id,name,email,role,city] of [
    ['QA-SUPER','QA Super','super@example.invalid',1,null],['QA-CITY','QA City','city@example.invalid',2,'C001'],
    ['QA-BRANCH','QA Branch','branch@example.invalid',3,'C001'],['QA-RIDER','QA Rider','rider@example.invalid',4,'C001'],
    ['QA-RIDER-OTHER','QA Other Branch Rider','otherbranchrider@example.invalid',4,'C001'],
    ['QA-OTHER','QA Other','other@example.invalid',4,'C002'],
  ] as const) await fixtures.query(`INSERT INTO team_members(team_id,full_name,email,phone,role_id,city_id,identity_type,account_status,password_hash) VALUES($1,$2,$3,'+923001234567',$4,$5,'login_account','active',$6)`,[id,name,email,role,city,hash]);
  await fixtures.query(`INSERT INTO branches(branch_id,city_id,branch_name) VALUES('QA-BR1','C001','Test Branch'),('QA-BR2','C001','Other Branch');
    UPDATE team_members SET branch_id='QA-BR1',assigned_branch='Test Branch' WHERE team_id IN ('QA-BRANCH','QA-RIDER');
    UPDATE team_members SET branch_id='QA-BR2',assigned_branch='Other Branch' WHERE team_id='QA-RIDER-OTHER';
    INSERT INTO team_member_branch_assignments(team_id,city_id,branch_id) VALUES('QA-BRANCH','C001','QA-BR1'),('QA-RIDER','C001','QA-BR1'),('QA-RIDER-OTHER','C001','QA-BR2');`);
  await fixtures.query(`INSERT INTO riders VALUES('QA-R1','QA-RIDER','Active','North'),('QA-R2','QA-OTHER','Active','Central'),('QA-R3','QA-RIDER-OTHER','Active','South');
    INSERT INTO donation_boxes(box_id,qr_code,city_id,area,location_type,location_description,assigned_rider_id,installation_date,box_status,security_level)
    VALUES('QA-BOX1','QR-QA-1','C001','Gulshan','Shop','Fixture street','QA-R1','2026-01-01','Active','Standard'),
      ('QA-BOX2','QR-QA-2','C002','Model Town','Shop','Other city','QA-R2','2026-01-01','Active','Standard'),
      ('QA-DAMAGED','QR-QA-DMG','C001','Saddar','Shop','Needs repair','QA-R1','2026-01-01','Damaged','Standard'),
      ('QA-BOX-BR2','QR-QA-BR2','C001','Clifton','Shop','Other branch location','QA-R3','2026-01-01','Active','Standard');
    INSERT INTO branch_box_assignments(box_id,city_id,branch_id) VALUES('QA-BOX1','C001','QA-BR1'),('QA-DAMAGED','C001','QA-BR1'),('QA-BOX-BR2','C001','QA-BR2');
    INSERT INTO collections(collection_id,box_id,rider_id,city_id,collection_date,collection_amount_pkr,collection_status,recorded_by_team_id)
      VALUES('QA-COL-BR2','QA-BOX-BR2','QA-R3','C001','2026-11-11',9999,'Pending Verification','QA-RIDER-OTHER');
    INSERT INTO rider_tasks(task_id,rider_id,box_id,task_date,task_type,task_status) VALUES
      ('QA-VISIT','QA-R1','QA-DAMAGED','2026-11-11','Follow-up Visit','Assigned'),
      ('QA-CANCEL','QA-R1','QA-BOX1','2026-11-11','Scheduled Collection','Cancelled'),
      ('QA-SKIP','QA-R1','QA-BOX1','2026-11-11','Scheduled Collection','Skipped');`);
  if(process.env.FLOW_ACCOUNT_RENAME==='1') {
    await fixtures.query(`ALTER TABLE team_members RENAME TO users;
      ALTER TABLE users RENAME COLUMN team_record_id TO id;
      ALTER TABLE users RENAME COLUMN team_id TO user_id;
      ALTER TABLE riders RENAME COLUMN team_id TO user_id;
      ALTER TABLE collections RENAME COLUMN recorded_by_team_id TO recorded_by_user_id;
      ALTER TABLE activity_audit_log RENAME COLUMN actor_team_id TO actor_user_id`);
    const migration=(await fs.readFile('database/migrate_team_members.sql','utf8')).replaceAll('public.',`${schema}.`).replaceAll("'public'",`'${schema}'`);
    await fixtures.query(migration);await fixtures.query(migration);
    assert.equal((await fixtures.query('SELECT count(*)::int AS count FROM team_members')).rows[0].count,5);
    assert.equal((await fixtures.query("SELECT to_regclass($1)::text AS legacy",[`${schema}.users`])).rows[0].legacy,null);
    console.log('PASS users renamed to physical team_members, migration idempotent, original account rows and foreign keys retained');
  }
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3117'],{
    cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,DATABASE_URL:fixtureUrl.toString(),AUTH_SECRET:fixtureSecret}});
  server.stderr?.on('data',chunk=>{serverLog=(serverLog+String(chunk)).slice(-12000);});
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {
    if(server.exitCode!==null) throw new Error('The isolated flow server exited before becoming ready.');
    try {ready=(await fetch(`${base}/sign-in`,{signal:AbortSignal.timeout(1500)})).status===200;} catch {}
    if(ready) break;await delay(250);
  }
  assert.ok(ready,'Isolated app must start');
  async function exerciseFlow() {
  const superAdmin=await login('super@example.invalid'),cityAdmin=await login('city@example.invalid'),branch=await login('branch@example.invalid'),rider=await login('rider@example.invalid'),other=await login('other@example.invalid');
  assert.equal(cityAdmin.redirect,'/dashboard/admin');assert.equal(branch.redirect,'/dashboard/manager');assert.equal(rider.redirect,'/dashboard/rider');
  await call('/api/auth/login',401,{method:'POST',json:{email:'city@example.invalid',password:'wrong'}});
  await call('/dashboard',307);await call('/api/dashboard/collections',401);
  console.log('PASS actual password login, redirects and anonymous guards for all four roles');
  const emptyInventory=await (await call('/dashboard/inventory',200,{session:superAdmin})).text();assert.ok(!emptyInventory.includes('NaN'));assert.ok(!emptyInventory.includes('demo cities'));
  for(const query of ['from=2026-02-30','from=2026-11-12&to=2026-11-11','page=-1']) await call(`/api/dashboard/admin/collections?${query}`,400,{session:cityAdmin});

  for(const path of ['/api/dashboard/boxes','/api/dashboard/rider-assignments','/api/reports/import']) await call(path,403,{session:superAdmin,method:'POST',json:{}});
  await call('/api/team-accounts',400,{session:superAdmin,method:'DELETE',json:{}});
  await call('/api/dashboard/boxes/QA-BOX1',403,{session:superAdmin,method:'PATCH',json:{status:'Inactive',reason:'Test'}});
  for(const role of ['city_manager','rider']) await call('/api/team-accounts',403,{session:superAdmin,method:'POST',json:account('Denied',`${role}@example.invalid`,role)});
  await call('/api/team-accounts',201,{session:superAdmin,method:'POST',json:account('New City','newcity@example.invalid','admin','C003')});
  const newCity=await login('newcity@example.invalid');assert.equal(newCity.redirect,'/dashboard/admin');
  const listed=await (await call('/api/team-accounts',200,{session:superAdmin})).json();assert.ok(listed.accounts.some((account:{email:string;role:string})=>account.email==='newcity@example.invalid'&&account.role==='City Admin'));
  await call('/api/team-accounts',409,{session:superAdmin,method:'POST',json:account('Duplicate City','newcity@example.invalid','admin','C003')});
  await call('/api/admins',400,{session:superAdmin,method:'POST',json:{...account('Invalid city','legacyinvalid@example.invalid','admin'),cityId:''}});
  await call('/api/admins',400,{session:superAdmin,method:'POST',json:{...account('Missing city','legacymissing@example.invalid','admin'),cityId:'MISSING'}});
  await call('/api/admins',201,{session:superAdmin,method:'POST',json:account('Legacy City','legacycity@example.invalid','admin','C003')});
  const legacyCity=await login('legacycity@example.invalid');assert.equal(legacyCity.redirect,'/dashboard/admin');
  await call('/api/team-accounts',201,{session:cityAdmin,method:'POST',json:account('New Branch','newbranch@example.invalid','city_manager','C002')});
  assert.equal((await fixtures.query("SELECT city_id FROM team_members WHERE email='newbranch@example.invalid'")).rows[0].city_id,'C001');
  const newBranch=await login('newbranch@example.invalid');assert.equal(newBranch.redirect,'/dashboard/manager');
  const team=await (await call('/api/team-accounts',200,{session:cityAdmin})).json();const branchAccount=team.accounts.find((account:{email:string})=>account.email==='newbranch@example.invalid');assert.equal(branchAccount.role,'Branch Admin');
  await call('/api/team-accounts',200,{session:cityAdmin,method:'DELETE',json:{userId:branchAccount.id,confirmedEmail:'newbranch@example.invalid'}});
  await call('/api/auth/login',401,{method:'POST',json:{email:'newbranch@example.invalid',password}});
  await call('/api/team-accounts',403,{session:branch,method:'POST',json:account('Denied City','deniedcity@example.invalid','admin')});
  await call('/api/team-accounts',403,{session:cityAdmin,method:'POST',origin:'https://invalid.example',json:account('Denied Origin','origin@example.invalid','rider')});
  const createdRider=await (await call('/api/team-accounts',201,{session:branch,method:'POST',json:account('New Rider','newrider@example.invalid','rider','C002')})).json();
  const newRider=await login('newrider@example.invalid');
  assert.equal(createdRider.account.cityId,'C001');
  if(process.env.FLOW_ROLE_KEYS!=='canonical') {
    await fixtures.query("UPDATE roles SET role_key=CASE role_key WHEN 'city_admin' THEN 'admin' WHEN 'branch_admin' THEN 'city_manager' ELSE role_key END");
    await call('/api/team-accounts',201,{session:superAdmin,method:'POST',json:account('Canonical City','canonicalcity@example.invalid','admin','C003')});
    assert.equal((await login('canonicalcity@example.invalid')).redirect,'/dashboard/admin');
    const canonicalBranch=await (await call('/api/team-accounts',201,{session:cityAdmin,method:'POST',json:account('Canonical Branch','canonicalbranch@example.invalid','city_manager')})).json();
    assert.equal((await login('canonicalbranch@example.invalid')).redirect,'/dashboard/manager');
    const canonicalList=await (await call('/api/team-accounts',200,{session:cityAdmin})).json();assert.ok(canonicalList.accounts.some((account:{id:string;role:string})=>account.id===canonicalBranch.account.id&&account.role==='Branch Admin'));
    await call('/api/team-accounts',200,{session:cityAdmin,method:'DELETE',json:{userId:canonicalBranch.account.id,confirmedEmail:'canonicalbranch@example.invalid'}});
    await call('/api/auth/login',401,{method:'POST',json:{email:'canonicalbranch@example.invalid',password}});
    await fixtures.query("UPDATE roles SET role_key=CASE role_key WHEN 'admin' THEN 'city_admin' WHEN 'city_manager' THEN 'branch_admin' ELSE role_key END");
    console.log('PASS live database role aliases and canonical role keys: create, login, list and scoped deletion');
  }
  const edit={userId:createdRider.account.id,name:'Updated Rider',email:'newrider@example.invalid',phone:'+923009876543',accountStatus:'active',assignedZone:'Updated zone',employmentStatus:'Active'};
  await call('/api/team-accounts',200,{session:branch,method:'PATCH',json:edit});
  const persisted=(await fixtures.query('SELECT u.full_name,u.phone,r.assigned_zone FROM team_members u JOIN riders r USING(team_id) WHERE u.team_id=$1',[createdRider.account.id])).rows[0];
  assert.equal(persisted.full_name,'Updated Rider');assert.equal(persisted.phone,edit.phone);assert.equal(persisted.assigned_zone,edit.assignedZone);
  await call('/api/team-accounts',403,{session:other,method:'PATCH',json:edit});
  await call('/api/team-accounts',403,{session:newCity,method:'PATCH',json:edit});
  await call('/api/team-accounts',403,{session:rider,method:'PATCH',json:edit});
  await call('/api/team-accounts',200,{session:superAdmin,method:'PATCH',json:edit});
  await call('/api/team-accounts',403,{session:branch,method:'PATCH',origin:'https://invalid.example',json:edit});
  await call('/api/team-accounts',400,{session:branch,method:'PATCH',json:{...edit,role:'admin'}});
  await call('/api/team-accounts',400,{session:branch,method:'PATCH',json:{...edit,name:'x'}});
  await call('/api/team-accounts',409,{session:branch,method:'PATCH',json:{...edit,email:'branch@example.invalid'}});
  assert.equal((await fixtures.query('SELECT email FROM team_members WHERE team_id=$1',[edit.userId])).rows[0].email,edit.email);
  await call('/api/team-accounts',200,{session:branch,method:'PATCH',json:{...edit,accountStatus:'inactive',employmentStatus:'Inactive'}});
  await call('/api/auth/login',401,{method:'POST',json:{email:edit.email,password}});
  await call('/api/team-accounts',200,{session:branch,method:'PATCH',json:edit});
  const managedCity=await (await call('/api/team-accounts',201,{session:superAdmin,method:'POST',json:account('Managed City','managedcity@example.invalid','admin','C003')})).json();
  const cityEdit={...edit,userId:managedCity.account.id,name:'Edited City',email:'managedcity@example.invalid'};
  await call('/api/team-accounts',200,{session:superAdmin,method:'PATCH',json:cityEdit});
  await call('/api/team-accounts',403,{session:cityAdmin,method:'PATCH',json:cityEdit});
  await call('/api/team-accounts',200,{session:superAdmin,method:'DELETE',json:{userId:managedCity.account.id,confirmedEmail:cityEdit.email}});
  await call('/api/auth/login',401,{method:'POST',json:{email:cityEdit.email,password}});
  await call('/api/team-accounts',404,{session:superAdmin,method:'PATCH',json:cityEdit});
  const managedBranch=await (await call('/api/team-accounts',201,{session:cityAdmin,method:'POST',json:account('Managed Branch','managedbranch@example.invalid','city_manager')})).json();
  await call('/api/team-accounts',200,{session:superAdmin,method:'PATCH',json:{...edit,userId:managedBranch.account.id,name:'Edited Branch',email:'managedbranch@example.invalid'}});
  await call('/api/team-accounts',200,{session:superAdmin,method:'DELETE',json:{userId:managedBranch.account.id,confirmedEmail:'managedbranch@example.invalid'}});
  await call('/api/auth/login',401,{method:'POST',json:{email:'managedbranch@example.invalid',password}});
  const managedRider=await (await call('/api/team-accounts',201,{session:branch,method:'POST',json:account('Managed Rider','managedrider@example.invalid','rider')})).json();
  await call('/api/team-accounts',200,{session:superAdmin,method:'DELETE',json:{userId:managedRider.account.id,confirmedEmail:'managedrider@example.invalid'}});
  await call('/api/auth/login',401,{method:'POST',json:{email:'managedrider@example.invalid',password}});
  console.log('PASS persisted team edits, duplicate rollback, role/city/origin guards, login deactivation and scoped City Admin removal');
  if(accountsOnly){console.log(`${checks} isolated account HTTP checks passed.`);return;}

  const newBox=(await (await call('/api/dashboard/boxes',201,{session:cityAdmin,method:'POST',json:{qrCode:'QR-QA-NEW-BOX',cityId:'C002',district:'Karachi East',area:'Gulshan',locationType:'Shop',locationDescription:'New test location',installationDate:'2026-11-11',securityLevel:'Standard',assignedRiderId:'QA-R1'}})).json()).boxId;
  assert.match(newBox,/^DB-\d{4,}$/);
  assert.equal((await fixtures.query('SELECT city_id FROM donation_boxes WHERE box_id=$1',[newBox])).rows[0].city_id,'C001');
  assert.equal((await fixtures.query('SELECT district FROM donation_boxes WHERE box_id=$1',[newBox])).rows[0].district,'Karachi East');
  await fixtures.query('INSERT INTO branch_box_assignments(box_id,city_id,branch_id) VALUES($1,\'C001\',\'QA-BR1\')',[newBox]);
  const treeHtml=await (await call('/dashboard/admin/boxes?year=all',200,{session:cityAdmin})).text();
  assert.ok(treeHtml.includes('data-tree-node="city"'));assert.ok(treeHtml.includes('data-tree-node="area"'));assert.ok(treeHtml.includes('data-tree-node="box"'));assert.ok(treeHtml.includes('data-tree-edge'));assert.ok(treeHtml.includes(newBox));assert.ok(!treeHtml.includes('QA-BOX2'));
  await call('/api/dashboard/boxes/QA-BOX1/district',403,{session:superAdmin,method:'PATCH',json:{district:'Karachi South'}});
  await call('/api/dashboard/boxes/QA-BOX1/district',403,{session:rider,method:'PATCH',json:{district:'Karachi South'}});
  await call('/api/dashboard/boxes/QA-BOX2/district',404,{session:branch,method:'PATCH',json:{district:'Karachi South'}});
  await call('/api/dashboard/boxes/QA-BOX1/district',400,{session:branch,method:'PATCH',json:{district:''}});
  await call('/api/dashboard/boxes/QA-BOX1/district',200,{session:branch,method:'PATCH',json:{district:'Karachi South'}});
  await call('/api/dashboard/boxes',400,{session:branch,method:'POST',json:{}});
  const taskData=await (await call('/api/dashboard/rider-assignments',201,{session:branch,method:'POST',json:{riderId:'QA-R1',boxId:newBox,taskDate:'2026-11-11',taskType:'Scheduled Collection'}})).json();
  assert.match(taskData.taskId,/^TSK-\d{3,}$/);
  await call('/api/dashboard/rider-assignments',403,{session:branch,method:'POST',json:{riderId:'QA-R3',boxId:'QA-BOX-BR2',taskDate:'2026-11-11',taskType:'Scheduled Collection'}});
  await call('/api/dashboard/rider-assignments',403,{session:branch,method:'POST',json:{riderId:'QA-R1',boxId:'QA-BOX-BR2',taskDate:'2026-11-11',taskType:'Scheduled Collection'}});
  const taskPath=`/api/dashboard/tasks/${taskData.taskId}`;
  await call('/api/dashboard/rider/notifications',401);
  await call('/api/dashboard/rider/notifications',403,{session:superAdmin});
  const feed=await(await call('/api/dashboard/rider/notifications',200,{session:rider})).json();
  assert.ok(feed.unreadCount>0&&feed.notifications.some((item:{taskId:string})=>item.taskId===taskData.taskId));
  const foreignFeed=await(await call('/api/dashboard/rider/notifications',200,{session:other})).json();
  assert.ok(!foreignFeed.notifications.some((item:{taskId:string})=>item.taskId===taskData.taskId));
  await call('/api/dashboard/rider/notifications',404,{session:other,method:'PATCH',json:{taskIds:[taskData.taskId]}});
  await call('/api/dashboard/rider/notifications',403,{session:rider,method:'PATCH',origin:'https://example.invalid',json:{taskIds:[taskData.taskId]}});
  await call('/api/dashboard/rider/notifications',400,{session:rider,method:'PATCH',json:{taskIds:[]}});
  await call('/api/dashboard/rider/notifications',200,{session:rider,method:'PATCH',json:{taskIds:[taskData.taskId]}});
  const readFeed=await(await call('/api/dashboard/rider/notifications',200,{session:rider})).json();
  assert.equal(readFeed.notifications.find((item:{taskId:string})=>item.taskId===taskData.taskId).read,true);
  await call('/api/dashboard/rider-assignments',403,{session:branch,method:'POST',json:{riderId:'QA-R2',boxId:'QA-BOX2',taskDate:'2026-11-11',taskType:'Scheduled Collection'}});
  await call(`${taskPath}/collection`,404,{session:other,method:'POST',json:{counts:{note_100:1}}});
  await call(taskPath,409,{session:rider,method:'PATCH',json:{status:'Completed'}});
  for(const amount of ['0','-1','1.234','invalid']) await call(`${taskPath}/collection`,400,{session:rider,method:'POST',json:{amount}});
<<<<<<< HEAD
  await call(`${taskPath}/collection`,409,{session:rider,method:'POST',json:{counts:{note_100:1}}});
  await call(taskPath,409,{session:rider,method:'PATCH',json:{stage:'arrived'}});
  await call(taskPath,400,{session:rider,method:'PATCH',json:{status:'Skipped'}});
  await call(taskPath,200,{session:rider,method:'PATCH',json:{stage:'departed',notes:'Started'}});
  const departed=(await fixtures.query('SELECT task_status,workflow_stage,completion_time FROM rider_tasks WHERE task_id=$1',[taskData.taskId])).rows[0];
  assert.equal(departed.task_status,'In Progress');assert.equal(departed.workflow_stage,'departed');assert.equal(departed.completion_time,null);
  assert.equal((await fixtures.query('SELECT count(*)::int AS count FROM collections WHERE rider_task_id=$1',[taskData.taskId])).rows[0].count,0);
  await call(taskPath,409,{session:rider,method:'PATCH',json:{stage:'counting'}});
  await call(taskPath,200,{session:rider,method:'PATCH',json:{stage:'arrived'}});
  await call(taskPath,200,{session:rider,method:'PATCH',json:{stage:'counting'}});
  assert.equal((await fixtures.query('SELECT task_status FROM rider_tasks WHERE task_id=$1',[taskData.taskId])).rows[0].task_status,'In Progress');
  assert.equal((await fixtures.query('SELECT count(*)::int AS count FROM collections WHERE rider_task_id=$1',[taskData.taskId])).rows[0].count,0);
  for(const counts of [{coin_1:-1},{note_10:1.5},{note_20:'2'},{coin_3:1},{note_5000:100000000},{}]) await call(`${taskPath}/collection`,400,{session:rider,method:'POST',json:{counts}});
  const submitted=await (await call(`${taskPath}/collection`,201,{session:rider,method:'POST',json:{counts:{note_1000:1,note_100:2,note_20:1,note_10:1,coin_2:2,coin_1:1},amount:999999,notes:'Counted'}})).json();
  await call(`${taskPath}/collection`,409,{session:rider,method:'POST',json:{counts:{note_100:1}}});
  await call('/api/dashboard/tasks/QA-VISIT/collection',409,{session:rider,method:'POST',json:{counts:{coin_1:1}}});
=======
  await call(taskPath,200,{session:rider,method:'PATCH',json:{status:'In Progress',notes:'Started'}});
  const submitted=await (await call(`${taskPath}/collection`,201,{session:rider,method:'POST',json:{amount:'1234.50',notes:'Counted'}})).json();
  const savedTask=(await fixtures.query('SELECT task_status,workflow_stage,completed_at,completion_time,jsonb_array_length(workflow_events)::int AS event_count FROM rider_tasks WHERE task_id=$1',[taskData.taskId])).rows[0];
  assert.equal(savedTask.task_status,'Completed');assert.equal(savedTask.workflow_stage,'completed');assert.ok(savedTask.completed_at);assert.ok(savedTask.completion_time);assert.equal(savedTask.event_count,3);
  const branchTaskHtml=await (await call('/dashboard/manager/riders',200,{session:branch})).text();assert.ok(branchTaskHtml.includes(taskData.taskId));assert.ok(branchTaskHtml.includes('Completed'));assert.ok(branchTaskHtml.includes('1,234.5'));assert.ok(!branchTaskHtml.includes('QA-BOX-BR2'));assert.ok(!branchTaskHtml.includes('QA-RIDER-OTHER'));
  const branchCollectionsHtml=await (await call('/dashboard/manager/collections?year=all',200,{session:branch})).text();assert.ok(branchCollectionsHtml.includes('Rider cash submissions'));assert.ok(branchCollectionsHtml.includes('1,234.5'));assert.ok(branchCollectionsHtml.includes('Verify'));
  assert.ok(!branchCollectionsHtml.includes('QA-COL-BR2'));
  const branchCollectionApi=await (await call('/api/dashboard/admin/collections',200,{session:branch})).json();assert.ok(branchCollectionApi.records.every((record:{box_id:string})=>record.box_id!=='QA-BOX-BR2'));
  await call('/api/dashboard/collections/QA-COL-BR2/verification',404,{session:branch});
  await call('/api/dashboard/collections/QA-COL-BR2/verification',404,{session:branch,method:'PATCH',json:{status:'Verified'}});
  await call(`${taskPath}/collection`,409,{session:rider,method:'POST',json:{amount:'1234.50'}});
  await call('/api/dashboard/tasks/QA-VISIT/collection',409,{session:rider,method:'POST',json:{amount:'1'}});
>>>>>>> origin/usmanwork
  await call('/api/dashboard/tasks/QA-VISIT',200,{session:rider,method:'PATCH',json:{status:'Completed',notes:'No cash visit'}});
  const closedTask=await(await call('/api/dashboard/tasks/QA-CANCEL',409,{session:rider,method:'PATCH',json:{status:'In Progress'}})).json();
  assert.equal(closedTask.status,'Cancelled');assert.equal(closedTask.stage,'assigned');
  await call('/api/dashboard/tasks/QA-CANCEL/collection',409,{session:rider,method:'POST',json:{counts:{coin_1:1}}});
  await call('/api/dashboard/tasks/QA-SKIP/collection',409,{session:rider,method:'POST',json:{counts:{coin_1:1}}});
  await call('/api/dashboard/tasks/QA-SKIP',409,{session:rider,method:'PATCH',json:{stage:'departed'}});
  await call('/api/dashboard/tasks/QA-SKIP',200,{session:rider,method:'PATCH',json:{status:'In Progress'}});
  assert.equal((await fixtures.query("SELECT workflow_stage FROM rider_tasks WHERE task_id='QA-SKIP'")).rows[0].workflow_stage,'assigned');
  const cashRecord=(await fixtures.query('SELECT cash_breakdown,cash_notes_pkr::float8,cash_coins_pkr::float8,rider_task_id FROM collections WHERE collection_id=$1',[submitted.collectionId])).rows[0];
  assert.equal(cashRecord.cash_notes_pkr,1230);assert.equal(cashRecord.cash_coins_pkr,5);assert.equal(cashRecord.rider_task_id,taskData.taskId);assert.equal(cashRecord.cash_breakdown.coin_2,2);
  const progress=(await fixtures.query('SELECT workflow_stage,workflow_events FROM rider_tasks WHERE task_id=$1',[taskData.taskId])).rows[0];assert.equal(progress.workflow_stage,'submitted');assert.deepEqual(progress.workflow_events.map((event:{stage:string})=>event.stage),['departed','arrived','counting','submitted']);
  assert.equal((await fixtures.query('SELECT count(*)::int AS count FROM field_collection_logs WHERE task_id=$1',[taskData.taskId])).rows[0].count,1);
  const saved=(await fixtures.query('SELECT collection_amount_pkr::text,collection_date::text FROM collections WHERE collection_id=$1',[submitted.collectionId])).rows[0];assert.equal(Number(saved.collection_amount_pkr),1235);
  const today=(await fixtures.query("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date::text AS day")).rows[0].day;assert.equal(saved.collection_date,today);
  const filtered=await (await call(`/api/dashboard/admin/collections?from=${today}&to=${today}&sort=rider_name&city=C002`,200,{session:cityAdmin})).json();
  assert.equal(filtered.totalRecords,1);assert.equal(filtered.records[0].collection_id,submitted.collectionId);
  await fixtures.query("UPDATE collections SET cash_handover_status='Received',deposit_status='Pending' WHERE collection_id=$1",[submitted.collectionId]);
  const riderHtml=await (await call('/dashboard/rider/collections',200,{session:rider})).text();assert.ok(!riderHtml.includes('NaN'));assert.ok(riderHtml.includes('Received'));
  const districtHtml=await (await call('/dashboard/admin/leaderboard?city=C002&year=all',200,{session:cityAdmin})).text();
  assert.ok(districtHtml.includes('District Leaderboard'));assert.ok(districtHtml.includes('Karachi East'));assert.ok(districtHtml.includes('1,235'));assert.ok(!districtHtml.includes('Lahore'));
  const networkDistrictHtml=await (await call('/dashboard/leaderboard?city=C001&year=all',200,{session:superAdmin})).text();assert.ok(networkDistrictHtml.includes('Karachi East'));
  console.log('PASS task assignment, cash and non-cash completion, closed/skipped guards, duplicates and Karachi dates');
  if(tasksOnly){
    const verifyPath=`/api/dashboard/collections/${submitted.collectionId}/verification`;
    await call(verifyPath,200,{session:branch,method:'PATCH',json:{status:'Verified'}});
    const verified=(await fixtures.query('SELECT collection_status,verified_by_team_id,verified_at FROM collections WHERE collection_id=$1',[submitted.collectionId])).rows[0];
    assert.equal(verified.collection_status,'Verified');assert.equal(verified.verified_by_team_id,'QA-BRANCH');assert.ok(verified.verified_at);
    await call(verifyPath,409,{session:branch,method:'PATCH',json:{status:'Flagged',notes:'Already verified'}});
    console.log(`${checks} isolated task and collection verification checks passed.`);return;
  }

  const reviewPath=`/api/dashboard/collections/${submitted.collectionId}/verification`;
  await call(reviewPath,403,{session:superAdmin,method:'PATCH',json:{status:'Verified'}});
  await call(reviewPath,403,{session:rider,method:'GET'});
  await call(reviewPath,404,{session:newCity,method:'GET'});
  await call(reviewPath,404,{session:newCity,method:'PATCH',json:{status:'Verified'}});
  await call(reviewPath,400,{session:branch,method:'PATCH',json:{status:'Flagged',notes:''}});
  await call(reviewPath,200,{session:branch,method:'PATCH',json:{status:'Flagged',notes:'Recount requested'}});
  await call(reviewPath,200,{session:cityAdmin,method:'PATCH',json:{status:'Verified',notes:'Recount complete'}});
  const locked=await call(reviewPath,409,{session:branch,method:'PATCH',json:{status:'Flagged',notes:'Cannot alter locked entry'}});
  assert.ok(!(await locked.text()).includes('Verified'));
  const history=await (await call(reviewPath,200,{session:superAdmin})).json();
  assert.equal(history.events.filter((event:{action:string})=>event.action==='reviewed').length,2);
  const reviewed=(await fixtures.query('SELECT notes,collection_status FROM collections WHERE collection_id=$1',[submitted.collectionId])).rows[0];
  assert.equal(reviewed.collection_status,'Verified');assert.ok(reviewed.notes.includes('\nReview [Recorded]: Recount complete'));
  for(const stage of ['departed','arrived','counting']) await call('/api/dashboard/tasks/QA-SKIP',200,{session:rider,method:'PATCH',json:{stage}});
  const concurrent=await Promise.all([1,2].map(()=>fetch(`${base}/api/dashboard/tasks/QA-SKIP/collection`,{method:'POST',headers:{Cookie:rider.cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({counts:{note_50:1,note_20:1,coin_5:1,coin_2:1}}),signal:AbortSignal.timeout(60000)})));
  assert.deepEqual(concurrent.map(response=>response.status).sort(),[201,409]);checks+=2;
  await call('/api/dashboard/boxes/QA-BOX2',404,{session:branch,method:'PATCH',json:{status:'Inactive',reason:'Foreign box'}});
  await call('/api/dashboard/boxes/QA-DAMAGED',400,{session:branch,method:'PATCH',json:{status:'Active',reason:'x'}});
  await call('/api/dashboard/boxes/QA-DAMAGED',200,{session:branch,method:'PATCH',json:{status:'Active',reason:'Repair completed'}});
  await call('/api/dashboard/boxes/QA-DAMAGED',409,{session:branch,method:'PATCH',json:{status:'Active',reason:'Already repaired'}});
  assert.equal((await fixtures.query("SELECT COUNT(*)::int AS count FROM box_status_history WHERE box_id='QA-DAMAGED'")).rows[0].count,1);
  console.log('PASS review/flag/lock audit flow, cross-city denial, simultaneous cash submissions and box status history');

  const newRiderId=(await fixtures.query('SELECT rider_id FROM riders WHERE team_id=$1',[createdRider.account.id])).rows[0].rider_id;
  const newTask=await (await call('/api/dashboard/rider-assignments',201,{session:branch,method:'POST',json:{riderId:newRiderId,boxId:'QA-BOX1',taskDate:'2026-11-11',taskType:'Scheduled Collection'}})).json();
  for(const stage of ['departed','arrived','counting']) await call(`/api/dashboard/tasks/${newTask.taskId}`,200,{session:newRider,method:'PATCH',json:{stage}});
  await call(`/api/dashboard/tasks/${newTask.taskId}/collection`,201,{session:newRider,method:'POST',json:{counts:{note_50:1,coin_5:1}}});
  await call('/api/team-accounts',200,{session:cityAdmin,method:'DELETE',json:{userId:createdRider.account.id,confirmedEmail:'newrider@example.invalid'}});
  await call('/api/auth/login',401,{method:'POST',json:{email:'newrider@example.invalid',password}});
  await call(`/api/dashboard/tasks/${newTask.taskId}`,401,{session:newRider,method:'PATCH',json:{status:'Skipped'}});
  assert.equal((await fixtures.query('SELECT count(*)::int AS count FROM collections WHERE rider_id=$1',[newRiderId])).rows[0].count,1);
  await fixtures.query("UPDATE team_members SET city_id='C002' WHERE team_id='QA-CITY'");
  await call('/api/dashboard/admin/collections',401,{session:cityAdmin});
  await fixtures.query("UPDATE team_members SET city_id='C001',role_id=4 WHERE team_id='QA-CITY'");
  await call('/api/dashboard/admin/collections',401,{session:cityAdmin});
  await fixtures.query("UPDATE team_members SET role_id=2 WHERE team_id='QA-CITY'");
  await fixtures.query("UPDATE riders SET employment_status='Inactive' WHERE rider_id='QA-R1'");
  await call('/api/dashboard/tasks/QA-SKIP/collection',404,{session:rider,method:'POST',json:{counts:{coin_1:1}}});
  await fixtures.query("UPDATE riders SET employment_status='Active' WHERE rider_id='QA-R1'");
  console.log('PASS soft deletion preserves history and stale city/role/inactive-rider sessions cannot write');

  assert.ok(workbook,'Pass the source workbook path');
  const workbookBytes=await fs.readFile(workbook);
  const upload=(mode:string,fingerprint?:string)=>{const form=new FormData();form.set('file',new Blob([new Uint8Array(workbookBytes)]),'reports.xlsx');form.set('mode',mode);if(fingerprint) form.set('fingerprint',fingerprint);return form;};
  const preview=(await (await call('/api/reports/import',200,{session:cityAdmin,method:'POST',form:upload('preview')})).json()).preview;
  assert.ok(preview.collections>0 && preview.excluded>0);
  await call('/api/reports/import',409,{session:branch,method:'POST',form:upload('apply','wrong')});
  await call('/api/reports/import',200,{session:branch,method:'POST',form:upload('apply',preview.fingerprint)});
  const duplicate=await (await call('/api/reports/import',200,{session:cityAdmin,method:'POST',form:upload('apply',preview.fingerprint)})).json();assert.equal(duplicate.alreadyImported,true);
  assert.equal((await fixtures.query('SELECT COUNT(*)::int AS count FROM monthly_collection_reports')).rows[0].count,preview.collections);
  assert.equal((await fixtures.query("SELECT COUNT(*)::int AS count FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id<>'C001'")).rows[0].count,0);
  for(const [session,prefix] of [[superAdmin,'/dashboard'],[cityAdmin,'/dashboard/admin'],[branch,'/dashboard/manager']] as const) for(const suffix of ['', '/collections','/boxes','/riders','/finance','/leaderboard','/transactions','/analytics','/inventory','/operations']) await call(`${prefix}${suffix}`,200,{session});
  for(const [session,prefix] of [[cityAdmin,'/dashboard/admin'],[branch,'/dashboard/manager']] as const) for(const suffix of ['/team','/import']) await call(`${prefix}${suffix}`,200,{session});
  for(const suffix of ['', '/tasks','/collections','/profile']) await call(`/dashboard/rider${suffix}`,200,{session:rider});
  const reportedTreeHtml=await (await call('/dashboard/admin/boxes?year=2026',200,{session:cityAdmin})).text();assert.ok(reportedTreeHtml.includes('Reported collection:'));assert.ok(reportedTreeHtml.includes('Collection:'));
  const scopedHtml=await (await call('/dashboard/admin/collections?city=C002',200,{session:cityAdmin})).text();assert.ok(!scopedHtml.includes('Lahore'));
  const logout=await call('/api/auth/logout',303,{session:rider,method:'POST'});assert.ok(logout.headers.get('set-cookie')?.includes('Max-Age=0'));
  console.log('PASS HTTP Excel preview/apply, fingerprint, city exclusion, idempotency, all role pages and logout');
  console.log(`${checks} isolated full-flow HTTP checks passed.`);
  if(process.env.FLOW_VISUAL_REVIEW==='1') {
    const preview=createServer(async(request,response)=>{
      if(request.method!=='GET'){response.writeHead(405);response.end();return;}
      try{const headers=new Headers();for(const [key,value] of Object.entries(request.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);headers.set('host','127.0.0.1:3117');headers.set('cookie',cityAdmin.cookie);const upstream=await fetch(`${base}${request.url}`,{headers,redirect:'manual'});response.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([key])=>!['content-length','content-encoding','transfer-encoding','set-cookie'].includes(key))));response.end(Buffer.from(await upstream.arrayBuffer()));}
      catch{response.writeHead(503);response.end('Preview unavailable');}
    });
    await new Promise<void>(resolve=>preview.listen(4179,'127.0.0.1',resolve));
    console.log('Read-only isolated tree review ready on 4179. Send Enter to finish cleanup.');
    process.stdin.resume();
    let release:()=>void=()=>{};const done=new Promise<void>(resolve=>{release=resolve;});
    const timer=setTimeout(release,300000);process.stdin.once('data',release);
    try{await done;}finally{clearTimeout(timer);process.stdin.removeListener('data',release);process.stdin.pause();await new Promise<void>(resolve=>preview.close(()=>resolve()));}
  }
  }
  await exerciseFlow();
} catch(error) {
  if(serverLog) console.error(serverLog);
  throw error;
} finally {
  if(server && server.exitCode===null) {server.kill('SIGTERM');await Promise.race([new Promise(resolve=>server!.once('exit',resolve)),delay(3000)]);if(server.exitCode===null) server.kill('SIGKILL');}
  await fixtures.end();
  if(created) {assert.match(schema,/^test_flow_[0-9a-f]{16}$/);await owner.query(`DROP SCHEMA ${schema} CASCADE`);}
  assert.deepEqual(await liveSnapshot(),before,'Live public records must remain unchanged');await owner.end();
}
