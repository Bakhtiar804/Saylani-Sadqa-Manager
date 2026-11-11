import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import pg from 'pg';
import { createHmac } from 'node:crypto';

nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set('sslmode','verify-full');
const pool = new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});
try {
  const imported = (await pool.query(`SELECT batch_id,reconciliation FROM report_import_batches ORDER BY batch_id DESC LIMIT 1`)).rows[0];
  assert.ok(imported,'A reconciled workbook import is required');
  for(const [table,expected] of Object.entries(imported.reconciliation.tables) as [string,{rows:number;missing:number;total:string}][]) {
    assert.ok(['monthly_collection_reports','monthly_expense_reports','monthly_staff_counts'].includes(table));
    const value = table==='monthly_staff_counts'?'staff_count':'amount_pkr';
    const actual = (await pool.query(`SELECT count(*)::int AS rows,count(*) FILTER(WHERE ${value} IS NULL)::int AS missing,sum(${value})::text AS total FROM ${table} WHERE import_batch_id=$1`,[imported.batch_id])).rows[0];
    assert.deepEqual(actual,expected,`${table} reconciliation`);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM ${table} r LEFT JOIN reporting_cities city USING(city_id) WHERE r.import_batch_id=$1 AND city.operational_city_id IS NULL`,[imported.batch_id])).rows[0].count,0,'Every imported city must map to an operating city');
    console.log(`PASS ${table}: counts, missing values, exact database totals and city mappings`);
  }
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM (
    SELECT city_id,report_month,collection_channel FROM monthly_collection_reports GROUP BY 1,2,3 HAVING count(*)>1) duplicate`)).rows[0].count,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM monthly_collection_reports WHERE amount_pkr IS NULL AND source_value_state='reported'`)).rows[0].count,0);
  assert.equal((await pool.query(`SELECT count(*)::int AS count FROM monthly_expense_reports WHERE source_value_state='dash' AND amount_pkr IS NOT NULL`)).rows[0].count,0);
  assert.equal((await pool.query(`SELECT count(DISTINCT source_sheet)::int AS count FROM report_source_rows WHERE batch_id=$1`,[imported.batch_id])).rows[0].count,imported.reconciliation.sourceSheets.length);
  console.log('PASS duplicate prevention, blank/dash semantics and archived source sheets');

  const base = process.argv[2];
  if(base) {
    const host = new URL(base).hostname;
    assert.ok(['localhost','127.0.0.1','[::1]'].includes(host),'Only send local test sessions to loopback servers');
    const accounts = (await pool.query(`SELECT DISTINCT ON(role.role_key) u.user_id,u.email,u.full_name,u.city_id,role.role_key
      FROM users u JOIN roles role USING(role_id) WHERE u.identity_type='login_account' AND u.account_status='active'
      AND u.deleted_at IS NULL AND (role.role_key='super_admin' OR u.city_id IS NOT NULL) ORDER BY role.role_key,u.created_at DESC`)).rows;
    const secret = process.env.AUTH_SECRET!;
    assert.ok(secret);
    const foreign = (await pool.query(`SELECT app.city_id,app.city_name FROM cities app WHERE EXISTS(SELECT 1 FROM reporting_cities city JOIN monthly_collection_reports r USING(city_id) WHERE city.operational_city_id=app.city_id) ORDER BY app.city_name`)).rows;
    // Missing roles are exercised by test:flow with real accounts in an isolated schema.
    for(const account of accounts) {
      if(!['super_admin','admin','city_manager'].includes(account.role_key)) continue;
      const payload = Buffer.from(JSON.stringify({userId:account.user_id,email:account.email,name:account.full_name,cityId:account.city_id,role:account.role_key,expiresAt:Math.floor(Date.now()/1000)+600})).toString('base64url');
      const signature = createHmac('sha256',secret).update(payload).digest('base64url');
      const headers = {Cookie:`saylani_admin_session=${payload}.${signature}`};
      const prefix = account.role_key==='admin'?'/dashboard/admin':account.role_key==='city_manager'?'/dashboard/manager':'/dashboard';
      for(const route of ['', '/collections','/boxes','/finance','/analytics']) {
        const response = await fetch(`${base}${prefix}${route}?year=all`,{headers,redirect:'manual',signal:AbortSignal.timeout(60000)});
        assert.equal(response.status,200,`${account.role_key} ${route}`);
        const html = await response.text();
        assert.ok(html.includes('Actual monthly figures supplied'),`${route} must render real reporting view`);
        assert.ok(!html.includes('Fictional demo data'),`${route} must not label real data as fictional`);
      }
      if(account.role_key!=='super_admin') {
        const other = foreign.find(city=>city.city_id!==account.city_id)!;
        const response = await fetch(`${base}${prefix}/collections?year=all&city=${other.city_id}`,{headers});
        const html = await response.text();
        // A requested foreign city must not enter either table records or serialized city options.
        assert.ok(!html.includes(other.city_name),'A city account must not expose another city');
        const assignedName = (await pool.query('SELECT city_name FROM cities WHERE city_id=$1',[account.city_id])).rows[0]?.city_name;
        assert.ok(html.includes(assignedName),'Assigned-city context must remain visible');
      } else {
        const response = await fetch(`${base}/dashboard/collections?year=2024&city=${foreign[0].city_id}&channel=public`,{headers});
        assert.equal(response.status,200);
        const html = await response.text();
        assert.ok(html.includes(foreign[0].city_name));
        assert.ok(html.includes('2024-01'));
      }
      console.log(`PASS ${account.role_key}: five reporting pages and filter/city scope`);
      const expectedBase=prefix;
      for(const page of ['/leaderboard','/riders']) {
        const response=await fetch(`${base}${expectedBase}${page}`,{headers,signal:AbortSignal.timeout(60000)});
        assert.equal(response.status,200,`${account.role_key} ${page}`);
        const html=await response.text();assert.ok(!html.includes('Verified'),'Legacy collection status labels must not be visible');
      }
      if(account.role_key==='super_admin') {
        for(const [path,method] of [['/api/team-accounts','DELETE'],['/api/dashboard/boxes','POST'],['/api/dashboard/boxes/test','PATCH'],['/api/dashboard/rider-assignments','POST'],['/api/dashboard/collections/test/verification','PATCH'],['/api/reports/import','POST']] as const) {
          const response=await fetch(`${base}${path}`,{method,headers:{...headers,'Content-Type':'application/json'},body:'{}'});
          assert.equal(response.status,403,`Super Admin write denied: ${path}`);
        }
        for(const role of ['rider','city_manager']) {
          const response=await fetch(`${base}/api/team-accounts`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({name:'Denied Fixture',email:'denied@example.invalid',phone:'+923001234567',password:'test-not-created-password',role,cityId:foreign[0].city_id})});
          assert.equal(response.status,403);
        }
        console.log('PASS Super Admin: operational writes, uploads, deletions and non-City-Admin creation denied');
      } else {
        const response=await fetch(`${base}${prefix}/import`,{headers});assert.equal(response.status,200);
        const denied=await fetch(`${base}/api/reports/import`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:'https://invalid.example'},body:'{}'});assert.equal(denied.status,403);
        console.log(`PASS ${account.role_key}: import page and cross-origin upload denial`);
      }
    }
  }
} finally { await pool.end(); }

