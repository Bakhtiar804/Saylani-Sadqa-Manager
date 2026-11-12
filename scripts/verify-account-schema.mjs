import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
try {
 const count=(await pool.query('SELECT count(*)::int AS accounts FROM team_members')).rows[0];
 await pool.query('SELECT u.team_id,r.team_id FROM team_members u LEFT JOIN riders r USING(team_id) LIMIT 1');
 const brokenLinks=(await pool.query(`SELECT count(*)::int AS count FROM riders rider
   LEFT JOIN team_members person ON person.team_id=rider.team_id WHERE person.team_id IS NULL`)).rows[0].count;
 assert.equal(brokenLinks,0,'Every rider must reference an existing team_members.team_id');
 const account=(await pool.query(`SELECT u.team_id,u.email,u.full_name,u.city_id FROM team_members u JOIN roles r USING(role_id) WHERE r.role_key='super_admin' AND u.identity_type='login_account' AND u.account_status='active' AND u.deleted_at IS NULL LIMIT 1`)).rows[0];
 assert.ok(account);
 console.log(`PASS ${count.accounts} accounts available; Super Admin and Rider joins resolve`);
 const base=process.argv[2];
 if(base) {
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));
  const payload=Buffer.from(JSON.stringify({userId:account.team_id,email:account.email,name:account.full_name,cityId:account.city_id,role:'super_admin',expiresAt:Math.floor(Date.now()/1000)+300})).toString('base64url');
  const cookie=payload+'.'+createHmac('sha256',process.env.AUTH_SECRET.trim()).update(payload).digest('base64url');
  for(const [path,title] of [['/dashboard','Donation &amp; Expense Overview'],['/dashboard/boxes','Donation box location network'],['/dashboard/analytics','Collection Analytics'],['/dashboard/admins','Team directory'],['/dashboard/riders','Rider Details'],['/dashboard/inventory','Donation Boxes'],['/dashboard/operations','Inspections &amp; Incidents'],['/dashboard/users','User directory']]) {
   const response=await fetch(base+path,{headers:{Cookie:'saylani_admin_session='+cookie},redirect:'manual',signal:AbortSignal.timeout(90000)});
   assert.equal(response.status,200,path);
   const html=await response.text();
   assert.ok(html.includes(title),`${path} content`);
   assert.ok(!html.includes('relation \\"users\\" does not exist'),path);
   assert.ok(!html.includes('NEXT_REDIRECT'),`${path} authenticated`);
   if(path==='/dashboard/boxes'){
    const fallback=html.indexOf('aria-label="Loading dashboard"');
    assert.ok(fallback>=0&&fallback<html.indexOf(title),'Loading fallback must be streamed before the dynamic tree');
    assert.ok(!html.includes('blocking-prerender-dynamic'),'Uncached report access must be covered by Suspense');
   }
   console.log(`PASS authenticated GET ${path}`);
  }
  const riders=(await pool.query(`SELECT account.team_id,account.email,account.full_name,account.city_id
    FROM team_members account JOIN roles role USING(role_id) JOIN riders rider USING(team_id)
    WHERE role.role_key='rider' AND account.identity_type='login_account'
      AND account.account_status='active' AND account.deleted_at IS NULL`)).rows;
  for(const rider of riders) {
   const payload=Buffer.from(JSON.stringify({userId:rider.team_id,email:rider.email,name:rider.full_name,cityId:rider.city_id,role:'rider',expiresAt:Math.floor(Date.now()/1000)+300})).toString('base64url');
   const cookie=payload+'.'+createHmac('sha256',process.env.AUTH_SECRET.trim()).update(payload).digest('base64url');
   for(const [path,title] of [['/dashboard/rider','My assigned tasks'],['/dashboard/rider/tasks','My Tasks'],['/dashboard/rider/collections','My Collections'],['/dashboard/rider/profile','My Rider Profile']]) {
    const response=await fetch(base+path,{headers:{Cookie:'saylani_admin_session='+cookie},redirect:'manual',signal:AbortSignal.timeout(90000)});
    assert.equal(response.status,200,path);
    const html=await response.text();
    assert.ok(html.includes(title),`${path} content`);
    assert.ok(!html.includes('NEXT_REDIRECT'),`${path} authenticated`);
    assert.ok(!html.includes('does not exist'),`${path} schema`);
   }
  }
  console.log(`PASS ${riders.length} active Rider accounts: overview, tasks, collections and profile resolve current team IDs`);
 }
}finally{await pool.end();}
