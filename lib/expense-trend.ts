export type ExpenseMonth={month:string;expenses:number|null};
const monthName=(month:string)=>new Intl.DateTimeFormat('en-PK',{month:'long',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));
export function buildExpenseTrend(months:ExpenseMonth[],year:string){
 const ordered=[...months].sort((a,b)=>a.month.localeCompare(b.month));
 if(year==='all'){
  const years=[...new Set(ordered.map(row=>row.month.slice(0,4)))];
  return {title:'Public expenses by year',description:years.length?`${years[0]}–${years.at(-1)} · Available reported amounts`:'No expense reports',data:years.map(name=>{const values=ordered.filter(row=>row.month.startsWith(name+'-')).map(row=>row.expenses).filter((value):value is number=>value!==null);return {name,value:values.length?values.reduce((sum,value)=>sum+value,0):null};})};
 }
 const selected=ordered.filter(row=>row.month.startsWith(year+'-'));
 return {title:'Public expenses by month',description:selected.length?`${monthName(selected[0].month)}–${monthName(selected.at(-1)!.month)} ${year}`:'No expense reports',data:selected.map(row=>({name:monthName(row.month),value:row.expenses}))};
}
