import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const {BreakdownBarChart}=await createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true,nativeModules:['recharts']}).import('../components/dashboard/charts.tsx');
const months=['January','February','March','April','May','June','July','August','September'];const data=months.map((name,index)=>({name,value:index+1}));
function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;const children=node.props?.children;for(const child of Array.isArray(children)?children:[children]){if(Array.isArray(child)){for(const nested of child){const result=find(nested,predicate);if(result)return result;}}else{const result=find(child,predicate);if(result)return result;}}}
const chart=BreakdownBarChart({data,periodAxis:true,height:260});const axis=find(chart,node=>node.props?.dataKey==='name');assert.equal(axis.props.interval,0);assert.deepEqual(months.map(axis.props.tickFormatter),['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep']);assert.equal(axis.props.tickFormatter('2026'),'2026');
assert.equal(find(chart,node=>node.props?.style?.height===260).props.style.minWidth,388);assert.equal(find(chart,node=>node.props?.data===data).props.data,data);assert.equal(data[1].name,'February');
const regular=BreakdownBarChart({data});assert.equal(find(regular,node=>node.props?.dataKey==='name').props.interval,undefined);
console.log('PASS every period tick is retained, month labels fit, year labels stay numeric, narrow charts scroll, tooltip source names and other charts stay intact');
