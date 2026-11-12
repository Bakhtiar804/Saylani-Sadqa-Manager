import 'server-only';
import { createHash } from 'node:crypto';
import { getDatabasePool } from './db';
import { canonicalCity } from './report-city';
import { canImportReports } from './permissions';
import { ImportValidationError, type ExcelReport, type ParsedReports } from './excel-reports';
import type { UserSession } from './session';

export type UploadPreview = { fingerprint:string;city:string;collections:number;expenses:number;staff:number;excluded:number;missing:number;collectionAmount:number;expenseAmount:number;firstMonth:string;lastMonth:string };
export async function prepareReportUpload(parsed:ParsedReports,session:UserSession,bytes:Buffer) {
  if(!canImportReports(session.role) || !session.cityId) throw new ImportValidationError('A city-assigned operational account is required to import reports.');
  const city=(await getDatabasePool().query<{city_id:string;city_name:string;province:string}>('SELECT city_id,city_name,province FROM cities WHERE city_id=$1',[session.cityId])).rows[0];
  if(!city) throw new ImportValidationError('Your assigned city is not available. Contact your City Admin.');
  const rows=parsed.rows.filter(row=>canonicalCity(row.city)===canonicalCity(city.city_name));
  if(!rows.length) throw new ImportValidationError('This workbook has no records for your assigned city. No data was changed.');
  const fingerprint=createHash('sha256').update(bytes).update(`:${city.city_id}:monthly-v2`).digest('hex');
  const preview:UploadPreview={fingerprint,city:city.city_name,collections:rows.filter(row=>row.kind==='collection').length,
    expenses:rows.filter(row=>row.kind==='expense').length,staff:rows.filter(row=>row.kind==='staff').length,
    excluded:parsed.rows.length-rows.length,missing:rows.filter(row=>row.kind!=='staff' && row.amount===null).length,
    collectionAmount:rows.filter(row=>row.kind==='collection').reduce((sum,row)=>sum+Number(row.amount??0),0),
    expenseAmount:rows.filter(row=>row.kind==='expense').reduce((sum,row)=>sum+Number(row.amount??0),0),
    firstMonth:rows.map(row=>row.month).sort()[0],lastMonth:rows.map(row=>row.month).sort().at(-1)!};
  return {rows,city,preview};
}

