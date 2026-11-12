import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),connectionTimeoutMillis:15000});
const client=await pool.connect();
try {
 await client.query('BEGIN');
 const source=(await client.query("SELECT CASE WHEN to_regclass('public.team_members') IS NOT NULL THEN 'team_members' ELSE 'users' END AS name")).rows[0].name;
 assert.ok(['team_members','users'].includes(source));
 const snapshot=async(table)=>({
  accounts:(await client.query(`SELECT * FROM public.${table}`)).rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key==='id'?'team_record_id':key==='user_id'?'team_id':key,value]))).sort((a,b)=>a.team_id.localeCompare(b.team_id)),
  relation:(await client.query('SELECT oid::text,relkind FROM pg_class WHERE oid=to_regclass($1)',[`public.${table}`])).rows,
  references:(await client.query('SELECT conrelid::text,conname,conkey,confkey FROM pg_constraint WHERE contype=$1 AND confrelid=to_regclass($2) ORDER BY conrelid,conname',['f',`public.${table}`])).rows,
  reports:(await client.query('SELECT count(*)::int AS rows,sum(amount_pkr)::text AS amount FROM monthly_collection_reports')).rows,
 });
 const before=await snapshot(source);
 const sql=(await fs.readFile('database/migrate_team_members.sql','utf8')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 await client.query(sql);
 assert.deepEqual(await snapshot('team_members'),before,'Every account field, table identity, foreign key and report total must remain unchanged');
 await client.query(sql); // Reapplying must be safe.
 assert.deepEqual(await snapshot('team_members'),before);
 assert.equal((await client.query("SELECT to_regclass('public.users')::text AS legacy")).rows[0].legacy,null);
 await client.query('COMMIT');
 console.log(`PASS physical team_members table: ${before.accounts.length} complete accounts and ${before.references.length} foreign keys preserved; passwords, stable IDs and report totals unchanged; migration repeatable; no users alias`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
