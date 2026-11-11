import 'server-only';
import { getDatabasePool } from './db';
import type { MonthlyReportScope } from './monthly-reports';
export async function getDistrictRankings(scope:MonthlyReportScope,requestedCity:string,year:string) {
 const cityId=scope.network?requestedCity:scope.cityId;
 if(!cityId || cityId==='all') return {entries:[],unassignedBoxes:0};
 const result=await getDatabasePool().query<{name:string;value:string;boxes:number}>(`SELECT MIN(TRIM(box.district)) AS name,COALESCE(SUM(c.collection_amount_pkr),0)::text AS value,COUNT(DISTINCT box.box_id)::int AS boxes
 FROM donation_boxes box LEFT JOIN collections c ON c.box_id=box.box_id AND c.city_id=box.city_id AND ($2='all' OR EXTRACT(YEAR FROM c.collection_date)::text=$2)
 WHERE box.city_id=$1 AND NULLIF(TRIM(box.district),'') IS NOT NULL GROUP BY LOWER(TRIM(box.district)) ORDER BY SUM(c.collection_amount_pkr) DESC NULLS LAST,MIN(TRIM(box.district))`,[cityId,year]);
 const missing=await getDatabasePool().query<{count:number}>("SELECT COUNT(*)::int AS count FROM donation_boxes WHERE city_id=$1 AND NULLIF(TRIM(district),'') IS NULL",[cityId]);
 return {entries:result.rows.map(row=>({name:row.name,value:Number(row.value),detail:`${row.boxes} registered boxes`})),unassignedBoxes:missing.rows[0].count};
}
