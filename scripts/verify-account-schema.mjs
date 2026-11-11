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
 const account=(await pool.query(`SELECT u.team_id,u.email,u.full_name,u.city_id FROM team_members u JOIN roles r USING(role_id) WHERE r.role_key='super_admin' AND u.identity_type='login_account' AND u.account_status='active' AND u.deleted_at IS NULL LIMIT 1`)).rows[0];
 assert.ok(account);
 console.log(`PASS ${count.accounts} accounts available; Super Admin and Rider joins resolve`);
 const base=process.argv[2];
 if(base) {
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));
  const payload=Buffer.from(JSON.stringify({userId:account.team_id,email:account.email,name:account.full_name,cityId:account.city_id,role:'super_admin',expiresAt:Math.floor(Date.now()/1000)+300})).toString('base64url');
  const cookie=payload+'.'+createHmac('sha256',process.env.AUTH_SECRET.trim()).update(payload).digest('base64url');
  for(const [path,title] of [['/dashboard','Donation &amp; Expense Overview'],['/dashboard/analytics','Collection Analytics'],['/dashboard/admins','Team directory']]) {
   const response=await fetch(base+path,{headers:{Cookie:'saylani_admin_session='+cookie},redirect:'manual',signal:AbortSignal.timeout(90000)});
   assert.equal(response.status,200,path);
   const html=await response.text();
   assert.ok(html.includes(title),`${path} content`);
   assert.ok(!html.includes('relation \\"users\\" does not exist'),path);
   assert.ok(!html.includes('NEXT_REDIRECT'),`${path} authenticated`);
   console.log(`PASS authenticated GET ${path}`);
  }
 }
}finally{await pool.end();}
