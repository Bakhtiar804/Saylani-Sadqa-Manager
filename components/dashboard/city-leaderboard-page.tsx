import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getOperationsSession } from '@/lib/operations-auth';
import { getMonthlyReportOptions,getMonthlyReports,type MonthlyReportFilters } from '@/lib/monthly-reports';
import { getCityOptions } from '@/lib/dashboard-data';
import { getDistrictRankings } from '@/lib/district-rankings';
import PageHeading from './page-heading';
import RankingBoard from './ranking-board';
import RankingFilters from './ranking-filters';
import VictoryBar from './victory-bar';
export default function CityLeaderboardPage(props:{searchParams:Promise<MonthlyReportFilters>}) {
 return <Suspense fallback={<div className="p-6 text-sm text-[#718073]">Loading leaderboard…</div>}><CityLeaderboardContent {...props}/></Suspense>;
}
async function CityLeaderboardContent({searchParams}:{searchParams:Promise<MonthlyReportFilters>}) {
 await connection();const session=await getOperationsSession();if(!session) redirect('/sign-in');if(session.role==='rider') redirect('/dashboard/rider');
 const scope={network:session.role==='super_admin',cityId:session.cityId};const options=await getMonthlyReportOptions(scope);const params=await searchParams;
 const cities=(await getCityOptions()).filter(city=>scope.network||city.city_id===session.cityId);
 const requestedCity=typeof params.city==='string'?params.city:'all';
 const cityId=scope.network?(cities.some(city=>city.city_id===requestedCity)?requestedCity:'all'):session.cityId;
 const districtView=Boolean(cityId&&cityId!=='all');
 const data=await getMonthlyReports({year:typeof params.year==='string'?params.year:options.years[0]||'all'},scope);
 const districts=districtView?await getDistrictRankings(scope,cityId!,data.year):null;
 const entries=districts?.entries||data.byCity;
 const cityName=cities.find(city=>city.city_id===cityId)?.city_name||'Assigned city';
 const base=session.role==='admin'?'/dashboard/admin':session.role==='city_manager'?'/dashboard/manager':'/dashboard';
 return <><PageHeading eyebrow={districtView?cityName:'Collection performance'} title={districtView?'District Leaderboard':'City Leaderboard'} description={districtView?'District collections · Individual operational records':'City collections · Monthly source reports'}/>
 <RankingFilters path={`${base}/leaderboard`} cityId={cityId||'all'} cities={scope.network?cities:undefined} year={data.year} years={options.years}/>
 <VictoryBar leaders={entries} href={`${base}/collections?year=${data.year}`}/>
 <RankingBoard startAfterPodium={!districtView} entries={entries} label={districtView?`${cityName} · District champions`:'City collection champions'}/>
 {districts&&<p className="mt-4 rounded-xl border border-[#e0e9db] bg-white p-4 text-xs text-[#718073]">{districts.unassignedBoxes>0?`${districts.unassignedBoxes} boxes have no district assigned. `:''}District totals use individual box collections. Monthly city totals are not divided between districts. {!entries.length&&'Assign districts in box inventory to start these rankings.'}</p>}
 </>;
}
