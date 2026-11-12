import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import nextEnv from '@next/env';
import ExcelJS from 'exceljs';
import pg from 'pg';
import {createJiti} from 'jiti';
nextEnv.loadEnvConfig(process.cwd());
const source=process.argv[2];assert.ok(source,'Pass the original workbook path');
const bytes=await fs.readFile(source);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
const value=cell=>cell.value&&typeof cell.value==='object'&&('formula' in cell.value||'sharedFormula' in cell.value)?cell.value.result:cell.value;
const excel=[];
for(const sheet of workbook.worksheets){const key=sheet.name.toLowerCase().replace(/[^a-z]/g,'');if(!['publiccollection','branchcollection'].includes(key))continue;const headers={};sheet.getRow(1).eachCell((cell,col)=>{headers[String(value(cell)).trim().toLowerCase()]=col;});
 for(let rowNo=2;rowNo<=sheet.rowCount;rowNo++){const row=sheet.getRow(rowNo);if(String(value(row.getCell(headers.city))||'').trim().toLowerCase()!=='faisalabad')continue;const date=value(row.getCell(headers.date));assert.ok(date instanceof Date);if(date.getUTCFullYear()!==2026)continue;const cash=row.getCell(headers.cash),boxes=row.getCell(headers.boxes);excel.push({month:date.toISOString().slice(0,7),channel:key==='publiccollection'?'public':'branch',amount:value(cash),boxes:value(boxes),sheet:sheet.name,row:rowNo,cashCell:cash.address,boxesCell:boxes.address});}
}
assert.ok(excel.length>0);
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('sslmode','verify-full');const pool=new pg.Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:15000});
try{
 const db=(await pool.query(`SELECT TO_CHAR(r.report_month,'YYYY-MM') AS month,r.collection_channel AS channel,r.amount_pkr::text AS amount,r.box_count AS boxes,r.source_sheet AS sheet,r.source_row AS row,r.import_batch_id FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id) WHERE LOWER(city.city_name)='faisalabad' AND r.report_month>='2026-01-01' AND r.report_month<'2027-01-01' ORDER BY r.collection_channel,r.report_month`)).rows;
 assert.equal(db.length,excel.length,'Database and original workbook must have the same city/month/channel rows');
 for(const row of excel){const stored=db.find(item=>item.channel===row.channel&&item.month===row.month);assert.ok(stored);assert.equal(Number(stored.amount),row.amount,`Cash ${row.sheet}!${row.cashCell}`);assert.equal(stored.boxes,row.boxes,`Boxes ${row.sheet}!${row.boxesCell}`);assert.equal(stored.sheet.toLowerCase(),row.sheet.toLowerCase());assert.equal(stored.row,row.row);}
 const require=createRequire(import.meta.url);globalThis.saylaniDatabasePool=pool;
 const {getNetworkTree}=await createJiti(import.meta.url,{alias:{'server-only':require.resolve('server-only')},nativeModules:['pg'],tsconfigPaths:true,fsCache:false}).import('../lib/network-tree.ts');
 const cityId=(await pool.query("SELECT operational_city_id FROM reporting_cities WHERE LOWER(city_name)='faisalabad'")).rows[0].operational_city_id;
 const tree=(await getNetworkTree({network:true,cityId:null},{cityId,month:'2026-09',channel:'all',year:'2026'}))[0];assert.ok(tree);
 const summary=['branch','public'].map(channel=>{const rows=excel.filter(row=>row.channel===channel).sort((a,b)=>a.month.localeCompare(b.month));const total=rows.reduce((sum,row)=>sum+row.amount,0);const latest=rows.find(row=>row.month==='2026-09');assert.ok(latest);const node=tree.reports.find(report=>report.channel===channel);assert.equal(node.amount,total);assert.equal(node.boxes,latest.boxes);assert.equal(node.records,rows.length);return {channel,collection:total,rows:rows.length,firstMonth:rows[0].month,lastMonth:rows.at(-1).month,reportedBoxes:latest.boxes,sheet:latest.sheet,boxCell:latest.boxesCell,cashCells:rows.map(row=>row.cashCell)};});
 assert.equal(tree.reportedCollection,summary.reduce((sum,row)=>sum+row.collection,0));assert.equal(tree.reportedBoxes,summary.reduce((sum,row)=>sum+row.reportedBoxes,0));assert.equal(tree.reportedBoxes,8878);
 const batches=(await pool.query('SELECT source_file_name,source_sha256 FROM report_import_batches WHERE batch_id=ANY($1::bigint[])',[[...new Set(db.map(row=>row.import_batch_id))]])).rows;
 const sha=createHash('sha256').update(bytes).digest('hex');
 const money=number=>number.toLocaleString('en-PK');
 const lines=['# Faisalabad tree data verification','', 'Verified 11 November 2026 against the original workbook and the configured PostgreSQL database. All queries were read-only; no data was changed.','',`Workbook: ${source}`,`Workbook SHA-256: ${sha}`,'',`Result: all ${excel.length} Faisalabad 2026 collection rows match the original workbook, including amount, box count, source sheet and source row. The actual getNetworkTree database function returns the same figures.`,'','| Channel | Collection, available 2026 months | Months | September 2026 reported boxes | Excel box-count cell |','| --- | ---: | --- | ---: | --- |',...summary.map(row=>`| ${row.channel} | PKR ${money(row.collection)} | ${row.firstMonth} to ${row.lastMonth} (${row.rows} rows) | ${money(row.reportedBoxes)} | ${row.sheet}!${row.boxCell} |`),`| Total | PKR ${money(tree.reportedCollection)} | Jan–Sep 2026 | ${money(tree.reportedBoxes)} | Sum of both channels |`,'','Collection amounts are sums of the available January–September 2026 monthly Cash cells. Reported box counts are the September snapshot, not a sum across months. The graph rounds collection amounts to millions; its reported counts are monthly aggregates, not individual box IDs.','','## Exact source rows','', '| Month | Channel | Cash (PKR) | Boxes | Excel Cash cell | Excel Boxes cell | Database match |','| --- | --- | ---: | ---: | --- | --- | --- |',...excel.sort((a,b)=>a.month.localeCompare(b.month)||a.channel.localeCompare(b.channel)).map(row=>`| ${row.month} | ${row.channel} | ${money(row.amount)} | ${money(row.boxes)} | ${row.sheet}!${row.cashCell} | ${row.sheet}!${row.boxesCell} | PASS |`),'','## Import provenance','',...batches.map(batch=>`- ${batch.source_file_name}; original file hash match: ${batch.source_sha256.trim()===sha?'yes':'different import fingerprint; cell/row values independently matched above'}.`),''];
 await fs.writeFile('FAISALABAD_DATA_VERIFICATION.md',lines.join('\n'));
 console.log(JSON.stringify({result:'PASS',matchedRows:excel.length,summary,treeCollection:tree.reportedCollection,treeReportedBoxes:tree.reportedBoxes,originalWorkbookHashMatchesImport:batches.some(batch=>batch.source_sha256.trim()===sha)},null,2));
}finally{globalThis.saylaniDatabasePool=undefined;await pool.end();}
