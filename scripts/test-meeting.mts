import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';
import { parseExcelReports } from '../lib/excel-reports';
import { prepareReportUpload,applyReportUpload } from '../lib/report-upload';
import { creatableRoles,deletableRoles,canOperate,canImportReports } from '../lib/permissions';
import { getNetworkTree } from '../lib/network-tree';
import { getRiderDetails,previousReportingMonth } from '../lib/rider-details';
import { requestJson } from '../lib/client-request';
import { withApiErrors } from '../lib/api-errors';
import type { UserSession } from '../lib/session';
import { normalizeRecordRows,recordDateWithinRange } from '../lib/record-values';
import { validateExplorerParams } from '../lib/explorer-params';

nextEnv.loadEnvConfig(process.cwd());
const file=process.argv[2];assert.ok(file,'Pass the source workbook path');
const bytes=await fs.readFile(file);const parsed=await parseExcelReports(bytes);
assert.equal(parsed.rows.filter(row=>row.kind==='collection').length,1638);
assert.equal(parsed.rows.filter(row=>row.kind==='expense').length,801);
assert.equal(parsed.rows.filter(row=>row.kind==='staff').length,462);
assert.equal(parsed.rows.filter(row=>row.kind==='collection' && row.amount===null).length,39);
assert.equal(parsed.rows.filter(row=>row.kind==='expense' && row.amount===null).length,46);
assert.ok(parsed.rows.some(row=>row.kind==='collection' && row.amount==='0'));
await assert.rejects(()=>parseExcelReports(Buffer.from('not an xlsx')),/invalid|large/i);
console.log('PASS TypeScript Excel parsing: original row counts, blanks, dashes, zeroes and invalid file');
assert.deepEqual(creatableRoles.super_admin,['admin']);assert.deepEqual(deletableRoles.super_admin,[]);
assert.equal(canOperate('super_admin'),false);assert.equal(canImportReports('super_admin'),false);
assert.equal(canImportReports('admin'),true);assert.equal(canImportReports('city_manager'),true);
assert.equal(previousReportingMonth(new Date('2026-01-01T12:00:00Z')),'2025-12');
console.log('PASS Super Admin policy and prior-month year boundary');
const normalized=normalizeRecordRows([{cash_handover_status:'Received',deposit_status:'Pending',collection_amount_pkr:'1234.50',discrepancy_amount_pkr:null}])[0];
assert.equal(normalized.cash_handover_status,'Received');assert.equal(normalized.deposit_status,'Pending');assert.equal(normalized.collection_amount_pkr,1234.5);assert.equal(normalized.discrepancy_amount_pkr,null);
assert.equal(recordDateWithinRange('2026-11-11T19:00:00.000Z','2026-11-11','2026-11-11'),true);
assert.equal(recordDateWithinRange('2026-11-10T23:59:59.000Z','2026-11-11','2026-11-11'),false);
assert.equal(recordDateWithinRange(null,'2026-11-11',''),false);
assert.throws(()=>validateExplorerParams(new URLSearchParams('from=2026-02-30')),/calendar date/);
assert.throws(()=>validateExplorerParams(new URLSearchParams('from=2026-11-12&to=2026-11-11')),/start date/);
console.log('PASS cash-status text preservation and inclusive/validated date filters');

