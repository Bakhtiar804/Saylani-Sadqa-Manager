import Link from "next/link";
import { connection } from "next/server";
import { countBy, percent } from "@/lib/analytics";
import { getRiderDashboard, getRiderSession } from "@/lib/rider-dashboard";
import { formatPKR } from "@/lib/dashboard-data";
import { StatusDonutChart, ChartLegend } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";

export const metadata = { title: "Rider Dashboard | Saylani Sadqa Manager", description: "Personal task and collection overview." };

export default async function RiderDashboardPage() {
  await connection();
  const session = await getRiderSession();
  const data = await getRiderDashboard(session.userId);
  if (!data) return <><PageHeading eyebrow="Rider workspace" title={`Welcome, ${session.name}`} description="Your login is not linked to a rider profile yet."/><section className="rounded-2xl border border-[#e3ebe0] bg-white p-6"><h2 className="text-lg font-bold text-[#203526]">Rider profile required</h2><p className="mt-2 text-sm leading-6 text-[#657568]">Ask your Branch Admin to link this login to a rider profile before you can see assigned work.</p></section></>;
  const taskStatuses = countBy(data.tasks, "task_status", ["Assigned", "In Progress", "Completed", "Cancelled"]);
  const completion = percent(data.summary.completedTasks, data.summary.taskCount);
  const city = data.profile.city_name || "City not assigned";
  return <><PageHeading eyebrow={`${city} · ${data.profile.assigned_zone}`} title={`Salaam, ${data.profile.full_name}`} description="Your assigned tasks, box visits, and collection history in one place."/><DemoNotice/>
    <MetricGrid items={[{ label: "My open tasks", value: data.summary.openTasks.toLocaleString("en-PK"), note: "Assigned or in progress", icon: "clock", tone: "orange" }, { label: "Tasks completed", value: data.summary.completedTasks.toLocaleString("en-PK"), note: `${completion}% of all assigned tasks`, icon: "check", tone: "green" }, { label: "Active boxes", value: data.summary.activeBoxes.toLocaleString("en-PK"), note: "Currently assigned to you", icon: "box", tone: "blue" }, { label: "Verified collections", value: formatPKR(data.summary.verifiedTotal), note: `${data.summary.collectionCount} collection records`, icon: "cash", tone: "purple" }]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><ChartPanel title="My task status" description={`${data.summary.taskCount} tasks assigned to you.`}><div className="mx-auto max-w-[280px]"><StatusDonutChart data={taskStatuses}/></div><ChartLegend data={taskStatuses}/></ChartPanel><ChartPanel title="Next steps" description="Your rider workspace is personal to your account."><div className="grid gap-3 sm:grid-cols-2"><Link href="/dashboard/rider/tasks" className="rounded-xl border border-[#e7ede5] p-4 transition hover:border-[#b9d5b2] hover:bg-[#f7fbf5]"><b className="block text-sm text-[#203526]">Review my tasks</b><span className="mt-1 block text-xs leading-5 text-[#718073]">See task type, status, assigned box, and location.</span></Link><Link href="/dashboard/rider/collections" className="rounded-xl border border-[#e7ede5] p-4 transition hover:border-[#b9d5b2] hover:bg-[#f7fbf5]"><b className="block text-sm text-[#203526]">View my collections</b><span className="mt-1 block text-xs leading-5 text-[#718073]">Check collection and field visit records submitted under your account.</span></Link></div><div className="mt-5 rounded-xl bg-[#f7faf5] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#718073]">Your assignment</p><p className="mt-1 font-semibold text-[#203526]">{city} · {data.profile.assigned_zone}</p><p className="mt-1 text-xs text-[#718073]">Rider status: {data.profile.employment_status}</p></div></ChartPanel></div>
    <RecordExplorer title="My assigned tasks" description="Tasks assigned to your rider account." records={data.tasks.slice(0, 10)} totalRecords={data.tasks.length} columns={[{ key: "task_id", label: "Task ID" }, { key: "task_date", label: "Date" }, { key: "task_type", label: "Task type" }, { key: "box_id", label: "Box ID" }, { key: "area", label: "Area" }, { key: "task_status", label: "Status" }]} statusKey="task_status" dateKey="task_date"/>
  </>;
}
