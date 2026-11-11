import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createJiti} from 'jiti';
const jiti=createJiti(import.meta.url,{jsx:{runtime:'automatic'},tsconfigPaths:true});
const {default:RankingBoard}=await jiti.import('../components/dashboard/ranking-board.tsx');
const {default:NetworkTree}=await jiti.import('../components/dashboard/network-tree.tsx');
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
const view=()=>React.createElement(NetworkTree,{cities});
const dom=new JSDOM(`<div id="root">${renderToString(view())}</div>`,{url:'http://localhost/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Event=dom.window.Event;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {hydrateRoot}=await import('react-dom/client');let root;const errors=[];
try {
 await act(async()=>{root=hydrateRoot(document.getElementById('root'),view(),{onRecoverableError:error=>errors.push(error)});});
 assert.equal(document.querySelector('h3').textContent,'Karachi');assert.equal(document.querySelectorAll('h4').length,2);assert.equal(document.querySelectorAll('li details').length,2);
 const summary=document.querySelector('li summary');await act(async()=>summary.click());assert.ok(document.querySelector('li details').open);
 const cityButtons=[...document.querySelectorAll('[aria-pressed]')];await act(async()=>cityButtons[1].click());
 assert.equal(document.querySelector('h3').textContent,'Lahore');assert.equal(document.querySelectorAll('li details').length,0);assert.ok(document.body.textContent.includes('area details not supplied'));
 assert.deepEqual(errors,[]);console.log('PASS connected city/area/box tree hydration, box expansion, city switch and honest missing-area state');
}finally{if(root)await act(async()=>root.unmount());dom.window.close();}
