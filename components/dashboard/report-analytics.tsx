import type { getMonthlyReports } from '@/lib/monthly-reports';
import { contributionShares } from '@/lib/report-analytics';
import ChartPanel from './chart-panel';
import { MoneyDonutChart, ChannelComparisonChart } from './charts';

export default function ReportAnalytics({data}:{data:Awaited<ReturnType<typeof getMonthlyReports>>}) {
 const channels=[{name:'Public',value:data.totals.public},{name:'Branch',value:data.totals.branch}];
 return <div className="mb-6 grid min-w-0 items-start gap-5 xl:grid-cols-2">
  <ChartPanel title="Collection channel share" description="How the selected collections split between Public and Branch."><MoneyDonutChart data={channels} centerLabel="collections"/></ChartPanel>
  <ChartPanel title="City contribution" description="Top five cities and the remaining cities combined · selected filters."><MoneyDonutChart data={contributionShares(data.byCity)} centerLabel="collections"/></ChartPanel>
  <ChartPanel title="Public operating cost mix" description="Fuel, salary and other available expense amounts · selected city and year."><MoneyDonutChart data={data.categories} centerLabel="public costs"/></ChartPanel>
  <ChartPanel title="Public vs Branch over time" description="Monthly reported collections · gaps mean no amount was supplied."><ChannelComparisonChart data={data.monthly.map(month=>({...month,public:data.collections.some(row=>row.month===month.month&&row.channel==='public'&&row.amount_pkr!==null)?month.public:null,branch:data.collections.some(row=>row.month===month.month&&row.channel==='branch'&&row.amount_pkr!==null)?month.branch:null}))}/></ChartPanel>
 </div>;
}
