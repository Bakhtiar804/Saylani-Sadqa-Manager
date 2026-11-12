import ExcelJS from 'exceljs';
import { canonicalCity } from './report-city';

export type ImportKind = 'collection'|'expense'|'staff';
export type ExcelReport = { kind:ImportKind; city:string; month:string; channel:'public'|'branch'|null;
  category:string|null; amount:string|null; boxes:number|null; staff:number|null; target:string|null;
  valueState:'reported'|'missing'|'dash'; sheet:string; row:number; raw:Record<string,unknown> };
export type ParsedReports = { rows:ExcelReport[]; skipped:number; sheets:string[] };
export class ImportValidationError extends Error {}

function checkArchive(bytes:Buffer) {
  let total=0,entries=0;
  for(let offset=0;offset+46<=bytes.length;offset++) {
    if(bytes.readUInt32LE(offset)!==0x02014b50) continue;
    entries++; total+=bytes.readUInt32LE(offset+24);
    offset+=45+bytes.readUInt16LE(offset+28)+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
  }
  if(!entries || entries>1000 || total>50*1024*1024) throw new ImportValidationError('This workbook is invalid or too large when expanded. Use an .xlsx file under 5 MB.');
}
function cellValue(cell:ExcelJS.Cell):unknown {
  const value=cell.value;
  if(value && typeof value==='object' && !(value instanceof Date)) {
    if('formula' in value || 'sharedFormula' in value) {
      if(!('result' in value) || value.result===undefined) throw new ImportValidationError(`${cell.worksheet.name}!${cell.address}: recalculate and save formulas in Excel before importing.`);
      return value.result;
    }
    if('richText' in value) return value.richText.map(part=>part.text).join('');
    if('error' in value) throw new ImportValidationError(`${cell.worksheet.name}!${cell.address}: fix the Excel cell error before importing.`);
    if('text' in value) return value.text;
  }
  return value;
}
function amount(value:unknown,where:string):string|null {
  if(value===null || value===undefined || value==='' || value==='-') return null;
  if(typeof value!=='number' || !Number.isFinite(value) || Math.abs(value)>=1e14) throw new ImportValidationError(`${where}: enter a numeric amount; blanks and dashes are allowed.`);
  return String(value);
}
function count(value:unknown,where:string):number|null {
  if(value===null || value===undefined || value==='' || value==='-') return null;
  if(typeof value!=='number' || !Number.isInteger(value) || value<0 || value>2147483647) throw new ImportValidationError(`${where}: counts must be non-negative whole numbers.`);
  return value;
}
const headerKey=(value:unknown)=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');

export async function parseExcelReports(bytes:Buffer):Promise<ParsedReports> {
  if(bytes.length>5*1024*1024) throw new ImportValidationError('Choose an .xlsx workbook smaller than 5 MB.');
  checkArchive(bytes);
  const workbook=new ExcelJS.Workbook();
  try { await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer); }
  catch { throw new ImportValidationError('The file could not be read. Upload a valid, unencrypted .xlsx workbook.'); }
  const rows:ExcelReport[]=[]; const keys=new Set<string>(); let skipped=0; const sheets:string[]=[];
  for(const sheet of workbook.worksheets) {
    const key=headerKey(sheet.name);
    if(!['publiccollection','branchcollection','publicexpense','publicstaff'].includes(key)) continue;
    if(sheet.rowCount>15000 || sheet.columnCount>100) throw new ImportValidationError(`${sheet.name}: the sheet exceeds the supported import size.`);
    sheets.push(sheet.name);
    const headers=new Map<string,number>(); sheet.getRow(1).eachCell((cell,index)=>headers.set(headerKey(cellValue(cell)),index));
    const required=key==='publicstaff'?['date','city','staffcount']:key==='publicexpense'?['date','city','expensetype','amount']:['date','city','boxes','cash'];
    for(const field of required) if(!headers.has(field)) throw new ImportValidationError(`${sheet.name}: missing ${field} column.`);
    for(let rowNumber=2;rowNumber<=sheet.rowCount;rowNumber++) {
      const row=sheet.getRow(rowNumber); if(!row.hasValues) continue;
      const get=(header:string)=>headers.has(header)?cellValue(row.getCell(headers.get(header)!)):null;
      const date=get('date'); const city=String(get('city')??'').trim();
      if((date===null || date==='') && !city) { skipped++;continue; }
      if(!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getUTCDate()!==1 || !city) throw new ImportValidationError(`${sheet.name} row ${rowNumber}: use a valid first-of-month date and city.`);
      if(get('year')!==null && Number(get('year'))!==date.getUTCFullYear()) throw new ImportValidationError(`${sheet.name} row ${rowNumber}: Year does not match Date.`);
      if(get('monthno')!==null && Number(get('monthno'))!==date.getUTCMonth()+1) throw new ImportValidationError(`${sheet.name} row ${rowNumber}: MonthNo does not match Date.`);
      const kind:ImportKind=key==='publicstaff'?'staff':key==='publicexpense'?'expense':'collection';
      const channel=kind==='collection'?(key==='branchcollection'?'branch':'public'):null;
      const category=kind==='expense'?String(get('expensetype')??'').trim().toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase()):null;
      if(kind==='expense' && !category) throw new ImportValidationError(`${sheet.name} row ${rowNumber}: expense category is required.`);
      const where=`${sheet.name} row ${rowNumber}`; const rawAmount=get(kind==='expense'?'amount':'cash');
      const month=date.toISOString().slice(0,10);
      const duplicateKey=[kind,canonicalCity(city),month,channel,category?.toLowerCase()].join(':');
      if(keys.has(duplicateKey)) throw new ImportValidationError(`${where}: duplicate city/month/channel or category.`);
      keys.add(duplicateKey);
      const raw:Record<string,unknown>={}; row.eachCell((cell)=>{const value=cellValue(cell);raw[cell.address]=value instanceof Date?value.toISOString():value;});
      rows.push({kind,city,month,channel,category,amount:kind==='staff'?null:amount(rawAmount,where),
        boxes:kind==='collection'?count(get('boxes'),where):null,staff:kind==='staff'?count(get('staffcount'),where):null,
        target:headers.has('target')?amount(get('target'),where):null,
        valueState:rawAmount==='-'?'dash':rawAmount===null || rawAmount===undefined || rawAmount===''?'missing':'reported',sheet:sheet.name,row:rowNumber,raw});
    }
  }
  if(!sheets.length || !rows.length) throw new ImportValidationError('No monthly records found. Use Public_Collection, Branch_Collection, Public_Expense or Public_Staff sheets.');
  return {rows,skipped,sheets};
}
