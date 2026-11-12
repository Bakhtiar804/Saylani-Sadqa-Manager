import assert from 'node:assert/strict';
// @ts-expect-error jsdom is a test runtime without optional declarations.
import { JSDOM } from 'jsdom';
import { createJiti } from 'jiti';
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
const React=await import('react');const {act}=React;
const {createRoot}=await import('react-dom/client');
const {AppRouterContext}=await import('next/dist/shared/lib/app-router-context.shared-runtime.js');
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:Refresh}=await jiti.import<typeof import('../components/dashboard/rider-details-refresh')>('../components/dashboard/rider-details-refresh.tsx');
let refreshes=0;let now=10000;let tick=()=>{};let cleared=false;
const originalDateNow=Date.now,originalInterval=window.setInterval,originalClear=window.clearInterval;
Date.now=()=>now;
window.setInterval=((handler:TimerHandler,delay?:number)=>{assert.equal(delay,30000);assert.equal(typeof handler,'function');tick=()=>{(handler as ()=>void)();};return 7;}) as typeof window.setInterval;
window.clearInterval=((id?:number)=>{assert.equal(id,7);cleared=true;}) as typeof window.clearInterval;
const router={bfcacheId:'fixture',back(){},forward(){},refresh(){refreshes++;},push(){},replace(){},prefetch:async()=>{}};
const root=createRoot(document.getElementById('root')!);
try {
  await act(async()=>root.render(React.createElement(AppRouterContext.Provider,{value:router},React.createElement(Refresh))));
  assert.equal(refreshes,0);
  await act(async()=>window.dispatchEvent(new dom.window.Event('focus')));assert.equal(refreshes,1);
  await act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));assert.equal(refreshes,1);
  now+=30000;await act(async()=>tick());assert.equal(refreshes,2);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
  now+=30000;await act(async()=>tick());assert.equal(refreshes,2);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  await act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));assert.equal(refreshes,3);
  await act(async()=>root.unmount());assert.ok(cleared);
  now+=30000;window.dispatchEvent(new dom.window.Event('focus'));assert.equal(refreshes,3);
  console.log('PASS Rider Details refresh: focus, 30-second updates, duplicate-event throttle, hidden-tab pause and cleanup.');
} finally {Date.now=originalDateNow;window.setInterval=originalInterval;window.clearInterval=originalClear;dom.window.close();}
