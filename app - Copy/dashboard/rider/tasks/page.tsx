import { connection } from "next/server";
import { getRiderDashboard, getRiderSession } from "@/lib/rider-dashboard";
import DemoNotice from "@/components/dashboard/demo-notice";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";

export default async function RiderTasksPage() {
  await connection();
  const session = await getRiderSession();
  const data = await getRiderDashboard(session.userId);
  if (!data) return <PageHeading eyebrow="Rider workspace" title="My Tasks" description="Your login is not linked to a rider profile yet."/>;
  return <><PageHeading eyebrow={`${data.profile.city_name || "City not assigned"} · ${data.profile.assigned_zone}`} title="My Tasks" description="Review the work assigned to your rider account, including box location and current status."/><DemoNotice/><RecordExplorer title="Assigned task register" description="Only tasks assigned to your rider profile are shown." records={data.tasks} columns={[{ key: "task_id", label: "Task ID" }, { key: "task_date", label: "Date" }, { key: "task_type", label: "Task type" }, { key: "box_id", label: "Box ID" }, { key: "area", label: "Area" }, { key: "location_description", label: "Location" }, { key: "task_status", label: "Status" }, { key: "completion_time", label: "Completed at" }]} statusKey="task_status" dateKey="task_date"/></>;
}
