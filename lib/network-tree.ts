import 'server-only';
import { getDatabasePool } from './db';
import type { MonthlyReportScope } from './monthly-reports';

export type NetworkBox = { id: string; qr: string; status: string; location: string; rider: string | null };
export type NetworkArea = { name: string; boxes: NetworkBox[] };
export type NetworkReport = {channel:string;amount:number|null;boxes:number|null;records:number};
export type NetworkCity = { id: string; name: string; reportedBoxes: number | null; month: string | null; registeredBoxes: number; reports?:NetworkReport[]; reportedCollection?:number|null; reportingYear?:string; areas: NetworkArea[] };

export async function getNetworkTree(scope: MonthlyReportScope, snapshot: { cityId: string | null; month: string | null; channel: string;year?:string }) {
  const cityId = scope.network ? snapshot.cityId || 'all' : scope.cityId;
  const parameters = [scope.network, cityId];
  const [cityRows, boxRows, reportedRows] = await Promise.all([
    getDatabasePool().query<{city_id:string;city_name:string}>(`SELECT city_id,city_name FROM cities WHERE ($1::boolean AND $2='all') OR city_id=$2 ORDER BY city_name`,parameters),
    getDatabasePool().query<{box_id:string;qr_code:string;box_status:string;location_description:string;city_id:string;area:string;rider_name:string|null}>(`
      SELECT box.box_id,box.qr_code,box.box_status,box.location_description,box.city_id,box.area,person.full_name AS rider_name
      FROM donation_boxes box LEFT JOIN riders rider ON rider.rider_id=box.assigned_rider_id
      LEFT JOIN team_members person ON person.team_id=rider.team_id
      WHERE ($1::boolean AND $2='all') OR box.city_id=$2 ORDER BY box.area,box.box_id`,parameters),
    getDatabasePool().query<{city_id:string;channel:string;boxes:number|null;amount:string|null;records:number}>(`SELECT city.operational_city_id AS city_id,r.collection_channel AS channel,
      SUM(r.box_count) FILTER(WHERE TO_CHAR(r.report_month,'YYYY-MM')=$3)::int AS boxes,
      SUM(r.amount_pkr)::text AS amount,COUNT(*)::int AS records
      FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id)
      WHERE (($1::boolean AND $2='all') OR city.operational_city_id=$2)
        AND ($5='all' OR EXTRACT(YEAR FROM r.report_month)::text=$5) AND ($4='all' OR r.collection_channel=$4)
      GROUP BY city.operational_city_id,r.collection_channel ORDER BY r.collection_channel`,[...parameters,snapshot.month,snapshot.channel,snapshot.year||'all']),
  ]);
  return cityRows.rows.map((city):NetworkCity=>{
    const boxes = boxRows.rows.filter(box=>box.city_id===city.city_id);
    const reports=reportedRows.rows.filter(row=>row.city_id===city.city_id).map(row=>({channel:row.channel,amount:row.amount===null?null:Number(row.amount),boxes:row.boxes,records:row.records}));
    const reportedBoxes=reports.some(row=>row.boxes!==null)?reports.reduce((sum,row)=>sum+(row.boxes??0),0):null;
    const reportedCollection=reports.some(row=>row.amount!==null)?reports.reduce((sum,row)=>sum+(row.amount??0),0):null;
    const areas = [...new Set(boxes.map(box=>box.area?.trim() || 'Area not supplied'))].map(name=>({name,boxes:boxes.filter(box=>(box.area?.trim() || 'Area not supplied')===name).map(box=>({id:box.box_id,qr:box.qr_code,status:box.box_status,location:box.location_description,rider:box.rider_name}))}));
    return {id:city.city_id,name:city.city_name,reportedBoxes,reportedCollection,reports,reportingYear:snapshot.year||'all',month:snapshot.month,registeredBoxes:boxes.length,areas};
  }).filter(city=>city.reports!.length>0 || city.reportedBoxes!==null || city.registeredBoxes>0 || !scope.network);
}
