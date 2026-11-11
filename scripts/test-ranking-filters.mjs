import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:RankingFilters}=await jiti.import('../components/dashboard/ranking-filters.tsx');
const requests=[];const router={back(){},forward(){},refresh(){},push(url,options){requests.push({url,options});},replace(){},prefetch(){}};
const cities=[{city_id:'C001',city_name:'Karachi'},{city_id:'C002',city_name:'Lahore'}];
const props={path:'/dashboard/leaderboard',cities,cityId:'all',year:'2026',years:['2026','2025']};
const view=(overrides={})=>React.createElement(AppRouterContext.Provider,{value:router},React.createElement(RankingFilters,{...props,...overrides}));
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/dashboard/leaderboard'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;globalThis.FormData=dom.window.FormData;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {hydrateRoot}=await import('react-dom/client');let root;const errors=[];
async function select(name,value){await act(async()=>{const select=document.querySelector(`[name="${name}"]`);select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});}
try {
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error)});});
 await select('city','C001');assert.equal(requests.at(-1).url,'/dashboard/leaderboard?city=C001&year=2026');
 await select('city','C002');assert.equal(requests.at(-1).url,'/dashboard/leaderboard?city=C002&year=2026');
 await select('year','2025');assert.equal(requests.at(-1).url,'/dashboard/leaderboard?city=C002&year=2025');
 assert.deepEqual(requests.at(-1).options,{scroll:false});
 await act(async()=>root.render(view({cityId:'C001',year:'2026'})));
 assert.equal(document.querySelector('[name="city"]').value,'C001');assert.equal(document.querySelector('[name="year"]').value,'2026');
 await act(async()=>root.render(view({path:'/dashboard/admin/leaderboard',cities:undefined,cityId:'C001'})));
 await select('year','2025');assert.equal(requests.at(-1).url,'/dashboard/admin/leaderboard?year=2025');
 assert.deepEqual(errors,[]);
 console.log('PASS immediate city/year navigation without Apply, city switching, URL restoration, city-scoped filters and hydration');
}finally{if(root)await act(async()=>root.unmount());dom.window.close();}
