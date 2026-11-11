import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';
import pg from 'pg';

// Dry run by default. No workbook values or credentials are written to the repository.
const args = process.argv.slice(2);
const source = args.find(arg => !arg.startsWith('--'));
if (!source) throw new Error('Usage: node scripts/import-monthly-reports.mjs <workbook.xlsx> [--apply]');
const apply = args.includes('--apply');
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sadqa-reports-'));
const extractedPath = path.join(directory, 'source.json');
const bundledPython = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python = process.env.PYTHON_BIN || (process.platform === 'win32' ? bundledPython : 'python3');
const extraction = spawnSync(python, ['scripts/extract-monthly-reports.py', path.resolve(source), extractedPath], { encoding: 'utf8', windowsHide: true });
if (extraction.status !== 0) throw new Error(extraction.stderr || extraction.error?.message || 'Workbook extraction failed. Set PYTHON_BIN to Python with openpyxl installed.');
const data = JSON.parse(await fs.readFile(extractedPath, 'utf8'));
await fs.rm(extractedPath);
await fs.rmdir(directory);
console.log(extraction.stdout.trim());

nextEnv.loadEnvConfig(process.cwd());
const config = process.env.DATABASE_URL ? (() => {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('sslmode', 'verify-full');
  return { connectionString: url.toString(), enableChannelBinding: url.searchParams.get('channel_binding') !== 'disable' };
})() : { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: true } };
const pool = new pg.Pool({ ...config, max: 1, connectionTimeoutMillis: 10000 });
const client = await pool.connect();
const normalize = value => value.trim().toLowerCase().replace(/\s+/g, ' ');
// Explicit spelling aliases only. Ambiguous names such as Lodrah remain unchanged.
const aliases = new Map([
  ['sukkur city', 'sukkur'], ['umerkot city', 'umerkot'],
  ['tando alahyar', 'tando allahyar'], ['nawab shah', 'nawabshah (shaheed benazirabad)'],
]);
const canonical = value => aliases.get(normalize(value)) || normalize(value);
const tables = [
  ['monthly_collection_reports', data.collections, 'amount_pkr', 'amount'],
  ['monthly_expense_reports', data.expenses, 'amount_pkr', 'amount'],
  ['monthly_staff_counts', data.staff, 'staff_count', 'count'],
];
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('sadqa-monthly-report-import'))");
  await client.query(await fs.readFile('database/migrate_monthly_reports.sql', 'utf8'));
  await client.query(await fs.readFile('database/migrate_report_uploads.sql', 'utf8'));
  const previous = await client.query('SELECT batch_id,reconciliation FROM report_import_batches WHERE source_sha256=$1', [data.sha256]);
  if (previous.rowCount) {
    console.log('Already imported: identical workbook fingerprint. No rows changed.', previous.rows[0].reconciliation);
    await client.query('ROLLBACK');
  } else {
    const batch = await client.query('INSERT INTO report_import_batches(source_sha256,source_file_name,reconciliation) VALUES($1,$2,$3) RETURNING batch_id', [data.sha256, data.fileName, JSON.stringify({ status: 'pending' })]);
    const batchId = batch.rows[0].batch_id;
    await client.query(`INSERT INTO report_import_backups(batch_id,previous_rows)
      SELECT $1,jsonb_build_object('collections',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_collection_reports r),
        'expenses',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_expense_reports r),
        'staff',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_staff_counts r),
        'reportingCities',(SELECT COALESCE(jsonb_agg(r),'[]') FROM reporting_cities r))`, [batchId]);

    const dimensions = new Map(data.cities.map(city => [canonical(city.name), city]));
    const names = new Map(data.cities.map(city => [canonical(city.name), city.name]));
    for (const [, rows] of tables) for (const row of rows) {
      const key = canonical(row.sourceCityName);
      if (!names.has(key)) names.set(key, row.sourceCityName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
    }
    const existingAppCities = (await client.query('SELECT city_id,city_name FROM cities')).rows;
    const cityIds = new Map();
    const activeNames = new Set(tables.flatMap(([,rows]) => rows.map(row => canonical(row.sourceCityName))));
    for (const [key, name] of names) {
      const dim = dimensions.get(key);
      const city = await client.query(`INSERT INTO reporting_cities(city_name,normalized_city_name,province,latitude,longitude)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(normalized_city_name) DO UPDATE
        SET province=COALESCE(EXCLUDED.province,reporting_cities.province),
            latitude=COALESCE(EXCLUDED.latitude,reporting_cities.latitude), longitude=COALESCE(EXCLUDED.longitude,reporting_cities.longitude)
        RETURNING city_id`, [name, key, dim?.province || null, dim?.latitude ?? null, dim?.longitude ?? null]);
      cityIds.set(key, city.rows[0].city_id);
      if (activeNames.has(key)) {
        let appCityId = existingAppCities.find(city => canonical(city.city_name) === key)?.city_id;
        if (!appCityId) {
          appCityId = `R-${createHash('sha256').update(key).digest('hex').slice(0,12)}`;
          await client.query('INSERT INTO cities(city_id,city_name,province) VALUES($1,$2,$3) ON CONFLICT(city_id) DO NOTHING', [appCityId, name, dim?.province || 'Not supplied']);
        }
        await client.query('UPDATE reporting_cities SET operational_city_id=$2 WHERE city_id=$1 OR normalized_city_name=ANY($3::text[])', [city.rows[0].city_id, appCityId, [...aliases].filter(([,target]) => target===key).map(([alias]) => alias)]);
      }
    }
    const reconciliation = { sourceSheets: [...new Set(data.sourceRows.map(r=>r.sheet))], excludedRows: data.excludedRows, tables: {} };
    for (const [table, rows, amountColumn, amountKey] of tables) {
      const mapped = rows.map(row => ({...row, cityId: cityIds.get(canonical(row.sourceCityName))}));
      const incomingKeys = new Set(rows.map(row=>`${row.sourceSheet}:${row.sourceRow}`));
      const oldSlots = (await client.query(`SELECT source_sheet,source_row FROM ${table} WHERE source_sheet=ANY($1::text[])`, [[...new Set(rows.map(row=>row.sourceSheet))]])).rows;
      if(oldSlots.some(row=>!incomingKeys.has(`${row.source_sheet}:${row.source_row}`))) {
        throw new Error(`${table}: replacement workbook omits existing source rows. Review removed rows before replacing this authoritative workbook; no changes were committed.`);
      }
      const common = `city_id,report_month,source_city_name,source_sheet,source_row,import_batch_id`;
      const commonSelect = `r."cityId"::bigint,r.month::date,r."sourceCityName",r."sourceSheet",r."sourceRow",$2::bigint`;
      const commonType = `"cityId" text,month text,"sourceCityName" text,"sourceSheet" text,"sourceRow" int`;
      const extra = table==='monthly_collection_reports'
        ? ['collection_channel,box_count,amount_pkr,target_pkr,source_value_state', `r.channel,r.boxes,r.amount::numeric,r.target::numeric,r."valueState"`, `channel text,boxes int,amount text,target text,"valueState" text`]
        : table==='monthly_expense_reports'
          ? ['expense_category,amount_pkr,source_value_state', `r.category,r.amount::numeric,r."valueState"`, `category text,amount text,"valueState" text`]
          : ['staff_count', 'r.count', 'count int'];
      const columns = `${common},${extra[0]}`;
      const business = table==='monthly_collection_reports' ? ['city_id','report_month','collection_channel'] : table==='monthly_expense_reports' ? ['city_id','report_month','expense_category'] : ['city_id','report_month'];
      const updates = columns.split(',').filter(c=>!business.includes(c)).map(c=>`${c}=EXCLUDED.${c}`).join(',');
      await client.query(`INSERT INTO ${table}(${columns})
        SELECT ${commonSelect},${extra[1]} FROM json_to_recordset($1::json) AS r(${commonType},${extra[2]})
        ON CONFLICT(${business.join(',')}) DO UPDATE SET ${updates},imported_at=CURRENT_TIMESTAMP`, [JSON.stringify(mapped), batchId]);
      // Compare every normalized record, not just a potentially coincidental grand total.
      const saved = (await client.query(`SELECT city_id::text,report_month::text,source_sheet,source_row,${amountColumn}::text AS value,
        ${table==='monthly_collection_reports'?'box_count,collection_channel,target_pkr::text,source_value_state':table==='monthly_expense_reports'?'expense_category,source_value_state':'staff_count'}
        FROM ${table} WHERE import_batch_id=$1`,[batchId])).rows;
      if(saved.length!==rows.length) throw new Error(`${table}: row count mismatch`);
      const savedByRow = new Map(saved.map(row=>[`${row.source_sheet}:${row.source_row}`, row]));
      for(const row of mapped) {
        const found = savedByRow.get(`${row.sourceSheet}:${row.sourceRow}`);
        if(!found || found.city_id!==String(row.cityId) || found.report_month!==row.month ||
          (row[amountKey]===null ? found.value!==null : Math.abs(Number(found.value)-Number(row[amountKey])) > 0.000001) ||
          (table==='monthly_collection_reports' && (found.box_count!==row.boxes || found.collection_channel!==row.channel || (row.target===null ? found.target_pkr!==null : Number(found.target_pkr)!==Number(row.target)))) ||
          (table==='monthly_expense_reports' && found.expense_category!==row.category)) throw new Error(`${table}: source row ${row.sourceRow} did not reconcile`);
      }
      const totals = await client.query(`SELECT COUNT(*)::int AS rows,COUNT(*) FILTER(WHERE ${amountColumn} IS NULL)::int AS missing,
        SUM(${amountColumn})::text AS total FROM ${table} WHERE import_batch_id=$1`,[batchId]);
      reconciliation.tables[table] = totals.rows[0];
    }
    await client.query(`INSERT INTO report_source_rows(batch_id,source_sheet,source_row,cached_values,formulas)
      SELECT $2,r.sheet,r.row,r.values,r.formulas FROM json_to_recordset($1::json) AS r(sheet text,row int,values jsonb,formulas jsonb)`,[JSON.stringify(data.sourceRows),batchId]);
    await client.query('UPDATE report_import_batches SET reconciliation=$2 WHERE batch_id=$1',[batchId, JSON.stringify(reconciliation)]);
    console.log(JSON.stringify(reconciliation,null,2));
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(apply ? 'Import committed and every source record reconciled.' : 'Dry run passed. Transaction rolled back. Use --apply to commit.');
  }
} catch(error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
