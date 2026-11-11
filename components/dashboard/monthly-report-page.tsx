import Link from 'next/link';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getOperationsSession } from '@/lib/operations-auth';
import { getMonthlyReportOptions, getMonthlyReports, type MonthlyReportFilters, type ReportView } from '@/lib/monthly-reports';
import { formatPKR } from '@/lib/dashboard-data';
import PageHeading from './page-heading';
import MetricGrid from './metric-grid';
import ChartPanel from './chart-panel';
import { BreakdownBarChart, CollectionTrendChart } from './charts';
import RecordExplorer from './record-explorer';
import NetworkTree from './network-tree';
import { getNetworkTree } from '@/lib/network-tree';

export type ReportPageProps = { searchParams: Promise<MonthlyReportFilters> };
const fieldClass = 'h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm text-[#203526]';
const titles: Record<ReportView,string> = {overview:'Donation & Expense Overview',collections:'Monthly Collections',expenses:'Operational Cost',coverage:'Network Tree & Box Counts',analytics:'Collection Analytics'};

export default async function MonthlyReportPage({searchParams,view='overview'}: ReportPageProps & { view?: ReportView }) {
  await connection();
  const session = await getOperationsSession();
  if(!session) redirect('/sign-in');
  if(session.role==='rider') redirect('/dashboard/rider');
  if(session.role!=='super_admin' && !session.cityId) return <PageHeading eyebrow="Monthly reports" title={titles[view]} description="A city assignment is required to view reports. Ask your Super Admin to assign your operating city."/>;
  const scope = { network:session.role==='super_admin',cityId:session.cityId };
  const options = await getMonthlyReportOptions(scope);
  const requested = await searchParams;
  const filters = {year: typeof requested.year==='string' ? requested.year : options.years[0] || 'all',
    city:typeof requested.city==='string' ? requested.city : 'all', channel:typeof requested.channel==='string' ? requested.channel : 'all'};
  const data = await getMonthlyReports(filters,scope);
  const base = session.role==='admin'?'/dashboard/admin':session.role==='city_manager'?'/dashboard/manager':'/dashboard';
  const cityName = scope.network ? options.cities.find(city=>city.city_id===data.cityId)?.city_name || 'All reporting cities' : options.cities[0]?.city_name || 'Assigned city';
  const period = data.monthly.length ? `${data.monthly[0].month} to ${data.monthly.at(-1)!.month}` : 'No reports in this selection';
  const noData = view==='expenses' ? !data.expenses.length : view==='coverage' ? !data.latestBoxes.length && !data.staff.length : !data.collections.length;
  const amountLabel = (rows: typeof data.collections,total: number) => rows.some(row=>row.amount_pkr!==null) ? formatPKR(total) : 'Not reported';
  const publicRows = data.collections.filter(row=>row.channel==='public');
  const branchRows = data.collections.filter(row=>row.channel==='branch');
  const tableRows = data.collections.map(row=>({...row,channel:row.channel==='public'?'Public':'Branch',
    amount_state:row.amount_pkr===null?'Not reported':'Reported'}));
  const tree = view==='coverage' ? await getNetworkTree(scope,{cityId:data.cityId,month:data.latestMonth,channel:data.channel}) : null;
  return <>
    <PageHeading eyebrow={`${cityName} · ${period}`} title={titles[view]} description="Actual monthly figures supplied · Public & branch reporting." actions={view==='coverage'?<Link href={`${base}/inventory`} className="rounded-xl bg-[#276431] px-4 py-3 text-sm font-semibold text-white">Open box inventory →</Link>:undefined}/>
    <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e3ebe0] bg-white p-4">
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Year<select name="year" defaultValue={data.year} className={fieldClass}><option value="all">All available years</option>{options.years.map(year=><option key={year}>{year}</option>)}</select></label>
      {scope.network && <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">City<select name="city" defaultValue={data.cityId || 'all'} className={fieldClass}><option value="all">All reporting cities</option>{options.cities.map(city=><option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}</select></label>}
      {view!=='expenses' && <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Collection channel<select name="channel" defaultValue={data.channel} className={fieldClass}><option value="all">Public & Branch</option><option value="public">Public</option><option value="branch">Branch</option></select></label>}
      <button className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white">Apply filters</button>
      <p className="ml-auto text-xs leading-5 text-[#657568]">{data.source ? `Source workbook · Imported ${data.source.importedAt.slice(0,10)}` : 'No import has been recorded'}</p>
    </form>
    <details className="mb-5 rounded-xl border border-[#dce8dc] bg-[#f5faf2] px-4 py-3 text-xs leading-6 text-[#536455]"><summary className="cursor-pointer font-semibold">Source notes{data.totals.missingAmounts+data.totals.missingExpenses>0?` · ${data.totals.missingAmounts+data.totals.missingExpenses} unreported amounts`:''}</summary><div>
      Amounts are in PKR. Blank cells and dashes remain unreported, and are excluded from amount totals.
      Box counts and public staff are monthly snapshots. Expense data covers the public operation only.
      {data.totals.missingAmounts+data.totals.missingExpenses>0 && <span className="block font-semibold">Selected reports: {data.totals.missingAmounts} collection amounts and {data.totals.missingExpenses} expense amounts are not reported. Totals show available amounts.</span>}
    </div></details>
    {noData && !tree?.some(city=>city.registeredBoxes>0) ? <section className="rounded-2xl border border-[#e3ebe0] bg-white p-8 text-center"><h2 className="text-lg font-bold">No source reports for this selection</h2><p className="mt-2 text-sm text-[#657568]">Choose another year or city. No figures have been estimated.</p></section> : <>
      {tree && <NetworkTree cities={tree}/>}
      {view==='expenses' ? <MetricGrid items={[
        {label:'Operational cost',value:amountLabel(data.expenses,data.totals.expenses),note:'Fuel, salary and other recorded operating expenses',icon:'cash',tone:'orange'},
        {label:'Expense categories',value:data.categories.length,note:'As supplied in the workbook',icon:'chart',tone:'blue'},
        {label:'Unreported expense amounts',value:data.totals.missingExpenses,note:'Blank or dash in source',icon:'alert',tone:'orange'},
        {label:'Reporting period',value:data.year==='all'?'All available years':data.year,note:period,icon:'clock',tone:'green'},
      ]}/> : view==='coverage' ? <MetricGrid items={[
        {label:'Latest reported box count',value:data.latestMonth ? data.totals.boxes.toLocaleString('en-PK'):'—',note:`${data.latestMonth || 'No snapshot'} · ${data.totals.snapshotCities} cities · ${data.channel==='all'?'Public & Branch':data.channel}`,icon:'box',tone:'blue'},
        {label:'Latest reported public staff',value:data.latestStaffMonth ? data.totals.staff:'—',note:`${data.latestStaffMonth || 'No snapshot'} · ${data.totals.staffCities} cities`,icon:'users',tone:'green'},
        {label:'Cities in collection reports',value:data.totals.cities,note:'Selected reporting period',icon:'location',tone:'purple'},
        {label:'Unreported box counts',value:data.totals.missingBoxes,note:'Latest selected-month snapshot',icon:'alert',tone:'orange'},
      ]}/> : <MetricGrid items={[
        {label:'Reported collections',value:amountLabel(data.collections,data.totals.collection),note:`${data.collections.length} monthly rows · ${data.channel==='all'?'Public & Branch':data.channel}`,icon:'cash',tone:'green'},
        {label:'Public collections',value:data.channel==='branch'?'—':amountLabel(publicRows,data.totals.public),note:data.channel==='branch'?'Public channel excluded by filter':'Available reported amounts',icon:'wallet',tone:'blue'},
        {label:'Branch collections',value:data.channel==='public'?'—':amountLabel(branchRows,data.totals.branch),note:data.channel==='public'?'Branch channel excluded by filter':'Available reported amounts',icon:'box',tone:'purple'},
        {label:'Operational cost',value:amountLabel(data.expenses,data.totals.expenses),note:'Cost of running public collection operations',icon:'chart',tone:'orange'},
      ]}/>}
      {view!=='coverage' && <div className="mb-6 grid gap-5 xl:grid-cols-2">
        <ChartPanel title={view==='expenses'?'Public expenses by month':'Reported collections by month'} description={period}>
          {view==='expenses'?<BreakdownBarChart data={data.monthly.map(row=>({name:row.month,value:row.expenses}))} valueFormat="currency"/>:<CollectionTrendChart data={data.monthly} seriesLabel="Reported collections"/>}
        </ChartPanel>
        <ChartPanel title={view==='expenses'?'Public expenses by category':'Reported collections by city'} description="Available amounts for the selected reporting period."><BreakdownBarChart data={view==='expenses'?data.categories:data.byCity} valueFormat="currency" horizontal height={Math.max(280,Math.min(800,data.byCity.length*30))}/></ChartPanel>
      </div>}
      {(view==='overview' || view==='analytics') && <div className="mb-6 grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Collection channels" description="Selected year and city; the channel filter applies."><BreakdownBarChart data={[{name:'Public',value:data.totals.public},{name:'Branch',value:data.totals.branch}]} valueFormat="currency" height={240}/></ChartPanel>
        <ChartPanel title="Latest monthly snapshots" description="Counts are from one reporting month and are never added across months."><dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-[#657568]">Reported boxes · {data.latestMonth || 'No data'}</dt><dd className="mt-2 text-3xl font-bold">{data.latestMonth?data.totals.boxes.toLocaleString('en-PK'):'—'}</dd><p className="mt-2 text-xs text-[#657568]">{data.totals.snapshotCities} reporting cities · selected channel</p></div><div><dt className="text-sm text-[#657568]">Public staff · {data.latestStaffMonth || 'No data'}</dt><dd className="mt-2 text-3xl font-bold">{data.latestStaffMonth?data.totals.staff:'—'}</dd><p className="mt-2 text-xs text-[#657568]">{data.totals.staffCities} cities with staff reports</p></div></dl></ChartPanel>
      </div>}
      <details className="mb-6 rounded-2xl border border-[#e0e9db] bg-white p-4" open={view==='collections'||view==='expenses'}><summary className="mb-3 cursor-pointer text-sm font-bold text-[#4b6e3c]">Source records & history</summary>
      {view==='expenses' ? <RecordExplorer title="Public expense reports" description="Original monthly expense entries. A dash in the source remains unreported." records={data.expenses} columns={[{key:'report_id',label:'Report ID'},{key:'month',label:'Month'},{key:'city_name',label:'City'},{key:'expense_category',label:'Category'},{key:'amount_pkr',label:'Amount'},{key:'source_value_state',label:'Source value'}]} statusKey="expense_category" dateKey="" cities={options.cities} initialSortKey="month"/> : view==='coverage' ? <>
        <div className="mb-6"><RecordExplorer title={`Box counts · ${data.latestMonth || 'No snapshot'}`} description="Latest selected-month counts. These are aggregate counts, not individual registered boxes." records={data.latestBoxes} columns={[{key:'report_id',label:'Report ID'},{key:'city_name',label:'City'},{key:'channel',label:'Channel'},{key:'month',label:'Month'},{key:'box_count',label:'Boxes'}]} statusKey="channel" cities={options.cities} initialSortKey="month"/></div>
        <RecordExplorer title="Public staff history" description="Monthly headcounts supplied in Public_Staff; no employee identities are implied." records={data.staff} columns={[{key:'report_id',label:'Report ID'},{key:'month',label:'Month'},{key:'city_name',label:'City'},{key:'staff_count',label:'Staff'}]} cities={options.cities} initialSortKey="month"/>
      </> : <RecordExplorer title="Monthly collection reports" description="One city, month and channel per row. Expand to see source sheet and row." records={tableRows} columns={[{key:'report_id',label:'Report ID'},{key:'month',label:'Month'},{key:'city_name',label:'City'},{key:'channel',label:'Channel'},{key:'box_count',label:'Boxes'},{key:'amount_pkr',label:'Amount'},{key:'amount_state',label:'Amount status'}]} statusKey="channel" cities={options.cities} initialSortKey="month"/>}
      </details>
    </>}
    <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[#276431]"><Link href={`${base}/transactions`}>Individual collection register →</Link><Link href={`${base}/inventory`}>Registered box inventory →</Link>{scope.network && <Link href="/dashboard/handovers">Cash handover register →</Link>}</div>
    {scope.network && view==='analytics' && <nav aria-label="Related records" className="mt-5 grid gap-3 sm:grid-cols-3">{[['/dashboard/operations','Field operations'],['/dashboard/partners','Partner directory'],['/dashboard/users','User directory']].map(([href,label])=><Link key={href} href={href} className="rounded-xl border border-[#dce8dc] bg-white p-4 text-sm font-semibold text-[#276431]">{label} →</Link>)}</nav>}
  </>;
}

