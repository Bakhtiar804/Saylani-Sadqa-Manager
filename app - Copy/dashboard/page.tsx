import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BreakdownBarChart,
  ChartLegend,
  CollectionTrendChart,
  StatusDonutChart,
} from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DashboardFilters from "@/components/dashboard/dashboard-filters";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import { connection } from "next/server";
import {
  formatPKR,
  getOverviewData,
} from "@/lib/dashboard-data";
import type { MetricItem } from "@/components/dashboard/metric-grid";
import { SESSION_COOKIE_NAME, verifyUserSession } from "@/lib/session";

type DashboardPageProps = {
  searchParams: Promise<{
    range?: string | string[];
    city?: string | string[];
  }>;
};

async function DashboardContent({ searchParams }: DashboardPageProps) {
  await connection();
  const params = await searchParams;
  const data = await getOverviewData({
    range: typeof params.range === "string" ? params.range : undefined,
    city: typeof params.city === "string" ? params.city : undefined,
  });
  const taskCompletion = data.totals.tasks
    ? Math.round((data.totals.completedTasks / data.totals.tasks) * 100)
    : 0;
  const metrics: MetricItem[] = [
    {
      label: "Verified collections",
      value: formatPKR(data.totals.verifiedPKR),
      note: `${data.totals.records.toLocaleString("en-PK")} records in selected period`,
      icon: "cash",
      tone: "green",
    },
    {
      label: "Registered boxes",
      value: data.totals.boxes.toLocaleString("en-PK"),
      note: `${data.totals.activeBoxes.toLocaleString("en-PK")} active · ${data.totals.needsAttentionBoxes} need attention`,
      icon: "box",
      tone: "blue",
    },
    {
      label: "Awaiting verification",
      value: data.totals.pendingCount.toLocaleString("en-PK"),
      note: `${formatPKR(data.totals.pendingPKR)} not yet verified`,
      icon: "clock",
      tone: "orange",
    },
    {
      label: "Rider task completion",
      value: `${taskCompletion}%`,
      note: `${data.totals.completedTasks} of ${data.totals.tasks} tasks complete`,
      icon: "bike",
      tone: "purple",
    },
  ];
  const collectionColumns = [
    { key: "collection_id", label: "Collection ID" },
    { key: "collection_date", label: "Date" },
    { key: "city_id", label: "City" },
    { key: "collection_amount_pkr", label: "Amount" },
    { key: "collection_status", label: "Status" },
  ];
  const todayLabel = new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Karachi",
  }).format(new Date());
  return (
    <>
      <PageHeading
        eyebrow={todayLabel}
        title="Dashboard Overview"
        description="Monitor collection performance, box coverage, and field operations across the network."
      />
      <DemoNotice />
      <DashboardFilters
        range={data.range}
        city={data.city}
        cities={data.cities}
      />
      <MetricGrid items={metrics} />
      <div className="mb-6 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <ChartPanel
          title="Verified collection trend"
          description={`Daily verified amounts from ${data.startDate} to ${data.endDate}. Pending and flagged records are excluded.`}
        >
          <CollectionTrendChart data={data.chartData} height={320} />
        </ChartPanel>
        <ChartPanel
          title="Collections by city"
          description="Verified PKR totals for the selected period."
        >
          <BreakdownBarChart
            data={data.cityData}
            valueKey="collection"
            valueFormat="currency"
            horizontal
            height={260}
          />
          <div className="mt-5 border-t border-[#edf1eb] pt-3">
            <div className="flex justify-between text-sm text-[#657568]">
              <span>All verified city collections</span>
              <b className="text-[#203526]">
                {formatPKR(data.totals.verifiedPKR)}
              </b>
            </div>
            <p className="mt-2 text-xs text-[#718073]">
              Values follow the city and date filters above.
            </p>
          </div>
        </ChartPanel>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
        <ChartPanel
          title="Verification status"
          description="All recorded collections in the selected period."
        >
          <div className="mx-auto max-w-[280px]">
            <StatusDonutChart
              data={data.statusCounts.map((item) => ({
                ...item,
                color:
                  item.name === "Verified"
                    ? "#276431"
                    : item.name === "Flagged"
                      ? "#b94b42"
                      : "#d99a38",
              }))}
            />
          </div>
          <ChartLegend
            data={data.statusCounts.map((item) => ({
              ...item,
              color:
                item.name === "Verified"
                  ? "#276431"
                  : item.name === "Flagged"
                    ? "#b94b42"
                    : "#d99a38",
            }))}
          />
        </ChartPanel>
        <section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 shadow-[0_3px_14px_rgba(28,52,33,.035)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#203526]">
              Recent operational activity
            </h2>
            <p className="mt-1 text-sm text-[#718073]">
              Latest collection, incident, and inspection records from the
              selected city.
            </p>
          </div>
          <div className="divide-y divide-[#edf1eb]">
            {data.activity.map((item) => (
              <article
                key={`${item.id}-${item.title}`}
                className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.tone === "green" ? "bg-[#e9f4e4] text-[#32723a]" : item.tone === "red" ? "bg-[#fbeceb] text-[#a9483f]" : item.tone === "blue" ? "bg-[#eaf1fc] text-[#326ac1]" : "bg-[#fbf0e3] text-[#a96d20]"}`}
                >
                  <span aria-hidden="true">
                    {item.icon === "shield"
                      ? "◇"
                      : item.icon === "box"
                        ? "▣"
                        : "₨"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#344639]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[13px] text-[#657568]">
                    {item.detail}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-[#718073]">
                  {item.date}
                </time>
              </article>
            ))}
          </div>
        </section>
      </div>
      <RecordExplorer
        title="Latest collection records"
        description="Search or open a record for its verification, cash, handover, and deposit details."
        records={data.recentCollections}
        columns={collectionColumns}
        statusKey="collection_status"
        dateKey="collection_date"
        cities={data.cities}
      />
    </>
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return <Suspense fallback={<DashboardSkeleton />}><DashboardGate searchParams={searchParams} /></Suspense>;
}

async function DashboardGate({ searchParams }: DashboardPageProps) {
  await connection();
  const cookieStore = await cookies();
  const session = verifyUserSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (session?.role === "admin") redirect("/dashboard/admin");
  if (session?.role === "city_manager") redirect("/dashboard/manager");
  if (session?.role === "rider") redirect("/dashboard/rider");
  return <Suspense fallback={<DashboardSkeleton />}><DashboardContent searchParams={searchParams} /></Suspense>;
}
