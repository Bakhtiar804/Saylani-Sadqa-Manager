import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { getDatabasePool } from '@/lib/db';
import type { DataRecord } from '@/lib/dashboard-types';

export type MonthlyReportFilters = { year?: string; city?: string; channel?: string };
export type MonthlyReportScope = { cityId: string | null; network: boolean };
export type ReportView = 'overview' | 'collections' | 'expenses' | 'coverage' | 'analytics';

export async function getMonthlyReportOptions(scope: MonthlyReportScope) {
  const pool = getDatabasePool();
  const [cities, years] = await Promise.all([
    pool.query<{ city_id: string; city_name: string; province: string }>(`
      SELECT DISTINCT app.city_id,app.city_name,app.province
      FROM reporting_cities city JOIN cities app ON app.city_id=city.operational_city_id
      WHERE ($1::boolean OR app.city_id=$2) AND EXISTS (
        SELECT 1 FROM monthly_collection_reports r WHERE r.city_id=city.city_id)
      ORDER BY app.city_name`,[scope.network, scope.cityId]),
    pool.query<{ year: string }>(`SELECT DISTINCT EXTRACT(YEAR FROM r.report_month)::int::text AS year
      FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id)
      WHERE ($1::boolean OR city.operational_city_id=$2) ORDER BY year DESC`,[scope.network, scope.cityId]),
  ]);
  return { cities: cities.rows, years: years.rows.map(row=>row.year) };
}

export async function getMonthlyReports(filters: MonthlyReportFilters, scope: MonthlyReportScope) {
  'use cache';
  cacheLife({ stale: 5, revalidate: 10, expire: 60 });
  cacheTag('dashboard-db-records');
  const year = filters.year && /^20\d{2}$/.test(filters.year) ? filters.year : 'all';
  const channel = ['public','branch'].includes(filters.channel || '') ? filters.channel! : 'all';
  const cityId = scope.network ? filters.city || 'all' : scope.cityId;
  // A missing city on a restricted account never widens the query to the network.
  const params = [year, cityId, scope.network, channel];
  const where = `($1='all' OR EXTRACT(YEAR FROM r.report_month)::text=$1)
    AND (($3::boolean AND $2='all') OR city.operational_city_id=$2)`;
  const pool = getDatabasePool();
  const [collections, expenses, staff, source] = await Promise.all([
    pool.query(`SELECT r.report_id::text,TO_CHAR(r.report_month,'YYYY-MM') AS month,
      app.city_id,app.city_name,r.collection_channel AS channel,r.box_count,
      r.amount_pkr::text AS amount_pkr,r.target_pkr::text AS target_pkr,
      r.source_value_state,r.source_city_name,r.source_sheet,r.source_row
      FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id)
      JOIN cities app ON app.city_id=city.operational_city_id
      WHERE ${where} AND ($4='all' OR r.collection_channel=$4)
      ORDER BY r.report_month DESC,app.city_name,r.collection_channel`,params),
    pool.query(`SELECT r.report_id::text,TO_CHAR(r.report_month,'YYYY-MM') AS month,
      app.city_id,app.city_name,r.expense_category,r.amount_pkr::text AS amount_pkr,
      r.source_value_state,r.source_city_name,r.source_sheet,r.source_row
      FROM monthly_expense_reports r JOIN reporting_cities city USING(city_id)
      JOIN cities app ON app.city_id=city.operational_city_id
      WHERE ${where} ORDER BY r.report_month DESC,app.city_name,r.expense_category`,params.slice(0,3)),
    pool.query(`SELECT r.report_id::text,TO_CHAR(r.report_month,'YYYY-MM') AS month,
      app.city_id,app.city_name,r.staff_count,r.source_city_name,r.source_sheet,r.source_row
      FROM monthly_staff_counts r JOIN reporting_cities city USING(city_id)
      JOIN cities app ON app.city_id=city.operational_city_id
      WHERE ${where} ORDER BY r.report_month DESC,app.city_name`,params.slice(0,3)),
    pool.query<{ source_file_name: string; imported_at: Date; reconciliation: unknown }>(
      'SELECT source_file_name,imported_at,reconciliation FROM report_import_batches WHERE $1::boolean OR target_city_id=$2 OR target_city_id IS NULL ORDER BY batch_id DESC LIMIT 1',[scope.network,scope.cityId]),
  ]);
  const normalize = (rows: Record<string, unknown>[]): DataRecord[] => rows.map(row=>Object.fromEntries(
    Object.entries(row).map(([key,value])=>[key,key.endsWith('_pkr') && value!==null ? Number(value) : value])
  )) as DataRecord[];
  const collectionRows = normalize(collections.rows);
  const expenseRows = normalize(expenses.rows);
  const staffRows = normalize(staff.rows);
  const sum = (rows: DataRecord[],key: string) => rows.reduce((total,row)=>total+Number(row[key] ?? 0),0);
  const reportedSum = (rows: DataRecord[],key: string) => rows.some(row=>row[key]!==null && row[key]!==undefined) ? sum(rows,key) : null;
  const latestMonth = collectionRows[0]?.month ? String(collectionRows[0].month) : null;
  const latestBoxes = collectionRows.filter(row=>row.month===latestMonth);
  const latestStaffMonth = staffRows[0]?.month ? String(staffRows[0].month) : null;
  const latestStaff = staffRows.filter(row=>row.month===latestStaffMonth);
  const months = [...new Set([...collectionRows,...expenseRows].map(row=>String(row.month)))].sort();
  const monthly = months.map(month=>{
    const matching = collectionRows.filter(row=>row.month===month);
    return { month, label: month, collections: reportedSum(matching,'amount_pkr'),
      public: sum(matching.filter(row=>row.channel==='public'),'amount_pkr'),
      branch: sum(matching.filter(row=>row.channel==='branch'),'amount_pkr'),
      expenses: reportedSum(expenseRows.filter(row=>row.month===month),'amount_pkr') };
  });
  const cityNames = [...new Set(collectionRows.map(row=>String(row.city_name)))];
  const byCity = cityNames.map(name=>({name,value:reportedSum(collectionRows.filter(row=>row.city_name===name),'amount_pkr')})).sort((a,b)=>(b.value??0)-(a.value??0));
  const categories = [...new Set(expenseRows.map(row=>String(row.expense_category)))].map(name=>({name,value:sum(expenseRows.filter(row=>row.expense_category===name),'amount_pkr')}));
  return { year,channel,cityId,collections: collectionRows,expenses: expenseRows,staff: staffRows,
    latestMonth,latestBoxes,latestStaffMonth,latestStaff,monthly,byCity,categories,
    source: source.rows[0] ? {name:source.rows[0].source_file_name,importedAt:source.rows[0].imported_at.toISOString()} : null,
    totals: { collection: sum(collectionRows,'amount_pkr'),public:sum(collectionRows.filter(row=>row.channel==='public'),'amount_pkr'),
      branch:sum(collectionRows.filter(row=>row.channel==='branch'),'amount_pkr'),expenses:sum(expenseRows,'amount_pkr'),
      cities:cityNames.length,boxes:sum(latestBoxes,'box_count'),staff:sum(latestStaff,'staff_count'),
      missingAmounts:collectionRows.filter(row=>row.amount_pkr===null).length,
      missingExpenses:expenseRows.filter(row=>row.amount_pkr===null).length,
      missingBoxes:latestBoxes.filter(row=>row.box_count===null).length,
      snapshotCities:new Set(latestBoxes.map(row=>row.city_id)).size,
      staffCities:latestStaff.length },
  };
}
