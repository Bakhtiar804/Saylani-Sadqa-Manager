import { connection } from "next/server";
import { getRiderDashboard, getRiderSession } from "@/lib/rider-dashboard";
import PageHeading from "@/components/dashboard/page-heading";
import RiderTaskActions from "@/components/dashboard/rider-task-actions";

export default async function RiderTasksPage() {
  await connection();
  const session = await getRiderSession();
  const data = await getRiderDashboard(session.userId);
  if (!data) return <PageHeading eyebrow="Rider workspace" title="My Tasks" description="Your login is not linked to a rider profile yet."/>;
  return <>
    <PageHeading eyebrow={`${data.profile.city_name || "City not assigned"} · ${data.profile.assigned_zone}`} title="My Tasks" description="Update assigned field tasks and submit collections for review."/>
    <RiderTaskActions tasks={data.tasks} canWork={data.profile.employment_status==='Active'}/>
  </>;
}