const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('sslmode','verify-full');
// Session-scoped search_path is deliberately tested on the same endpoint's direct connection.
url.hostname=url.hostname.replace(/-pooler(?=\.)/,'');
const config={connectionString:url.toString(),connectionTimeoutMillis:10000,max:2};
const owner=new pg.Pool(config);const schema=`test_meeting_${randomBytes(8).toString('hex')}`;
assert.match(schema,/^test_meeting_[0-9a-f]{16}$/);
const previousPool=globalThis.saylaniDatabasePool;let isolated:pg.Pool|undefined;let created=false;
try {
  await owner.query(`CREATE SCHEMA ${schema}`);created=true;
  isolated=new pg.Pool({...config,options:`-c search_path=${schema}`});
  globalThis.saylaniDatabasePool=isolated;
  await isolated.query(`CREATE TABLE cities(city_id VARCHAR(16) PRIMARY KEY,city_name VARCHAR(100) UNIQUE NOT NULL,province VARCHAR(100) NOT NULL);
    CREATE TABLE users(user_id VARCHAR(40) PRIMARY KEY,full_name TEXT,email TEXT,phone TEXT,city_id VARCHAR(16),created_at TIMESTAMPTZ DEFAULT NOW(),account_status TEXT DEFAULT 'active');
    INSERT INTO cities VALUES('C001','Karachi','Sindh'),('C002','Lahore','Punjab');
    INSERT INTO users(user_id,full_name,email,phone,city_id) VALUES('TEST-ADMIN','Test Admin','test@example.invalid','000000000','C001'),('TEST-R1','Rider One','one@example.invalid','000000001','C001'),('TEST-R2','Rider Two','two@example.invalid','000000002','C002');`);
  await isolated.query(await fs.readFile('database/migrate_monthly_reports.sql','utf8'));
  await isolated.query(await fs.readFile('database/migrate_report_uploads.sql','utf8'));
  const actor:UserSession={userId:'TEST-ADMIN',name:'Test Admin',email:'test@example.invalid',cityId:'C001',role:'admin',expiresAt:Date.now()+60000};
  await assert.rejects(()=>prepareReportUpload(parsed,{...actor,role:'super_admin'},bytes),/operational account/);
  const plan=await prepareReportUpload(parsed,actor,bytes);
  assert.ok(plan.preview.excluded>0);assert.ok(plan.rows.every(row=>row.city.toLowerCase()==='karachi'));
  await applyReportUpload(plan,actor,'test-workbook.xlsx');
  const totalBefore=(await isolated.query('SELECT count(*)::int AS count,SUM(amount_pkr)::text AS total FROM monthly_collection_reports')).rows[0];
  assert.equal(totalBefore.count,plan.preview.collections);
  assert.equal((await isolated.query(`SELECT count(*)::int AS count FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id <> 'C001'`)).rows[0].count,0);
  const duplicate=await applyReportUpload(plan,actor,'test-workbook.xlsx');assert.equal(duplicate.alreadyImported,true);
  const changedParsed={...parsed,rows:parsed.rows.map(row=>({...row,row:row.row+2,amount:row.kind==='collection' && row.city==='Karachi' && row.amount!==null?String(Number(row.amount)+1):row.amount}))};
  const replacement=await prepareReportUpload(changedParsed,actor,Buffer.from('replacement fixture'));
  await applyReportUpload(replacement,actor,'replacement.xlsx');
  assert.equal((await isolated.query('SELECT count(*)::int AS count FROM monthly_collection_reports')).rows[0].count,totalBefore.count);
  const batchesBefore=(await isolated.query('SELECT count(*)::int AS count FROM report_import_batches')).rows[0].count;
  const invalid={...replacement,rows:replacement.rows.map((row,index)=>index===0?{...row,amount:'invalid numeric input'}:row),preview:{...replacement.preview,fingerprint:'f'.repeat(64)}};
  await assert.rejects(()=>applyReportUpload(invalid,actor,'rollback.xlsx'));
  assert.equal((await isolated.query('SELECT count(*)::int AS count FROM report_import_batches')).rows[0].count,batchesBefore);
  console.log('PASS isolated PostgreSQL import: city exclusion, business-key upsert, idempotency, backups and rollback');

  await isolated.query(`CREATE TABLE riders(rider_id TEXT PRIMARY KEY,user_id TEXT,assigned_zone TEXT,employment_status TEXT);
    CREATE TABLE donation_boxes(box_id TEXT PRIMARY KEY,qr_code TEXT,city_id TEXT,area TEXT,box_status TEXT,location_description TEXT,assigned_rider_id TEXT);
    CREATE TABLE collections(collection_id TEXT PRIMARY KEY,rider_id TEXT,collection_date DATE,box_id TEXT,city_id TEXT,collection_amount_pkr NUMERIC,cash_handover_status TEXT,deposit_status TEXT);
    CREATE TABLE rider_tasks(task_id TEXT,rider_id TEXT,task_status TEXT,task_date DATE,box_id TEXT,task_type TEXT);
    INSERT INTO riders VALUES('R1','TEST-R1','North','Active'),('R2','TEST-R2','Central','Active');
    INSERT INTO donation_boxes VALUES('B1','QR-B1','C001','Gulshan','Active','Test location','R1'),('B2','QR-B2','C002','Model Town','Active','Other city','R2');
    INSERT INTO collections VALUES('COL1','R1','2026-10-03','B1','C001',1234,'Received','Deposited'),('COL2','R2','2026-10-03','B2','C002',999,'Received','Deposited'),('COL3','R1','2026-09-03','B1','C001',500,'Received','Deposited');
    INSERT INTO rider_tasks VALUES('TASK1','R1','Assigned','2026-10-01','B1','Scheduled Collection');`);
  const riders=await getRiderDetails(actor,'2026-10');assert.equal(riders.profiles.length,1);assert.equal(riders.history.length,1);assert.equal(riders.history[0].amount_pkr,1234);assert.equal(riders.history[0].area,'Gulshan');
  const personal=await getRiderDetails({...actor,role:'rider',userId:'TEST-R1'},'2026-10');assert.equal(personal.profiles.length,1);
  const tree=await getNetworkTree({network:false,cityId:'C001'},{cityId:'C002',month:'2026-09',channel:'all'});
  assert.equal(tree.length,1);assert.equal(tree[0].name,'Karachi');assert.equal(tree[0].registeredBoxes,1);assert.equal(tree[0].areas[0].boxes[0].id,'B1');assert.ok(tree[0].reportedBoxes!==null);
  const expectedTreeTotal=Number((await isolated.query("SELECT SUM(r.amount_pkr)::text AS amount FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id='C001' AND EXTRACT(YEAR FROM r.report_month)=2026 AND collection_channel='public'")).rows[0].amount);
  await isolated.query("DELETE FROM donation_boxes WHERE city_id='C001'");
  const reportTree=await getNetworkTree({network:false,cityId:'C001'},{cityId:'C002',month:'2026-09',channel:'public',year:'2026'});
  assert.equal(reportTree.length,1);assert.equal(reportTree[0].registeredBoxes,0);assert.equal(reportTree[0].areas.length,0);assert.equal(reportTree[0].reports?.length,1);assert.ok(Math.abs(reportTree[0].reportedCollection!-expectedTreeTotal)<.01);assert.equal(reportTree[0].reports![0].channel,'public');
  console.log('PASS reported city collections remain available without registered boxes, with year/channel and city scope');
  console.log('PASS rider month/location history, personal scope and city → area → box tree');
} finally {
  globalThis.saylaniDatabasePool=previousPool;
  if(isolated) await isolated.end();
  if(created) { assert.match(schema,/^test_meeting_[0-9a-f]{16}$/);await owner.query(`DROP SCHEMA ${schema} CASCADE`); }
  await owner.end();
}

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');const originalFetch=globalThis.fetch;
try {
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
  await assert.rejects(()=>requestJson('/test'),/offline/);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(()=>requestJson('/test'),/connection/);
  globalThis.fetch=async()=>new Response('internal details',{status:503});await assert.rejects(()=>requestJson('/test'),/temporarily unavailable/);
  const originalError=console.error;console.error=()=>{};
  try { const response=await withApiErrors(async()=>{throw new Error('internal detail');})();assert.equal(response.status,503);assert.ok(!(await response.text()).includes('internal detail')); }
  finally {console.error=originalError;}
  console.log('PASS offline/network failures and safe API error responses');
} finally {globalThis.fetch=originalFetch;if(navigatorDescriptor) Object.defineProperty(globalThis,'navigator',navigatorDescriptor);}
