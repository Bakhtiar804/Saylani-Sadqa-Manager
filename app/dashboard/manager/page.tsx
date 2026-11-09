import Link from "next/link";
import { connection } from "next/server";
import { getAdminCity } from "../admin/admin-data";
import { formatPKR, getCityName, getOverviewData } from "@/lib/dashboard-data";
import { CollectionTrendChart, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";

type Props = { searchParams: Promise<{ range?: string }> };
const shortcuts = [
  { href: "/dashboard/manager/collections", title: "Collections", detail: "Review collection and field visit records", icon: "₨" },
  { href: "/dashboard/manager/boxes", title: "Donation boxes", detail: "Track inventory and attention items", icon: "▣" },
  { href: "/dashboard/manager/riders", title: "Riders & tasks", detail: "Monitor staff coverage and task progress", icon: "↗" },
  { href: "/dashboard/manager/operations", title: "Field operations", detail: "Review inspections and incidents", icon: "◇" },
];

export default async function CityManagerDashboard({ searchParams }: Props) {
  await connection();
  const cityId = await getAdminCity();
  if (!cityId) return <><PageHeading eyebrow="City Manager workspace" title="City Overview" description="A Super Admin must assign a city to your account before operational data is available."/><section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">City assignment required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Your dashboard shows records from one assigned city. After a Super Admin assigns your city, sign out and back in to refresh your session.</p></section></>;
  const params = await searchParams;
  const data = await getOverviewData({ range: params.range, city: cityId });
  const cityName = getCityName(cityId, data.cities);
  const completion = data.totals.tasks ? Math.round(data.totals.completedTasks / data.totals.tasks * 100) : 0;
  const reviewCount = data.totals.pendingCount + data.totals.flaggedCount;
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Karachi" }).format(new Date());
  return <><PageHeading eyebrow={`${today} · ${cityName}`} title="City Overview" description={`A city-wide view of collections, donation boxes, rider tasks, and field activity in ${cityName}.`}/><DemoNotice/>
    <form action="/dashboard/manager" className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e3ebe0] bg-white p-4"><label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Period<select name="range" defaultValue={data.range} className="h-10 min-w-36 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm text-[#203526]"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available dates</option></select></label><button className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white">Apply</button><p className="ml-auto self-center text-xs text-[#718073]">City scope: <b className="text-[#344639]">{cityName}</b></p></form>
    <MetricGrid items={[{ label: "Verified collections", value: formatPKR(data.totals.verifiedPKR), note: `${data.totals.records.toLocaleString("en-PK")} records in selected period`, icon: "cash", tone: "green" }, { label: "Needs review", value: reviewCount.toLocaleString("en-PK"), note: `${data.totals.pendingCount} pending · ${data.totals.flaggedCount} flagged`, icon: "clock", tone: "orange" }, { label: "Donation boxes", value: data.totals.boxes.toLocaleString("en-PK"), note: `${data.totals.activeBoxes} active · ${data.totals.needsAttentionBoxes} need attention`, icon: "box", tone: "blue" }, { label: "Rider task completion", value: `${completion}%`, note: `${data.totals.completedTasks} of ${data.totals.tasks} tasks complete`, icon: "bike", tone: "purple" }]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]"><ChartPanel title="Verified collection trend" description={`${cityName}, ${data.startDate} to ${data.endDate}`}><CollectionTrendChart data={data.chartData} height={280}/></ChartPanel><ChartPanel title="Collection status" description="Records in the selected period."><StatusDonutChart data={data.statusCounts.map((item) => ({ ...item, color: item.name === "Verified" ? "#276431" : item.name === "Flagged" ? "#b94b42" : "#d99a38" }))}/><div className="mt-4 grid gap-2">{data.statusCounts.map((item) => <div key={item.name} className="flex justify-between text-sm"><span className="text-[#657568]">{item.name}</span><b>{item.value.toLocaleString("en-PK")}</b></div>)}</div></ChartPanel></div>
    <div className="mb-6 grid gap-5 xl:grid-cols-2"><ChartPanel title="City operations" description="Open a read-only, city-scoped register."><div className="grid gap-3 sm:grid-cols-2">{shortcuts.map((item) => <Link key={item.href} href={item.href} className="rounded-xl border border-[#e7ede5] p-4 transition hover:border-[#b9d5b2] hover:bg-[#f7fbf5]"><span className="mb-3 grid size-9 place-items-center rounded-lg bg-[#edf6e9] font-bold text-[#276431]">{item.icon}</span><b className="block text-sm text-[#203526]">{item.title}</b><span className="mt-1 block text-xs leading-5 text-[#718073]">{item.detail}</span></Link>)}</div></ChartPanel><ChartPanel title="Needs attention" description="Follow up on city operations."><div className="divide-y divide-[#edf1eb]">{shortcuts.map((item) => <Link key={item.href} href={item.href} className="flex justify-between gap-3 py-3 text-sm font-semibold text-[#344639] hover:text-[#276431]">{item.title}<span aria-hidden="true">→</span></Link>)}</div><p className="mt-3 text-xs text-[#718073]">{data.totals.needsAttentionBoxes} boxes need attention · {Math.max(0, data.totals.tasks - data.totals.completedTasks)} tasks remain open</p></ChartPanel></div>
    <RecordExplorer title="Recent city collections" description={`Latest records for ${cityName}.`} records={data.recentCollections} columns={[{ key: "collection_id", label: "Collection ID" }, { key: "collection_date", label: "Date" }, { key: "collection_amount_pkr", label: "Amount" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={data.cities}/>
  </>;
}
