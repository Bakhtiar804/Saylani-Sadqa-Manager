'use client';
import {useTransition,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
type Props={path:string;cityId?:string;cities?:{city_id:string;city_name:string}[];year?:string;years?:string[]};
export default function RankingFilters(props:Props){return <FilterForm key={`${props.path}:${props.cityId}:${props.year}`} {...props}/>;}
function FilterForm({path,cityId='all',cities,year,years=[]}:Props){
 const router=useRouter();const [pending,startTransition]=useTransition();
 function navigate(form:HTMLFormElement){const query=new URLSearchParams();for(const [key,value] of new FormData(form))if(typeof value==='string')query.set(key,value);startTransition(()=>router.push(`${path}?${query.toString()}`,{scroll:false}));}
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();navigate(event.currentTarget);}
 const selectClass='min-w-0 max-w-full rounded-xl border border-[#dce8dc] bg-white px-4 py-3 text-sm disabled:opacity-60';
 return <form action={path} onSubmit={submit} onChange={event=>navigate(event.currentTarget)} aria-busy={pending} className="mb-6 flex flex-wrap items-center gap-3">
 {cities&&<select aria-label="Ranking city" name="city" defaultValue={cityId} disabled={pending} className={selectClass}><option value="all">All cities · City ranking</option>{cities.map(city=><option key={city.city_id} value={city.city_id}>{city.city_name} · District ranking</option>)}</select>}
 {year!==undefined&&<select aria-label="Leaderboard year" name="year" defaultValue={year} disabled={pending} className={selectClass}><option value="all">All available years</option>{years.map(value=><option key={value}>{value}</option>)}</select>}
 <button disabled={pending} className="rounded-xl bg-[#276431] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending?'Updating…':'Apply'}</button>
 <span role="status" aria-live="polite" className="text-xs text-[#718073]">{pending?'Updating rankings…':''}</span>
 </form>;
}
