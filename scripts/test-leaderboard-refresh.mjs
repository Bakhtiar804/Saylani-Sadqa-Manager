import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:RankingBoard}=await jiti.import('../components/dashboard/ranking-board.tsx');
const {default:LeaderboardRefresh}=await jiti.import('../components/dashboard/leaderboard-refresh.tsx');
let refreshes=0;const router={back(){},forward(){},refresh(){refreshes++;},push(){},replace(){},prefetch(){}};
const view=(entries=[])=>React.createElement(AppRouterContext.Provider,{value:router},React.createElement(React.Fragment,null,React.createElement(LeaderboardRefresh),React.createElement(RankingBoard,{entries,emptyName:'Awaiting partner',label:'Partner collection champions'})));
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/leaderboard'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,userAgent:'jsdom'}});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
let poll;let cleared=false;window.setInterval=(handler,ms)=>{assert.equal(ms,30000);poll=handler;return 1;};window.clearInterval=()=>{cleared=true;};
const {hydrateRoot}=await import('react-dom/client');const errors=[];let root;
try {
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error)});});
 assert.equal(document.querySelectorAll('[data-empty-slot]').length,3);assert.equal(document.querySelectorAll('[aria-label="Full leaderboard"] li').length,3);assert.ok(!document.body.textContent.includes('Rs 0'));
 await act(async()=>poll());assert.equal(refreshes,1);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>poll());assert.equal(refreshes,1);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});navigator.onLine=false;await act(async()=>poll());assert.equal(refreshes,1);
 navigator.onLine=true;await act(async()=>window.dispatchEvent(new Event('online')));assert.equal(refreshes,2);
 await act(async()=>root.render(view([{name:'Company A',value:350,detail:'2 installed boxes'}])));
 assert.equal(document.querySelectorAll('[data-empty-slot]').length,2);assert.equal(document.querySelector('[aria-label="Full leaderboard"] b').textContent,'Company A');assert.ok(document.body.textContent.includes('2 installed boxes'));assert.ok(document.body.textContent.includes('350'));assert.deepEqual(errors,[]);
 console.log('PASS complete empty podium/list, incoming partner data, automatic refresh, hidden/offline guards and hydration');
}finally{if(root)await act(async()=>root.unmount());assert.ok(cleared);dom.window.close();}
