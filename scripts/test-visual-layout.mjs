import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:RankingBoard}=await jiti.import('../components/dashboard/ranking-board.tsx');
const {default:NetworkTree}=await jiti.import('../components/dashboard/network-tree.tsx');
const {NetworkCitySelection,SelectedCityInventoryLink}=await jiti.import('../components/dashboard/network-city-selection.tsx');
const {buildNetworkLayout}=await jiti.import('../lib/network-layout.ts');
const {getPublicPartnerLeaderboard}=await jiti.import('../lib/partner-leaderboard.ts');
const partnerData={cities:[],partners:[{partner_id:'P1',partner_name:'Company A'},{partner_id:'P2',partner_name:'Company B'},{partner_id:'P3',partner_name:'Company C'}],donationBoxes:[{box_id:'A1',partner_id:'P1',city_id:'K'},{box_id:'A2',partner_id:'P1',city_id:'L'},{box_id:'B1',partner_id:'P2',city_id:'K'}],collections:[
{box_id:'A1',partner_id:'P1',collection_status:'Verified',collection_amount_pkr:100},
{box_id:'A2',partner_id:'P1',collection_status:'Verified',collection_amount_pkr:200},
{box_id:'A2',partner_id:null,collection_status:'Verified',collection_amount_pkr:50},
{box_id:'B1',partner_id:'P2',collection_status:'Verified',collection_amount_pkr:400},
{box_id:'A1',partner_id:'P2',collection_status:'Verified',collection_amount_pkr:20},
{box_id:'A1',partner_id:'P1',collection_status:'Pending Verification',collection_amount_pkr:900},
{box_id:'UNKNOWN',partner_id:null,collection_status:'Verified',collection_amount_pkr:999}]};
const partners=getPublicPartnerLeaderboard(partnerData);
assert.deepEqual(partners.map(partner=>[partner.partnerName,partner.installedBoxes,partner.verifiedFunds,partner.rank]),[['Company B',1,420,1],['Company A',2,350,2],['Company C',0,0,3]]);
assert.deepEqual(getPublicPartnerLeaderboard({cities:[],partners:[],collections:[],donationBoxes:[]}),[]);
console.log('PASS partner ranking combines boxes across locations/cities, preserves recorded attribution and excludes unpublished/unlinked amounts');
const entries=[{name:'Karachi',value:400},{name:'Lahore',value:300},{name:'Multan',value:200},{name:'Hyderabad',value:100},{name:'Unreported',value:null}];
const ranking=new JSDOM(renderToString(React.createElement(RankingBoard,{entries})));
assert.deepEqual([...ranking.window.document.querySelector('[aria-label="Winners podium"]').querySelectorAll('b')].map(el=>el.textContent),['Lahore','Karachi','Multan']);
assert.equal(ranking.window.document.querySelector('ol li > span').textContent,'01');
assert.equal(ranking.window.document.querySelector('ol b').textContent,'Karachi');
assert.ok(ranking.window.document.body.textContent.includes('1 entries have no reported amount.'));
ranking.window.close();
assert.ok(!renderToString(React.createElement(RankingBoard,{entries:[]})).includes('NaN'));
assert.ok(renderToString(React.createElement(RankingBoard,{entries:[entries[0]]})).includes('Champion'));
console.log('PASS podium order, remaining ranks, missing amounts and one/zero entry states');
const cities=[{id:'K',name:'Karachi',reportedBoxes:15,month:'2026-09',registeredBoxes:2,areas:[{name:'Gulshan',boxes:[{id:'B1',qr:'QR1',status:'Active',location:'Shop 1',rider:'Rider One'}]},{name:'Saddar',boxes:[{id:'B2',qr:'QR2',status:'Damaged',location:'Shop 2',rider:null}]}]},{id:'L',name:'Lahore',reportedBoxes:20,month:'2026-09',registeredBoxes:0,areas:[]}];
const layout=buildNetworkLayout(cities[0],cities[0].areas);assert.equal(layout.nodes.length,5);assert.equal(layout.edges.length,4);
for(const edge of layout.edges){const parent=layout.nodes.find(node=>node.id===edge.from),child=layout.nodes.find(node=>node.id===edge.to);assert.ok(Math.abs(Math.hypot(edge.x1-parent.x,edge.y1-parent.y)-parent.radius)<.001);assert.ok(Math.abs(Math.hypot(edge.x2-child.x,edge.y2-child.y)-child.radius)<.001);}
for(const left of layout.nodes)for(const right of layout.nodes)if(left.id!==right.id&&left.y===right.y)assert.ok(Math.abs(left.x-right.x)>left.radius+right.radius);
const inventoryHref='/dashboard/inventory?year=2026&channel=public&month=2026-09';
const view=()=>React.createElement(NetworkCitySelection,{initialCity:'K'},React.createElement(React.Fragment,null,
 React.createElement(SelectedCityInventoryLink,{href:inventoryHref,className:'inventory-header-link'},'Open box inventory'),
 React.createElement(NetworkTree,{cities,inventoryHref}),
 React.createElement(SelectedCityInventoryLink,{href:inventoryHref,className:'inventory-footer-link'},'Registered box inventory')));
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.self=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {hydrateRoot}=await import('react-dom/client');let root;const errors=[];
try {
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error)});});
 assert.equal(document.querySelector('[aria-label="Selected node details"] h3').textContent,'Karachi');assert.equal(document.querySelectorAll('[data-tree-node="area"]').length,2);assert.equal(document.querySelectorAll('[data-tree-node="box"]').length,2);assert.equal(document.querySelectorAll('[data-tree-edge]').length,4);
 assert.equal(new URL(document.querySelector('[aria-label="Selected node details"] a').href).searchParams.get('city'),'K');
 for(const link of document.querySelectorAll('a'))assert.equal(new URL(link.href).searchParams.get('city'),'K');
 await act(async()=>document.querySelector('[data-node-id="box:B1"]').click());assert.ok(document.querySelector('[aria-label="Selected node details"]').textContent.includes('Rider One'));assert.ok(document.querySelector('[aria-label="Selected node details"]').textContent.includes('QR1'));
 await act(async()=>document.querySelector('[data-node-id="area:Gulshan"]').click());
 const collapse=[...document.querySelectorAll('button')].find(button=>button.textContent==='Collapse boxes');await act(async()=>collapse.click());assert.equal(document.querySelectorAll('[data-tree-node="box"]').length,1);
 const expand=[...document.querySelectorAll('button')].find(button=>button.textContent==='Expand boxes');await act(async()=>expand.click());assert.equal(document.querySelectorAll('[data-tree-node="box"]').length,2);
 await act(async()=>document.querySelector('[aria-label="Zoom in tree"]').click());assert.ok(document.body.textContent.includes('115%'));
 const diagram=document.querySelector('[aria-label="Karachi tree diagram, scroll to explore"]');Object.defineProperty(diagram,'clientWidth',{configurable:true,value:400});await act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Fit tree').click());assert.ok(document.body.textContent.includes(String(Math.round((400-48)/layout.width*100))+'%'));
 const cityButtons=[...document.querySelector('[aria-label="Choose city"]').querySelectorAll('button')];await act(async()=>cityButtons[1].click());
 assert.equal(document.querySelector('[aria-label="Selected node details"] h3').textContent,'Lahore');assert.equal(document.querySelectorAll('[data-tree-node="box"]').length,0);assert.ok(document.body.textContent.includes('Area details not supplied'));
 assert.equal(new URL(document.querySelector('[aria-label="Selected node details"] a').href).searchParams.get('city'),'L');
 for(const link of document.querySelectorAll('a')){const params=new URL(link.href).searchParams;assert.equal(params.get('city'),'L');assert.equal(params.get('year'),'2026');assert.equal(params.get('channel'),'public');assert.equal(params.get('month'),'2026-09');}
 assert.deepEqual(errors,[]);console.log('PASS circular tree/edges, node details, collapse/expand, zoom, city switching, missing-area state and hydration');
 const reportedCity={id:'F',name:'Faisalabad',reportedBoxes:8878,registeredBoxes:0,month:'2026-09',reportingYear:'2026',reportedCollection:160965499,areas:[],reports:[{channel:'public',amount:150000000,boxes:8000,records:9},{channel:'branch',amount:10965499,boxes:878,records:9}]};
 await act(async()=>root.render(React.createElement(NetworkTree,{cities:[reportedCity]})));
 assert.equal(document.querySelectorAll('[data-tree-node="channel"]').length,2);assert.equal(document.querySelectorAll('[data-tree-node="summary"]').length,2);assert.equal(document.querySelectorAll('[data-tree-node="box"]').length,0);assert.ok(!document.body.textContent.includes('No registered area branches'));assert.ok(document.body.textContent.includes('160,965,499'));assert.ok(document.querySelector('[data-node-id="city"]').textContent.includes('8,878 reported boxes'));
 await act(async()=>document.querySelector('[data-node-id="channel:public"]').click());assert.ok(document.querySelector('[aria-label="Selected node details"]').textContent.includes('150,000,000'));assert.ok(document.querySelector('[aria-label="Selected node details"]').textContent.includes('Individual area names, box IDs'));
 assert.deepEqual(errors,[]);console.log('PASS imported city money and channel/box-count branches render with zero registered boxes, without fabricated box IDs');

}finally{if(root)await act(async()=>root.unmount());dom.window.close();}
