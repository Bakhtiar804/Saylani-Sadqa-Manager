import 'server-only';
import { getDatabasePool } from './db';
import type { MonthlyReportScope } from './monthly-reports';

export type NetworkBox = { id: string; qr: string; status: string; location: string; rider: string | null };
export type NetworkArea = { name: string; boxes: NetworkBox[] };
export type NetworkCity = { id: string; name: string; reportedBoxes: number | null; month: string | null; registeredBoxes: number; areas: NetworkArea[] };

export async function getNetworkTree(scope: MonthlyReportScope, snapshot: { cityId: string | null; month: string | null; channel: string }) {
  const cityId = scope.network ? snapshot.cityId || 'all' : scope.cityId;
  const parameters = [scope.network, cityId];
  const [cityRows, boxRows, reportedRows] = await Promise.all([
    getDatabasePool().query<{city_id:string;city_name:string}>(`SELECT city_id,city_name FROM cities WHERE ($1::boolean AND $2='all') OR city_id=$2 ORDER BY city_name`,parameters),
    getDatabasePool().query<{box_id:string;qr_code:string;box_status:string;location_description:string;city_id:string;area:string;rider_name:string|null}>(`
      SELECT box.box_id,box.qr_code,box.box_status,box.location_description,box.city_id,box.area,person.full_name AS rider_name
      FROM donation_boxes box LEFT JOIN riders rider ON rider.rider_id=box.assigned_rider_id
      LEFT JOIN users person ON person.user_id=rider.user_id
      WHERE ($1::boolean AND $2='all') OR box.city_id=$2 ORDER BY box.area,box.box_id`,parameters),
    getDatabasePool().query<{city_id:string;boxes:number|null}>(`SELECT city.operational_city_id AS city_id,SUM(r.box_count)::int AS boxes
      FROM monthly_collection_reports r JOIN reporting_cities city USING(city_id)
      WHERE (($1::boolean AND $2='all') OR city.operational_city_id=$2)
        AND TO_CHAR(r.report_month,'YYYY-MM')=$3 AND ($4='all' OR r.collection_channel=$4)
      GROUP BY city.operational_city_id`,[...parameters,snapshot.month,snapshot.channel]),
  ]);
  return cityRows.rows.map((city):NetworkCity=>{
    const boxes = boxRows.rows.filter(box=>box.city_id===city.city_id);
    const reported = reportedRows.rows.find(row=>row.city_id===city.city_id);
    const areas = [...new Set(boxes.map(box=>box.area?.trim() || 'Area not supplied'))].map(name=>({name,boxes:boxes.filter(box=>(box.area?.trim() || 'Area not supplied')===name).map(box=>({id:box.box_id,qr:box.qr_code,status:box.box_status,location:box.location_description,rider:box.rider_name}))}));
    return {id:city.city_id,name:city.city_name,reportedBoxes:reported?.boxes ?? null,month:reported?snapshot.month:null,registeredBoxes:boxes.length,areas};
  }).filter(city=>city.reportedBoxes!==null || city.registeredBoxes>0 || !scope.network);
}
