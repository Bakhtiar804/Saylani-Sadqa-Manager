import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const {buildExpenseTrend}=await createJiti(import.meta.url,{tsconfigPaths:true}).import('../lib/expense-trend.ts');
const rows=[{month:'2025-02',expenses:75},{month:'2026-03',expenses:null},{month:'2026-02',expenses:0},{month:'2026-01',expenses:125},{month:'2025-01',expenses:25},{month:'2024-09',expenses:null}];
const monthly=buildExpenseTrend(rows,'2026');assert.deepEqual(monthly.data,[{name:'January',value:125},{name:'February',value:0},{name:'March',value:null}]);assert.equal(monthly.description,'January–March 2026');
const yearly=buildExpenseTrend(rows,'all');assert.deepEqual(yearly.data,[{name:'2024',value:null},{name:'2025',value:100},{name:'2026',value:125}]);assert.equal(yearly.title,'Public expenses by year');assert.equal(yearly.data.reduce((sum,row)=>sum+(row.value??0),0),225);
assert.deepEqual(buildExpenseTrend([],'all').data,[]);assert.deepEqual(buildExpenseTrend([],'2026').data,[]);
console.log('PASS expense month names, year-only aggregation, chronological order, unchanged totals and null/zero/empty states');
