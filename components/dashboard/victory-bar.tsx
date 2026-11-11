import Link from 'next/link';
import Icon from './icons';
export default function VictoryBar({leaders,href,emptyName='Awaiting records'}:{leaders:{name:string;value:number|null}[];href:string;emptyName?:string}) {
 const ranked=leaders.filter(leader=>leader.value!==null).slice(0,3);
 const slots=ranked.length?ranked:[1,2,3].map(rank=>({name:emptyName,value:null,slot:rank}));
 const maximum=ranked[0]?.value || 1;
 return <section aria-label="Victory Bar" className="relative mb-6 overflow-hidden rounded-2xl border border-[#395e31] bg-[#203f27] p-5 text-white sm:p-6">
  <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border-[28px] border-[#a7d48c]/10"/>
  <div className="relative grid items-center gap-5 xl:grid-cols-[180px_1fr_auto]"><div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e6ca76] text-[#5b4716] shadow-[0_0_25px_#e6ca7620]"><Icon name="leaderboard" size={28}/></span><div><h2 className="font-bold">Victory Bar</h2><p className="mt-1 text-[10px] uppercase tracking-[.16em] text-[#bfd4b4]">Collection champions</p></div></div>
  <ol className="grid gap-3 sm:grid-cols-3">{slots.map((entry,index)=><li key={index} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[.06] p-3"><div className="mb-2 flex items-center gap-2"><span className={`grid size-6 place-items-center rounded-full text-[10px] font-black ${index===0?'bg-[#e6ca76] text-[#534219]':'bg-white/15 text-[#d0e1c8]'}`}>{index+1}</span><b className="truncate text-xs">{entry.name}</b></div><p className="text-sm font-bold tabular-nums">{entry.value===null?'—':`PKR ${entry.value.toLocaleString('en-PK',{maximumFractionDigits:0})}`}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#add583]" style={{width:`${Math.max(0,entry.value!/maximum*100)}%`}}/></div></li>)}</ol><Link href={href} className="flex items-center gap-2 text-xs font-bold text-[#e6ca76]">View rankings <Icon name="arrow" size={16}/></Link></div>
  {!ranked.length && <p className="mt-4 text-sm text-[#bfd4b4]">Awaiting collection reports</p>}
 </section>;
}
