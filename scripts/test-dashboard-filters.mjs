import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:AutoFilterForm}=await jiti.import('../components/dashboard/auto-filter-form.tsx');
const requests=[];const router={back(){},forward(){},refresh(){},push(url,options){requests.push({url,options});},replace(){},prefetch(){}};
const options=(values)=>values.map(value=>React.createElement('option',{key:value,value},value));
const view=(overrides={})=>{const props={path:'/dashboard/finance',stateKey:'2026:all:all',...overrides};const fields=props.path==='/dashboard/riders'?[React.createElement('input',{key:'month',name:'month',type:'month',required:true,defaultValue:props.month||'2026-10',min:'2000-01',max:'2099-12'})]:[React.createElement('select',{key:'year',name:'year',defaultValue:props.year||'2026'},options(['all','2026','2025'])),React.createElement('select',{key:'city',name:'city',defaultValue:props.city||'all'},options(['all','C001','C002'])),React.createElement('select',{key:'channel',name:'channel',defaultValue:'all'},options(['all','public','branch']))];return React.createElement(AppRouterContext.Provider,{value:router},React.createElement(AutoFilterForm,{path:props.path,stateKey:props.stateKey},fields));};
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/dashboard/finance'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;globalThis.FormData=dom.window.FormData;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {hydrateRoot}=await import('react-dom/client');let root;const errors=[];
async function change(name,value){await act(async()=>{const input=document.querySelector(`[name="${name}"]`);if(input instanceof dom.window.HTMLInputElement){Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}else{input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}});}
try{
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error)});});
 await change('year','2025');assert.equal(requests.at(-1).url,'/dashboard/finance?year=2025&city=all&channel=all');
 await change('city','C002');await change('channel','public');assert.equal(requests.at(-1).url,'/dashboard/finance?year=2025&city=C002&channel=public');assert.deepEqual(requests.at(-1).options,{scroll:false});
 assert.equal(window.location.href,'http://localhost/dashboard/finance');assert.equal(document.querySelectorAll('button').length,0);
 const submit=new Event('submit',{bubbles:true,cancelable:true});await act(async()=>document.querySelector('form').dispatchEvent(submit));assert.ok(submit.defaultPrevented);
 await act(async()=>root.render(view({stateKey:'2026:C001:all',year:'2026',city:'C001'})));assert.equal(document.querySelector('[name="year"]').value,'2026');assert.equal(document.querySelector('[name="city"]').value,'C001');
 await act(async()=>root.render(view({path:'/dashboard/riders',stateKey:'month:2026-10'})));await change('month','2026-09');assert.equal(requests.at(-1).url,'/dashboard/riders?month=2026-09');
 const count=requests.length;await change('month','1900-02');assert.equal(requests.length,count);await change('month','');assert.equal(requests.length,count);
 assert.deepEqual(errors,[]);console.log('PASS automatic combined filters, no document navigation, prevented native submit, URL-state restoration, month selection, validation and hydration');
}finally{if(root)await act(async()=>root.unmount());dom.window.close();}
