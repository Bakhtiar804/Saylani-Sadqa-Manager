import assert from 'node:assert/strict';
// @ts-expect-error jsdom is a test runtime; its optional declarations are not installed.
import { JSDOM } from 'jsdom';
import { createJiti } from 'jiti';
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
const React=await import('react');const {act}=React;
const {renderToString}=await import('react-dom/server');const {hydrateRoot}=await import('react-dom/client');
const {AppRouterContext}=await import('next/dist/shared/lib/app-router-context.shared-runtime.js');
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:Notifications}=await jiti.import<typeof import('../components/dashboard/rider-notifications')>('../components/dashboard/rider-notifications.tsx');
const router={bfcacheId:'fixture',back(){},forward(){},refresh(){},push(){},replace(){},prefetch:async()=>{}};
const view=()=>React.createElement(AppRouterContext.Provider,{value:router},React.createElement(Notifications));
const container=document.getElementById('root')!;container.innerHTML=renderToString(view());
let read=false;let taskId='TASK-1';let networkError=false;
const calls:{method:string;body:unknown}[]=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(_url,options)=>{
  if(networkError)throw new TypeError('Fixture network error');
  const method=options?.method||'GET';calls.push({method,body:options?.body?JSON.parse(String(options.body)):undefined});
  if(method==='PATCH'){read=true;return Response.json({ok:true});}
  return Response.json({notifications:[{taskId,taskType:'Scheduled Collection',taskDate:'2026-11-12',boxId:'BOX-1',area:'Gulshan',read}],unreadCount:read?0:1});
};
let root:ReturnType<typeof hydrateRoot>;const errors:unknown[]=[];
const bell=()=>container.querySelector('button[aria-controls]') as HTMLButtonElement;
try {
  await act(async()=>{root=hydrateRoot(container,view(),{onRecoverableError:error=>errors.push(error)});});
  assert.ok(bell().getAttribute('aria-label')?.includes('1 unread'));
  assert.equal(container.querySelector('section'),null);
  await act(async()=>bell().click());
  assert.equal(bell().getAttribute('aria-expanded'),'true');assert.equal(read,true);
  assert.deepEqual(calls.find(call=>call.method==='PATCH')?.body,{taskIds:['TASK-1']});
  assert.equal(container.querySelector('a[href="/dashboard/rider/tasks#task-TASK-1"]')?.textContent?.includes('BOX-1'),true);
  assert.equal(bell().getAttribute('aria-label'),'Task notifications');
  await act(async()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(bell().getAttribute('aria-expanded'),'false');
  read=false;taskId='TASK-2';
  await act(async()=>window.dispatchEvent(new dom.window.Event('focus')));
  assert.ok(bell().getAttribute('aria-label')?.includes('1 unread'),'New assignments must update the badge without navigation');
  networkError=true;await act(async()=>bell().click());
  assert.ok(container.querySelector('[role=alert]')?.textContent?.includes('Unable to reach the server'));
  networkError=false;await act(async()=>{(container.querySelector('[role=alert] button') as HTMLButtonElement).click();});
  assert.equal(container.querySelector('[role=alert]'),null);assert.equal(read,true);
  assert.deepEqual(errors,[]);
  console.log('PASS notification hydration, unread badge, popup, task link, persisted read request, Escape, new-task refresh and network retry.');
} finally{await act(async()=>root?.unmount());globalThis.fetch=originalFetch;dom.window.close();}
