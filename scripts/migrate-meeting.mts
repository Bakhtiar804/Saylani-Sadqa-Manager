import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd());
const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:10000});
const client=await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('sadqa-monthly-report-import'))");
  const snapshot=async()=>{
    const result=[];
    for(const table of ['monthly_collection_reports','monthly_expense_reports','monthly_staff_counts']) result.push({table,rows:(await client.query(`SELECT count(*)::text AS records,SUM(${table==='monthly_staff_counts'?'staff_count':'amount_pkr'})::text AS total FROM ${table}`)).rows});
    return result;
  };
  const before=await snapshot();
  await client.query(await fs.readFile('database/migrate_report_uploads.sql','utf8'));
  assert.deepEqual(await snapshot(),before,'Report counts and financial totals must not change during migration');
  await client.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
  console.log(process.argv.includes('--apply')?'Migration applied; report counts and totals preserved.':'Migration dry run passed; transaction rolled back.');
} catch(error) {await client.query('ROLLBACK');throw error;}
finally {client.release();await pool.end();}
