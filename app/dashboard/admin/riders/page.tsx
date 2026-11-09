import { connection } from "next/server";
import { percent } from "@/lib/analytics";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getAdminRecords } from "../admin-data";

export default async function AdminRidersPage() {
  await connection();
  const { cityId, records } = await getAdminRecords(["cities", "donationBoxes", "riderTasks", "riders"] as const);
  if (!cityId || !records) return <PageHeading eyebrow="Admin workspace" title="Riders & Tasks" description="A Super Admin must assign a city to your account before city records are available."/>;
  const riderById = new Map(records.riders.map((rider) => [rider.rider_id, rider]));
  const tasks = records.riderTasks.map((task) => ({ ...task, rider_name: riderById.get(task.rider_id)?.rider_name || task.rider_name || "Unassigned" }));
  const completed = tasks.filter((task) => task.task_status === "Completed").length;
  return <><PageHeading eyebrow="Field operations" title="Riders & Tasks" description="Review rider coverage and task progress in your assigned city."/><DemoNotice/><MetricGrid items={[{ label: "Registered riders", value: records.riders.length.toLocaleString("en-PK"), note: `${records.riders.filter((rider) => rider.employment_status === "Active").length} active`, icon: "bike", tone: "blue" }, { label: "Assigned tasks", value: tasks.length.toLocaleString("en-PK"), note: "Assigned city", icon: "check", tone: "green" }, { label: "Completion rate", value: `${percent(completed, tasks.length)}%`, note: `${completed} tasks completed`, icon: "chart", tone: "purple" }, { label: "Open tasks", value: tasks.filter((task) => ["Assigned", "In Progress"].includes(String(task.task_status))).length.toLocaleString("en-PK"), note: "Assigned or in progress", icon: "clock", tone: "orange" }]}/><div className="mb-6"><RecordExplorer title="Rider directory" description="Riders assigned to your city." records={records.riders} columns={[{ key: "rider_id", label: "Rider ID" }, { key: "rider_name", label: "Rider" }, { key: "city_id", label: "City" }, { key: "assigned_zone", label: "Zone" }, { key: "employment_status", label: "Status" }]} statusKey="employment_status" cityKey="city_id" cities={records.cities}/></div><RecordExplorer title="Rider task register" description="Tasks assigned to riders in your city." records={tasks} columns={[{ key: "task_id", label: "Task ID" }, { key: "task_date", label: "Date" }, { key: "rider_name", label: "Rider" }, { key: "box_id", label: "Box ID" }, { key: "task_type", label: "Task type" }, { key: "task_status", label: "Status" }]} statusKey="task_status" cityKey="city_id" dateKey="task_date" cities={records.cities}/></>;
}
