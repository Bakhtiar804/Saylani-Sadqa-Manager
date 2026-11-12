import AutoFilterForm from './auto-filter-form';
type Props={path:string;cityId?:string;cities?:{city_id:string;city_name:string}[];year?:string;years?:string[]};
export default function RankingFilters({path,cityId='all',cities,year,years=[]}:Props){
 const selectClass='min-w-0 max-w-full rounded-xl border border-[#dce8dc] bg-white px-4 py-3 text-sm disabled:opacity-60';
 return <AutoFilterForm path={path} stateKey={JSON.stringify([cityId,year])}>
 {cities&&<select aria-label="Ranking city" name="city" defaultValue={cityId} className={selectClass}><option value="all">All cities · City ranking</option>{cities.map(city=><option key={city.city_id} value={city.city_id}>{city.city_name} · District ranking</option>)}</select>}
 {year!==undefined&&<select aria-label="Leaderboard year" name="year" defaultValue={year} className={selectClass}><option value="all">All available years</option>{years.map(value=><option key={value}>{value}</option>)}</select>}
 </AutoFilterForm>;
}
