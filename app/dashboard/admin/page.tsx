import Link from "next/link";
import { connection } from "next/server";
import { CollectionTrendChart, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { formatPKR, getCityName, getOverviewData } from "@/lib/dashboard-data";
import { getAdminSession } from "./admin-data";

type AdminDashboardProps = { searchParams: Promise<{ range?: string }> };

export const metadata = {
  title: "Admin Dashboard | Saylani Sadqa Manager",
  description: "City operations overview for Saylani Sadqa Manager.",
};

const shortcuts = [
  { href: "/dashboard/admin/collections", title: "Review collections", detail: "Check city collection records", icon: "₨" },
  { href: "/dashboard/admin/boxes", title: "Donation boxes", detail: "Monitor box status and coverage", icon: "▣" },
  { href: "/dashboard/admin/riders", title: "Riders & tasks", detail: "Review assignments and completion", icon: "↗" },
  { href: "/dashboard/admin/operations", title: "Field operations", detail: "Inspect incidents and box checks", icon: "◇" },
];

export default async function AdminDashboardPage({ searchParams }: AdminDashboardProps) {
  await connection();
  const session = await getAdminSession();

  const params = await searchParams;
  if (!session.cityId) {
    return <>
      <PageHeading eyebrow="Admin workspace" title="Admin Dashboard" description="Your operational overview will appear once an operating city is assigned to your account." />
      <section className="rounded-2xl border border-[#e3ebe0] bg-white p-6 shadow-[0_3px_14px_rgba(28,52,33,.035)]">
        <h2 className="text-lg font-bold text-[#203526]">City assignment required</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657568]">Admin dashboards are scoped to one city. Ask a Super Admin to assign a city to this account.</p>
      </section>
    </>;
  }

  const data = await getOverviewData({ range: params.range, city: session.cityId });
  const cityName = getCityName(session.cityId, data.cities);
  const taskCompletion = data.totals.tasks ? Math.round(data.totals.completedTasks / data.totals.tasks * 100) : 0;
  const reviewCount = data.totals.pendingCount + data.totals.flaggedCount;
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Karachi" }).format(new Date());

  return <>
    <PageHeading eyebrow={`${today} · ${cityName}`} title="Admin Dashboard" description={`Your ${cityName} operations at a glance. Review collections, donation boxes, and rider activity for your assigned city.`} />
    <DemoNotice />
    <form action="/dashboard/admin" className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e3ebe0] bg-white p-4 shadow-[0_3px_14px_rgba(28,52,33,.025)]">
      <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Period<select name="range" defaultValue={data.range} className="h-10 min-w-36 rounded-lg border border-[#dce8dc] bg-white px-3 text-sm text-[#203526] outline-none focus:border-[#276431] focus:ring-2 focus:ring-[#61bb46]/25"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All available dates</option></select></label>
      <button className="h-10 rounded-lg bg-[#276431] px-4 text-sm font-semibold text-white transition hover:bg-[#1e5228] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46]">Apply</button>
      <p className="ml-auto self-center text-xs text-[#718073] max-sm:ml-0">City scope: <b className="text-[#344639]">{cityName}</b></p>
    </form>
    <MetricGrid items={[
      { label: "Verified collections", value: formatPKR(data.totals.verifiedPKR), note: `${data.totals.records.toLocaleString("en-PK")} records in selected period`, icon: "cash", tone: "green" },
      { label: "Needs review", value: reviewCount.toLocaleString("en-PK"), note: `${data.totals.pendingCount} pending · ${data.totals.flaggedCount} flagged`, icon: "clock", tone: reviewCount ? "orange" : "green" },
      { label: "Donation boxes", value: data.totals.boxes.toLocaleString("en-PK"), note: `${data.totals.activeBoxes} active · ${data.totals.needsAttentionBoxes} need attention`, icon: "box", tone: data.totals.needsAttentionBoxes ? "red" : "blue" },
      { label: "Rider task completion", value: `${taskCompletion}%`, note: `${data.totals.completedTasks} of ${data.totals.tasks} tasks complete`, icon: "bike", tone: "purple" },
    ]} />
    <div className="mb-6 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <ChartPanel title="Verified collection trend" description={`Daily verified collections for ${cityName} from ${data.startDate} to ${data.endDate}.`}><CollectionTrendChart data={data.chartData} height={300} /></ChartPanel>
      <div id="review-status"><ChartPanel title="Collection status" description="Records in the selected period."><div className="mx-auto max-w-[280px]"><StatusDonutChart data={data.statusCounts.map((item) => ({ ...item, color: item.name === "Verified" ? "#276431" : item.name === "Flagged" ? "#b94b42" : "#d99a38" }))} /></div><div className="mt-4 grid gap-2">{data.statusCounts.map((item) => <div key={item.name} className="flex items-center justify-between text-sm"><span className="text-[#657568]">{item.name}</span><b className="text-[#203526]">{item.value.toLocaleString("en-PK")}</b></div>)}</div></ChartPanel></div>
    </div>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
      <ChartPanel title="Quick actions" description="Jump to the operational registers you manage.">
        <div className="grid gap-3 sm:grid-cols-2">{shortcuts.map((item) => <Link key={item.href} href={item.href} className="group rounded-xl border border-[#e7ede5] p-4 transition hover:border-[#b9d5b2] hover:bg-[#f7fbf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61bb46]"><span className="mb-3 grid size-9 place-items-center rounded-lg bg-[#edf6e9] font-bold text-[#276431]">{item.icon}</span><b className="block text-sm text-[#203526] group-hover:text-[#276431]">{item.title}</b><span className="mt-1 block text-xs leading-5 text-[#718073]">{item.detail}</span></Link>)}</div>
      </ChartPanel>
      <div id="attention-queue"><ChartPanel title="Needs attention" description="Operational items that may need a follow-up.">
        <div className="divide-y divide-[#edf1eb]">
          <Link href="/dashboard/admin/collections" className="flex items-center justify-between gap-3 py-4 first:pt-0 hover:text-[#276431]"><span><b className="block text-sm text-[#344639]">Collections to review</b><small className="mt-1 block text-xs text-[#718073]">Pending verification or flagged</small></span><span className="rounded-full bg-[#fbf0e3] px-3 py-1 text-sm font-bold text-[#a96d20]">{reviewCount}</span></Link>
          <Link href="/dashboard/admin/boxes" className="flex items-center justify-between gap-3 py-4 hover:text-[#276431]"><span><b className="block text-sm text-[#344639]">Boxes needing attention</b><small className="mt-1 block text-xs text-[#718073]">Damaged or under review</small></span><span className="rounded-full bg-[#fbeceb] px-3 py-1 text-sm font-bold text-[#a9483f]">{data.totals.needsAttentionBoxes}</span></Link>
          <Link href="/dashboard/admin/riders" className="flex items-center justify-between gap-3 py-4 last:pb-0 hover:text-[#276431]"><span><b className="block text-sm text-[#344639]">Open rider tasks</b><small className="mt-1 block text-xs text-[#718073]">Assigned tasks not yet completed</small></span><span className="rounded-full bg-[#eaf1fc] px-3 py-1 text-sm font-bold text-[#326ac1]">{Math.max(0, data.totals.tasks - data.totals.completedTasks)}</span></Link>
        </div>
        <p className="mt-5 border-t border-[#edf1eb] pt-4 text-xs text-[#718073]">Verified collections in this period: <b className="text-[#203526]">{formatPKR(data.totals.verifiedPKR)}</b></p>
      </ChartPanel></div>
    </div>
    <RecordExplorer title="Recent collection records" description={`Latest collection records from ${cityName}. The list stays within the city assigned to your Admin account.`} records={data.recentCollections} columns={[{ key: "collection_id", label: "Collection ID" }, { key: "collection_date", label: "Date" }, { key: "collection_amount_pkr", label: "Amount" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={data.cities.filter((city) => city.city_id === session.cityId)} />
    <section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
      <div id="recent-activity" className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-[#203526]">Recent activity</h2><p className="mt-1 text-sm text-[#718073]">Latest collection, incident, and inspection updates for {cityName}.</p></div><Link href="#review-status" className="text-sm font-semibold text-[#276431] hover:underline">Review collection status →</Link></div>
      <div className="divide-y divide-[#edf1eb]">{data.activity.length ? data.activity.map((item) => <article key={`${item.id}-${item.title}`} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${item.tone === "green" ? "bg-[#e9f4e4] text-[#32723a]" : item.tone === "red" ? "bg-[#fbeceb] text-[#a9483f]" : item.tone === "blue" ? "bg-[#eaf1fc] text-[#326ac1]" : "bg-[#fbf0e3] text-[#a96d20]"}`}>{item.icon === "shield" ? "◇" : item.icon === "box" ? "▣" : "₨"}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#344639]">{item.title}</p><p className="mt-1 text-[13px] text-[#657568]">{item.detail}</p></div><time className="shrink-0 text-xs text-[#718073]">{item.date}</time></article>) : <p className="py-8 text-center text-sm text-[#718073]">No operational activity for this period.</p>}</div>
    </section>
  </>;
}
