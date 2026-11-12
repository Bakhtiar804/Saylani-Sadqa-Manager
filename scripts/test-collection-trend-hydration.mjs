import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
const {CollectionTrendChart}=await createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true,nativeModules:['recharts']}).import('../components/dashboard/charts.tsx');
const data=Array.from({length:9},(_,index)=>({label:`2026-${String(index+1).padStart(2,'0')}`,collections:index===1?null:100*(index+1)}));
const view=(points=data)=>React.createElement(CollectionTrendChart,{data:points,height:280});
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,top:0,left:0,right:400,bottom:280,width:400,height:280,toJSON(){return {};}});
class ResizeObserverStub{observe(){}unobserve(){}disconnect(){}}
globalThis.ResizeObserver=ResizeObserverStub;dom.window.ResizeObserver=ResizeObserverStub;
const {hydrateRoot}=await import('react-dom/client');
const errors=[],warnings=[];const originalError=console.error;console.error=(...args)=>warnings.push(args.map(String).join(' '));let root;
try{
 const plot=document.querySelector('.collection-trend-plot');const serverStyle=plot.getAttribute('style');
 assert.equal(plot.style.minWidth,'');assert.equal(plot.style.getPropertyValue('--collection-period-count'),'9');
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error.message)});});
 assert.equal(document.querySelector('.collection-trend-plot').getAttribute('style'),serverStyle);assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 await act(async()=>root.render(view([...data,{label:'2025-01',collections:100}])));
 assert.equal(document.querySelector('.collection-trend-plot').getAttribute('data-multiple-years'),'true');assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 console.log('PASS trend SSR/client attributes match without inline width arithmetic; multi-year updates remain interactive with no hydration warnings');
}finally{if(root)await act(async()=>root.unmount());console.error=originalError;dom.window.close();}
