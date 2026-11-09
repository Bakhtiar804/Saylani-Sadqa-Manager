import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { countBy, percent } from "@/lib/analytics";
import { connection } from "next/server";

export default async function RidersPage() {
  await connection();
  const { cities, donationBoxes, riderTasks, riders } = await getDashboardRecords(["cities", "donationBoxes", "riderTasks", "riders"] as const);
  const riderById = new Map(riders.map((rider) => [rider.rider_id, rider]));
  const boxById = new Map(donationBoxes.map((box) => [box.box_id, box]));
  const tasks = riderTasks.map((task) => ({ ...task, rider_name: riderById.get(task.rider_id)?.rider_name || "Unassigned", city_id: boxById.get(task.box_id)?.city_id || "", city_name: cities.find((city) => city.city_id === boxById.get(task.box_id)?.city_id)?.city_name || "Unassigned" }));
  const completed = riderTasks.filter((task) => task.task_status === "Completed").length;
  const taskStatusData = countBy(riderTasks, "task_status", ["Completed", "In Progress", "Assigned", "Cancelled"]).map((item) => ({ ...item, color: item.name === "Completed" ? "#276431" : item.name === "In Progress" ? "#1d65d5" : item.name === "Assigned" ? "#d99a38" : "#a2aba1" }));
  const tasksByRider = countBy(tasks, "rider_name").slice(0, 10);
  return <>
    <PageHeading eyebrow="Field operations" title="Riders & Tasks" description="Review rider coverage and the progress of scheduled collections, verifications, and follow-up tasks."/>
    <DemoNotice/>
    <MetricGrid items={[
      { label: "Registered riders", value: riders.length.toLocaleString("en-PK"), note: `${riders.filter((rider) => rider.employment_status === "Active").length} active`, icon: "bike", tone: "blue" },
      { label: "Assigned tasks", value: riderTasks.length.toLocaleString("en-PK"), note: "All task types", icon: "check", tone: "green" },
      { label: "Completion rate", value: `${percent(completed, riderTasks.length)}%`, note: `${completed} tasks completed`, icon: "chart", tone: "purple" },
      { label: "Open tasks", value: riderTasks.filter((task) => ["Assigned", "In Progress"].includes(String(task.task_status))).length.toLocaleString("en-PK"), note: "Assigned or in progress", icon: "clock", tone: "orange" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Task status" description="How the assigned tasks are progressing."><div className="mx-auto max-w-[300px]"><StatusDonutChart data={taskStatusData}/></div><ChartLegend data={taskStatusData}/></ChartPanel><ChartPanel title="Tasks by rider" description="Riders with the largest number of records in the demo task log."><BreakdownBarChart data={tasksByRider} horizontal height={320}/></ChartPanel></div>
    <div className="mb-6"><RecordExplorer title="Rider directory" description="Search riders by name, zone, city, employment status, and contact reference." records={riders} columns={[{ key: "rider_id", label: "Rider ID" }, { key: "rider_name", label: "Rider" }, { key: "city_id", label: "City" }, { key: "assigned_zone", label: "Zone" }, { key: "employment_status", label: "Status" }]} statusKey="employment_status" cityKey="city_id" cities={cities}/></div>
    <RecordExplorer title="Rider task register" description="Search and filter task records. Details include assigned rider, box, date, type, status, and completion time." records={tasks} columns={[{ key: "task_id", label: "Task ID" }, { key: "task_date", label: "Date" }, { key: "rider_name", label: "Rider" }, { key: "box_id", label: "Box ID" }, { key: "task_type", label: "Task type" }, { key: "task_status", label: "Status" }]} statusKey="task_status" cityKey="city_id" dateKey="task_date" cities={cities}/>
  </>;
}
