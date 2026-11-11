import 'server-only';
import {getMonthlyReportOptions,getMonthlyReports,type MonthlyReportFilters,type MonthlyReportScope} from './monthly-reports';
export type InventoryFilters=MonthlyReportFilters&{month?:string};
export async function getInventoryReports(filters:InventoryFilters,scope:MonthlyReportScope){
 const options=await getMonthlyReportOptions(scope);
 const data=await getMonthlyReports({year:typeof filters.year==='string'?filters.year:options.years[0]||'all',city:typeof filters.city==='string'?filters.city:'all',channel:typeof filters.channel==='string'?filters.channel:'all'},scope);
 const month=typeof filters.month==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(filters.month)&&(data.year==='all'||filters.month.startsWith(data.year+'-'))?filters.month:data.latestMonth;
 const latestBoxes=data.collections.filter(row=>row.month===month);
 return {data:{...data,latestMonth:month,latestBoxes},options};
}