export async function applyReportUpload(plan:Awaited<ReturnType<typeof prepareReportUpload>>,session:UserSession,fileName:string) {
  if(!canImportReports(session.role) || session.cityId!==plan.city.city_id) throw new ImportValidationError('Your import permission or city assignment has changed.');
  const client=await getDatabasePool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('sadqa-monthly-report-import'))");
    const existing=await client.query('SELECT batch_id FROM report_import_batches WHERE source_sha256=$1',[plan.preview.fingerprint]);
    if(existing.rowCount) { await client.query('ROLLBACK'); return {alreadyImported:true,preview:plan.preview}; }
    const normalized=canonicalCity(plan.city.city_name);
    const reporting=await client.query<{city_id:string;operational_city_id:string|null}>(`
      SELECT city_id,operational_city_id FROM reporting_cities WHERE normalized_city_name=$1 FOR UPDATE`,[normalized]);
    let reportCityId=reporting.rows[0]?.city_id;
    if(reporting.rows[0]?.operational_city_id && reporting.rows[0].operational_city_id!==session.cityId) throw new ImportValidationError('The reporting city mapping needs administrator attention.');
    if(!reportCityId) reportCityId=(await client.query<{city_id:string}>(`INSERT INTO reporting_cities(city_name,normalized_city_name,province,operational_city_id) VALUES($1,$2,$3,$4) RETURNING city_id`,[plan.city.city_name,normalized,plan.city.province,session.cityId])).rows[0].city_id;
    else await client.query('UPDATE reporting_cities SET operational_city_id=$2 WHERE city_id=$1',[reportCityId,session.cityId]);
    const batch=(await client.query<{batch_id:string}>(`INSERT INTO report_import_batches(source_sha256,source_file_name,reconciliation,actor_team_id,target_city_id) VALUES($1,$2,$3,$4,$5) RETURNING batch_id`,[plan.preview.fingerprint,fileName,JSON.stringify(plan.preview),session.userId,session.cityId])).rows[0].batch_id;
    await client.query(`INSERT INTO report_import_backups(batch_id,previous_rows) SELECT $1,jsonb_build_object(
      'collections',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_collection_reports r WHERE city_id=$2),
      'expenses',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_expense_reports r WHERE city_id=$2),
      'staff',(SELECT COALESCE(jsonb_agg(r),'[]') FROM monthly_staff_counts r WHERE city_id=$2))`,[batch,reportCityId]);
    const specifications: {kind:ExcelReport['kind'];table:string;extra:string[];business:string[]}[]=[
      {kind:'collection',table:'monthly_collection_reports',extra:['collection_channel','box_count','amount_pkr','target_pkr','source_value_state'],business:['city_id','report_month','collection_channel']},
      {kind:'expense',table:'monthly_expense_reports',extra:['expense_category','amount_pkr','source_value_state'],business:['city_id','report_month','expense_category']},
      {kind:'staff',table:'monthly_staff_counts',extra:['staff_count'],business:['city_id','report_month']},
    ];
    const reconciled:Record<string,unknown>={};
    for(const specification of specifications) {
      const rows=plan.rows.filter(row=>row.kind===specification.kind);
      if(!rows.length) continue;
      const payload=rows.map(row=>({city_id:reportCityId,report_month:row.month,source_city_name:row.city,
        source_sheet:row.sheet.toLowerCase(),source_row:row.row,import_batch_id:batch,
        collection_channel:row.channel,box_count:row.boxes,amount_pkr:row.amount,target_pkr:row.target,
        expense_category:row.category,source_value_state:row.valueState,staff_count:row.staff}));
      const fields=['city_id','report_month','source_city_name','source_sheet','source_row','import_batch_id',...specification.extra];
      const updates=fields.filter(field=>!specification.business.includes(field)).map(field=>`${field}=EXCLUDED.${field}`);
      await client.query(`INSERT INTO ${specification.table}(${fields.join(',')}) SELECT ${fields.join(',')} FROM json_populate_recordset(NULL::${specification.table},$1::json)
        ON CONFLICT(${specification.business.join(',')}) DO UPDATE SET ${updates.join(',')},imported_at=CURRENT_TIMESTAMP`,[JSON.stringify(payload)]);
      const value=specification.kind==='staff'?'staff_count':'amount_pkr';
      const check=(await client.query<{rows:number;missing:number;total:string}>(`SELECT COUNT(*)::int AS rows,COUNT(*) FILTER(WHERE ${value} IS NULL)::int AS missing,COALESCE(SUM(${value}),0)::text AS total FROM ${specification.table} WHERE import_batch_id=$1`,[batch])).rows[0];
      const expected=rows.reduce((sum,row)=>sum+Number(specification.kind==='staff'?row.staff??0:row.amount??0),0);
      if(check.rows!==rows.length || Math.abs(Number(check.total)-expected)>0.0001) throw new Error('The imported records did not reconcile. The import has been rolled back.');
      reconciled[specification.table]=check;
    }
    await client.query(`INSERT INTO report_source_rows(batch_id,source_sheet,source_row,cached_values,formulas)
      SELECT $2,r.sheet,r.row,r.raw,'{}'::jsonb FROM json_to_recordset($1::json) AS r(sheet text,row int,raw jsonb)`,[JSON.stringify(plan.rows),batch]);
    await client.query('UPDATE report_import_batches SET reconciliation=$2 WHERE batch_id=$1',[batch,JSON.stringify({tables:reconciled,scope:plan.preview,sourceSheets:[...new Set(plan.rows.map(row=>row.sheet))]})]);
    await client.query('COMMIT');
    return {alreadyImported:false,preview:plan.preview};
  } catch(error) { await client.query('ROLLBACK').catch(()=>undefined);throw error; }
  finally {client.release();}
}
