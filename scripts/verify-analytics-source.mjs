import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';
import {createJiti} from 'jiti';
nextEnv.loadEnvConfig(process.cwd());
const jiti=createJiti(import.meta.url,{tsconfigPaths:true});
const {parseExcelReports}=await jiti.import('../lib/excel-reports.ts');
const {contributionShares}=await jiti.import('../lib/report-analytics.ts');
const parsed=await parseExcelReports(await fs.readFile(process.argv[2]));
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','verify-full');
const pool=new pg.Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:15000});
try {
 for(const [kind,table] of [['collection','monthly_collection_reports'],['expense','monthly_expense_reports']]) {
  const rows=(await pool.query(`SELECT source_sheet,source_row,source_city_name,TO_CHAR(report_month,'YYYY-MM-DD') AS month,amount_pkr::text AS amount FROM ${table}`)).rows;
  const expected=parsed.rows.filter(row=>row.kind===kind);
  assert.equal(rows.length,expected.length,`${kind} row count`);
  for(const source of expected) {
   const stored=rows.find(row=>row.source_sheet.toLowerCase()===source.sheet.toLowerCase()&&row.source_row===source.row);
   assert.ok(stored,`${source.sheet} row ${source.row}`);
   assert.equal(stored.month,source.month);
   assert.equal(stored.source_city_name,source.city);
   assert.equal(stored.amount===null?null:Number(Number(stored.amount).toFixed(2)),source.amount===null?null:Number(Number(source.amount).toFixed(2)));
  }
  console.log(`PASS ${rows.length} ${kind} rows match original Excel: city, month, source location, amount and missing values`);
 }
 const cities=(await pool.query(`SELECT c.city_name AS name,SUM(r.amount_pkr)::float8 AS value FROM monthly_collection_reports r JOIN reporting_cities c USING(city_id) GROUP BY c.city_name`)).rows;
 const shares=contributionShares(cities);
 assert.ok(Math.abs(shares.reduce((sum,row)=>sum+row.value,0)-cities.reduce((sum,row)=>sum+(row.value||0),0))<0.01);
 assert.equal(contributionShares([]).length,0);
 console.log('PASS top-five city shares plus Other cities preserve the full database total; empty selections remain empty');
} finally {await pool.end();}
