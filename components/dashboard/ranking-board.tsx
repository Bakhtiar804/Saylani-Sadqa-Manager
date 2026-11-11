import Icon from './icons';
export type RankingEntry={name:string;value:number|null;detail?:string};
const money=(value:number)=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(value);
type Slot={name:string;value:number|null;detail?:string;rank:number;empty?:boolean};
export default function RankingBoard({entries,label='Collection champions',emptyName='Awaiting records'}:{entries:RankingEntry[];label?:string;emptyName?:string}) {
 const ranked=entries.filter(entry=>entry.value!==null).map((entry,index)=>({...entry,rank:index+1}));
 const podium:Slot[]=[2,1,3].map(rank=>ranked[rank-1]||{name:emptyName,value:null,rank,empty:true});
 const rows:Slot[]=ranked.length?ranked:[1,2,3].map(rank=>({name:emptyName,value:null,rank,empty:true}));
 return <section aria-label={label} className="overflow-hidden rounded-3xl border border-[#e0e9db] bg-white shadow-[0_12px_40px_#20352608]">
  <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#e3f2d8,transparent_70%)] px-4 pt-7 sm:px-8">
   <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-[#344639]">{label}</h2><span className="shrink-0 rounded-full bg-[#edf5e7] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#4a753a]">{ranked.length?'Top performers':'Open positions'}</span></div>
   <div className="mx-auto mt-9 flex max-w-2xl items-end justify-center gap-3 sm:gap-7" aria-label="Winners podium">
    {podium.map(entry=><div key={entry.rank} data-empty-slot={entry.empty?'true':undefined} className="flex min-w-0 flex-1 flex-col items-center text-center" style={{maxWidth:200}}>
     {entry.rank===1&&<span className="mb-2 text-[#c69b29]"><Icon name="leaderboard" size={30}/></span>}
     <div className={`grid size-12 place-items-center rounded-full border-4 border-white text-sm font-extrabold shadow-md sm:size-16 sm:text-xl ${entry.rank===1?'bg-[#276431] text-white ring-2 ring-[#d9b34c]':'bg-[#e4eddf] text-[#426b35]'}`}>{entry.empty?<Icon name="handshake" size={25}/>:entry.name.split(' ').map(word=>word[0]).slice(0,2).join('')}</div>
     <b className="mt-3 line-clamp-2 min-h-10 text-xs text-[#203526] sm:text-sm">{entry.name}</b>
     {entry.detail&&<span className="mb-1 text-[10px] text-[#718073]">{entry.detail}</span>}
     <span className="mb-3 text-[10px] font-semibold text-[#718073] sm:text-xs">{entry.value===null?'—':money(entry.value)}</span>
     <div className={`flex w-full flex-col items-center justify-start rounded-t-2xl border-t border-white/80 pt-5 ${entry.rank===1?'bg-gradient-to-b from-[#b9dca5] to-[#e6f2de]':'bg-gradient-to-b from-[#d9e9cf] to-[#eff5eb]'}`} style={{height:entry.rank===1?172:entry.rank===2?130:100}}><span className={`text-4xl font-black sm:text-5xl ${entry.rank===1?'text-[#276431]':'text-[#7a9a6b]'}`}>{entry.rank}</span><span className="mt-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#5f8052]">{entry.rank===1?'Champion':entry.rank===2?'Runner up':'Third place'}</span></div>
    </div>)}
   </div>
  </div>
  <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[#276431] p-4 text-white sm:mx-7"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 text-[#f1d77b]"><Icon name="leaderboard" size={26}/></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#c2dfb1]">{ranked[0]?'Leading the way':'Your impact starts here'}</p><p className="truncate text-sm font-bold sm:text-base">{ranked[0]?.name||emptyName}</p></div><div className="text-right"><b className="text-sm sm:text-lg">{ranked[0]?money(ranked[0].value!):'—'}</b><p className="text-[10px] text-[#c2dfb1]">{ranked[0]?'No. 1 collection':'Awaiting collections'}</p></div></div>
  <div className="mx-4 mt-6 flex items-center justify-between border-b border-[#edf1e9] pb-3 sm:mx-7"><h3 className="text-sm font-bold text-[#344639]">Leaderboard</h3><span className="text-[10px] text-[#819176]">{ranked.length} ranked</span></div>
  <ol aria-label="Full leaderboard" className="divide-y divide-[#edf1e9] px-4 pb-3 sm:px-7">{rows.map(entry=><li key={entry.rank} className="flex items-center gap-3 py-4"><span className="w-7 text-lg font-semibold tabular-nums text-[#8b9985]">{String(entry.rank).padStart(2,'0')}</span><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eef4e9] text-xs font-bold text-[#588046]">{entry.empty?<Icon name="handshake" size={18}/>:entry.name.slice(0,2).toUpperCase()}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-[#344639]">{entry.name}</b><small className="text-[#718073]">{entry.empty?'No collection recorded yet':entry.detail}</small></div><span className="text-right text-xs font-bold tabular-nums text-[#276431] sm:text-sm">{entry.value===null?'—':money(entry.value)}</span><span className="hidden text-[#b4c8a8] sm:block"><Icon name="leaderboard" size={19}/></span></li>)}</ol>
  {!ranked.length&&<p className="px-7 pb-5 text-center text-xs text-[#819176]">Rankings will fill automatically when recorded collections are available.</p>}
  {entries.some(entry=>entry.value===null)&&<p className="px-7 pb-5 text-xs text-[#718073]">{entries.filter(entry=>entry.value===null).length} entries have no reported amount.</p>}
 </section>;
}
