import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import env from '@next/env';
import pg from 'pg';
import {JSDOM} from 'jsdom';
env.loadEnvConfig(process.cwd());
const base=process.argv[2];assert.ok(base&&['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
try{
 const account=(await pool.query(`SELECT u.team_id,u.email,u.full_name,u.city_id FROM team_members u JOIN roles r USING(role_id) WHERE r.role_key='super_admin' AND u.account_status='active' AND u.deleted_at IS NULL LIMIT 1`)).rows[0];assert.ok(account);
 const payload=Buffer.from(JSON.stringify({userId:account.team_id,email:account.email,name:account.full_name,cityId:account.city_id,role:'super_admin',expiresAt:Math.floor(Date.now()/1000)+600})).toString('base64url');
 const token=payload+'.'+createHmac('sha256',process.env.AUTH_SECRET.trim()).update(payload).digest('base64url');
 const city=(await pool.query(`SELECT app.city_id,app.city_name FROM cities app JOIN reporting_cities city ON city.operational_city_id=app.city_id WHERE LOWER(app.city_name)='faisalabad' LIMIT 1`)).rows[0];assert.ok(city);
 const month=(await pool.query(`SELECT TO_CHAR(MAX(r.report_month),'YYYY-MM') AS month FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id=$1`,[city.city_id])).rows[0].month;assert.ok(month);
 for(const channel of ['all','branch']){
  const source=(await pool.query(`SELECT r.collection_channel AS channel,r.box_count FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id=$1 AND TO_CHAR(r.report_month,'YYYY-MM')=$2 AND ($3='all' OR r.collection_channel=$3) ORDER BY r.collection_channel`,[city.city_id,month,channel])).rows;
  const query=new URLSearchParams({year:month.slice(0,4),city:city.city_id,month,channel});
  const response=await fetch(`${base}/dashboard/inventory?${query}`,{headers:{Cookie:'saylani_admin_session='+token},signal:AbortSignal.timeout(90000)});assert.equal(response.status,200);
  const dom=new JSDOM(await response.text());
  try{
   const panel=dom.window.document.querySelector('[aria-label="Reported box inventory"]');assert.ok(panel,'Source inventory panel must render');
   const rows=[...panel.querySelectorAll('tbody tr')];assert.equal(rows.length,source.length);
   for(const row of rows){const cells=[...row.querySelectorAll('td')].map(cell=>cell.textContent.trim());assert.equal(cells[1],city.city_name);assert.equal(cells[2],month);const original=source.find(item=>item.channel===cells[3]);assert.ok(original);assert.equal(original.box_count===null?cells[4]:Number(cells[4].replace(/,/g,'')),original.box_count===null?'—':Number(original.box_count));}
   const total=source.reduce((sum,row)=>sum+(row.box_count??0),0);assert.ok(panel.textContent.includes(total.toLocaleString('en-PK')));
   console.log(`PASS ${city.city_name} ${month} ${channel}: ${source.length} source rows and ${total.toLocaleString('en-PK')} reported boxes match the database; city/month/channel retained`);
  }finally{dom.window.close();}
 }
 const actors=(await pool.query(`SELECT DISTINCT ON (CASE r.role_key WHEN 'city_admin' THEN 'admin' WHEN 'branch_admin' THEN 'city_manager' ELSE r.role_key END) u.team_id,u.email,u.full_name,u.city_id,r.role_key,c.city_name FROM team_members u JOIN roles r USING(role_id) JOIN cities c USING(city_id) WHERE r.role_key IN ('admin','city_admin','city_manager','branch_admin') AND u.account_status='active' AND u.deleted_at IS NULL AND EXISTS(SELECT 1 FROM monthly_collection_reports report JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id=u.city_id)`)).rows;
 for(const actor of actors){
  const role=['admin','city_admin'].includes(actor.role_key)?'admin':'city_manager';
  const ownMonth=(await pool.query(`SELECT TO_CHAR(MAX(r.report_month),'YYYY-MM') AS month FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE city.operational_city_id=$1`,[actor.city_id])).rows[0].month;
  const payload=Buffer.from(JSON.stringify({userId:actor.team_id,email:actor.email,name:actor.full_name,cityId:actor.city_id,role,expiresAt:Math.floor(Date.now()/1000)+600})).toString('base64url');
  const cookie=payload+'.'+createHmac('sha256',process.env.AUTH_SECRET.trim()).update(payload).digest('base64url');
  const foreign=(await pool.query('SELECT city_id FROM cities WHERE city_id<>$1 LIMIT 1',[actor.city_id])).rows[0].city_id;
  const query=new URLSearchParams({city:foreign,year:ownMonth.slice(0,4),month:ownMonth,channel:'all'});
  const path=role==='admin'?'/dashboard/admin/inventory':'/dashboard/manager/inventory';
  const response=await fetch(base+path+'?'+query,{headers:{Cookie:'saylani_admin_session='+cookie},signal:AbortSignal.timeout(90000)});assert.equal(response.status,200);
  const dom=new JSDOM(await response.text());try{const panel=dom.window.document.querySelector('[aria-label="Reported box inventory"]');assert.ok(panel);const rows=[...panel.querySelectorAll('tbody tr')];assert.ok(rows.length);for(const row of rows)assert.equal(row.querySelectorAll('td')[1]?.textContent,actor.city_name);console.log(`PASS ${role} inventory stays in assigned city despite foreign city parameter`);}finally{dom.window.close();}
 }
}finally{await pool.end();}
