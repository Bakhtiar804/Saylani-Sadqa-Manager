import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createJiti } from 'jiti';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';

const jiti = createJiti(import.meta.url, { jsx: { runtime: 'automatic' }, tsconfigPaths: true });
const { default: RecordExplorer } = await jiti.import('../components/dashboard/record-explorer.tsx');
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const columns = [{ key: 'report_id', label: 'Report ID' }, { key: 'month', label: 'Month' }];
const records = [
  { report_id: 'R10', month: '2026-01' },
  { report_id: 'R2', month: '2026-09' },
  { report_id: 'R1', month: '2025-12' },
];
const props = { title: 'Monthly collections', description: 'Hydration fixture', records, columns, cityKey: '', initialSortKey: 'month' };
const view = (overrides = {}) => React.createElement(AppRouterContext.Provider, { value: router },
  React.createElement(RecordExplorer, { ...props, ...overrides }));
const serverHtml = renderToString(view());
const dom = new JSDOM(`<div id="root">${serverHtml}</div>`, { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { hydrateRoot } = await import('react-dom/client');
const container = document.getElementById('root');
const recoverableErrors = [];
let root;
try {
  await act(async () => {
    root = hydrateRoot(container, view(), { onRecoverableError: error => recoverableErrors.push(error) });
  });
  const arrow = label => [...container.querySelectorAll('thead button')].find(button=>button.textContent.startsWith(label)).querySelector('span').textContent;
  const firstId = () => container.querySelector('tbody tr td').textContent;
  assert.equal(arrow('Report ID'), '↕');
  assert.equal(arrow('Month'), '↓');
  assert.equal(firstId(), 'R2');
  assert.deepEqual(recoverableErrors, [], 'Initial SSR and client render must hydrate without recovery');
  console.log('PASS month default hydrates without text/order mismatches');

  const monthButton = [...container.querySelectorAll('thead button')].find(button=>button.textContent.startsWith('Month'));
  await act(async()=>monthButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.equal(arrow('Month'), '↑');
  assert.equal(firstId(), 'R1');
  console.log('PASS interactive sorting still changes the arrow and row order');

  await act(async()=>root.render(view({ initialSortKey: 'report_id' })));
  assert.equal(arrow('Report ID'), '↓');
  assert.equal(arrow('Month'), '↕');
  assert.equal(firstId(), 'R10');
  console.log('PASS changed sort configuration resets stale interaction state');

  await act(async()=>root.render(view({ initialSortKey: undefined })));
  assert.equal(arrow('Report ID'), '↓');
  assert.equal(firstId(), 'R10');
  assert.deepEqual(recoverableErrors, []);
  console.log('PASS legacy registers retain the first-column default');

  const originalFetch=globalThis.fetch;
  const requestedPages=[];
  let remoteCount=21;
  globalThis.fetch=async(url)=>{
    const page=Number(new URL(url,'http://localhost').searchParams.get('page'));
    requestedPages.push(page);
    return Response.json({records:page<=Math.ceil(remoteCount/10)?[{report_id:`REMOTE-${page}`,month:'2026-09'}]:[],totalRecords:remoteCount});
  };
  const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,60));});
  try {
    await act(async()=>root.render(view({remoteEndpoint:'/api/fixture',totalRecords:21})));
    const next=()=>[...container.querySelectorAll('button')].find(button=>button.textContent==='Next');
    await act(async()=>next().click());await settle();
    assert.equal(firstId(),'REMOTE-2');
    await act(async()=>next().click());await settle();
    assert.equal(firstId(),'REMOTE-3');
    remoteCount=1;
    await act(async()=>root.render(view({remoteEndpoint:'/api/fixture',totalRecords:1,records:[{report_id:'REFRESH',month:'2026-09'}]})));
    await settle();await settle();
    assert.equal(firstId(),'REMOTE-1');
    assert.equal(requestedPages.at(-1),1);
    assert.ok(container.textContent.includes('Page 1 / 1'));
    console.log('PASS server refresh reloads remote records and clamps removed result pages');
  } finally {globalThis.fetch=originalFetch;}
} finally {
  if(root) await act(async()=>root.unmount());
  dom.window.close();
}
