import Link from 'next/link';
import { connection } from 'next/server';
import { getDashboardRecords } from '@/lib/dashboard-data';
import { getPublicPartnerLeaderboard } from '@/lib/partner-leaderboard';
import RankingBoard from '@/components/dashboard/ranking-board';
import Icon from '@/components/dashboard/icons';
import VictoryBar from '@/components/dashboard/victory-bar';
import LeaderboardRefresh from '@/components/dashboard/leaderboard-refresh';
export const metadata={title:'Partner Leaderboard | Saylani Sadqa Manager',description:'Company and partner rankings by collections from donation boxes across their branch locations.'};
export default async function PublicLeaderboardPage() {
 await connection();const records=await getDashboardRecords(['cities','partners','collections','donationBoxes'] as const);const rankings=getPublicPartnerLeaderboard(records);
 const boxCount=rankings.reduce((sum,partner)=>sum+partner.installedBoxes,0);const total=rankings.reduce((sum,partner)=>sum+partner.verifiedFunds,0);
 return <div className="min-h-screen bg-[#f5f8f1] text-[#203526]"><header className="border-b border-[#e2eadb] bg-white"><nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5"><Link href="/" className="flex items-center gap-2 text-sm font-extrabold"><span className="grid size-9 place-items-center rounded-xl bg-[#276431] font-serif text-xl text-white">س</span> SAYLANI SADQA</Link><Link href="/" className="text-sm font-semibold text-[#657568]">← Home</Link></nav></header><main className="mx-auto max-w-5xl px-4 py-9 sm:px-8"><div className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#72915f]">Community partners</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Partner Leaderboard</h1><p className="mt-2 text-sm text-[#718073]">Company rankings by collections from boxes across their branch locations.</p></div>
 <dl className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">{[{label:'Partners',value:rankings.length.toLocaleString('en-PK'),icon:'handshake' as const},{label:'Installed boxes',value:boxCount.toLocaleString('en-PK'),icon:'box' as const},{label:'Collection · PKR',value:total.toLocaleString('en-PK',{maximumFractionDigits:0}),icon:'wallet' as const}].map(item=><div key={item.label} className="rounded-2xl border border-[#e0e9db] bg-white p-3 sm:p-5"><span className="mb-3 block text-[#7fa269]"><Icon name={item.icon} size={21}/></span><dt className="text-[10px] text-[#718073] sm:text-xs">{item.label}</dt><dd className="mt-1 break-words text-base font-bold tabular-nums text-[#276431] sm:text-2xl">{item.value}</dd></div>)}</dl>
 <VictoryBar leaders={rankings.map(partner=>({name:partner.partnerName,value:partner.verifiedFunds}))} href="#partner-rankings" emptyName="Awaiting partner"/>
 <div className="mb-3 flex justify-end"><LeaderboardRefresh/></div>
 <div id="partner-rankings" className="scroll-mt-5"><RankingBoard emptyName="Awaiting partner" entries={rankings.map(partner=>({name:partner.partnerName,value:partner.verifiedFunds,detail:`${partner.installedBoxes.toLocaleString('en-PK')} installed boxes`}))} label="Partner collection champions"/></div><p className="mt-5 text-center text-xs text-[#819176]">Published partner collections · All linked boxes and locations combined</p></main></div>;
}
