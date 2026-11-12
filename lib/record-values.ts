import type { DataRecord } from './dashboard-types';

export function normalizeRecordRows(rows:Record<string,unknown>[]):DataRecord[] {
  return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
    if(value instanceof Date) return [key,value.toISOString()];
    if(typeof value==='string' && key.endsWith('_pkr')) return [key,Number(value)];
    return [key,value];
  })) as DataRecord);
}
export function recordDateWithinRange(value:unknown,from:string,to:string):boolean {
  const date=typeof value==='string'?value.slice(0,10):'';
  return (!from && !to) || Boolean(date && (!from || date>=from) && (!to || date<=to));
}
