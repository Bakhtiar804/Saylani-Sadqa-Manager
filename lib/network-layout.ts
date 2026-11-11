import type {NetworkCity,NetworkBox,NetworkReport} from './network-tree';
export type TreeNode={id:string;kind:'city'|'area'|'box'|'channel'|'summary';label:string;x:number;y:number;radius:number;count?:number;subtitle?:string;report?:NetworkReport;area?:string;box?:NetworkBox};
export type TreeEdge={from:string;to:string;x1:number;y1:number;x2:number;y2:number};
export function buildNetworkLayout(city:NetworkCity,areas:NetworkCity['areas'],collapsed:ReadonlySet<string>=new Set()):{width:number;height:number;nodes:TreeNode[];edges:TreeEdge[]} {
 if(!city.areas.length&&city.reports?.length){
  const reports=city.reports;const width=Math.max(440,reports.length*208+160);const root:TreeNode={id:'city',kind:'city',label:city.name,x:width/2,y:78,radius:62,subtitle:city.reportedBoxes===null?'Reported count unavailable':city.reportedBoxes?.toLocaleString('en-PK')+' reported boxes'};
  const nodes:TreeNode[]=[root];const edges:TreeEdge[]=[];
  reports.forEach((report,index)=>{const x=80+(index+.5)*(width-160)/reports.length;const channel:TreeNode={id:'channel:'+report.channel,kind:'channel',label:report.channel==='public'?'Public collection':'Branch collection',x,y:258,radius:60,subtitle:report.amount===null?'Not reported':'PKR '+new Intl.NumberFormat('en-PK',{notation:'compact',maximumFractionDigits:1}).format(report.amount),report};const summary:TreeNode={id:'summary:'+report.channel,kind:'summary',label:report.boxes===null?'Not supplied':report.boxes.toLocaleString('en-PK'),x,y:466,radius:50,subtitle:'Reported boxes',report};nodes.push(channel,summary);edges.push(connect(root,channel),connect(channel,summary));});return {width,height:558,nodes,edges};
 }
 const gap=144;const padding=88;let cursor=padding;const nodes:TreeNode[]=[];const connections:[TreeNode,TreeNode][]=[];
 const areaNodes=areas.map(area=>{const closed=collapsed.has(area.name);const span=Math.max(1,closed?1:area.boxes.length)*gap;const node:TreeNode={id:`area:${area.name}`,kind:'area',label:area.name,x:cursor+span/2,y:258,radius:55,count:area.boxes.length,area:area.name};
 if(!closed)area.boxes.forEach((box,boxIndex)=>{const child:TreeNode={id:`box:${box.id}`,kind:'box',label:box.id,x:cursor+gap*(boxIndex+.5),y:466,radius:47,area:area.name,box};nodes.push(child);connections.push([node,child]);});cursor+=span+32;return node;});
 const width=Math.max(440,cursor-32+padding);const root:TreeNode={id:'city',kind:'city',label:city.name,x:areaNodes.length?(areaNodes[0].x+areaNodes.at(-1)!.x)/2:width/2,y:78,radius:62,count:city.registeredBoxes};
 areaNodes.forEach(node=>connections.push([root,node]));
 const edges=connections.map(([from,to])=>connect(from,to));
 return {width,height:areas.some(area=>area.boxes.length&&!collapsed.has(area.name))?558:areas.length?350:300,nodes:[root,...areaNodes,...nodes],edges};
}

function connect(from:TreeNode,to:TreeNode):TreeEdge {const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);return {from:from.id,to:to.id,x1:from.x+dx/length*from.radius,y1:from.y+dy/length*from.radius,x2:to.x-dx/length*to.radius,y2:to.y-dy/length*to.radius};}
