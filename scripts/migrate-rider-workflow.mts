import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set('sslmode', 'verify-full');
const pool = new pg.Pool({ connectionString: url.toString(), connectionTimeoutMillis: 15000 });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const snapshot = async () => (await client.query(`SELECT
    (SELECT count(*) FROM rider_tasks)::text AS tasks,
    count(*)::text AS collections,coalesce(sum(collection_amount_pkr),0)::text AS amount FROM collections`)).rows;
  const before = await snapshot();
  const sql = (await fs.readFile('database/migrate_rider_workflow.sql', 'utf8')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
  await client.query(sql);
  assert.deepEqual(await snapshot(), before, 'Existing tasks, collections and collection totals must be preserved.');
  const stages = (await client.query('SELECT task_id,workflow_stage,workflow_events FROM rider_tasks ORDER BY task_id')).rows;
  await client.query(sql);
  assert.deepEqual((await client.query('SELECT task_id,workflow_stage,workflow_events FROM rider_tasks ORDER BY task_id')).rows, stages);
  assert.deepEqual(await snapshot(), before);
  await client.query('COMMIT');
  console.log('PASS Rider workflow migration: existing tasks, collections and totals preserved; migration repeatable.');
} catch(error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
