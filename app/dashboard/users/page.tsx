import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { countBy } from "@/lib/analytics";
import { connection } from "next/server";

export default async function UsersPage() {
  await connection();
  const { cities, users } = await getDashboardRecords(["cities", "users"] as const);
  const roleData = countBy(users, "role");
  const statusData = countBy(users, "account_status", ["Active", "Inactive", "Suspended"]);
  const cityData = countBy(users.map((user) => ({ ...user, city_name: cities.find((city) => city.city_id === user.city_id)?.city_name || "Unassigned" })), "city_name");
  return <>
    <PageHeading eyebrow="Access administration" title="Users" description="Inspect demo accounts by role, assigned city, and account status."/>
    <MetricGrid items={[
      { label: "User records", value: users.length.toLocaleString("en-PK"), note: "Passwords excluded from this interface", icon: "users", tone: "blue" },
      { label: "Active accounts", value: users.filter((user) => user.account_status === "Active").length.toLocaleString("en-PK"), note: "Based on source account status", icon: "check", tone: "green" },
      { label: "Administrative roles", value: users.filter((user) => ["Super Admin", "City Admin", "Branch Admin"].includes(String(user.role))).length.toLocaleString("en-PK"), note: "Super Admin, City Admin, Branch Admin", icon: "shield", tone: "purple" },
      { label: "Cities represented", value: new Set(users.map((user) => user.city_id)).size.toLocaleString("en-PK"), note: "User accounts with a city assignment", icon: "location", tone: "orange" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3"><ChartPanel title="Users by role" description="Account count across the assigned roles." className="xl:col-span-2"><BreakdownBarChart data={roleData} horizontal height={320}/></ChartPanel><ChartPanel title="Account status" description="Current status breakdown."><StatusDonutChart data={statusData} height={250}/><ChartLegend data={statusData}/></ChartPanel></div>
    <div className="mb-6"><ChartPanel title="Users by city" description="Where user accounts are assigned."><BreakdownBarChart data={cityData} height={260}/></ChartPanel></div>
    <RecordExplorer title="User directory" description="Search users and filter by role, city, or account status. Password fields are never sent to the browser." records={users} columns={[{ key: "team_id", label: "User ID" }, { key: "full_name", label: "Name" }, { key: "role", label: "Role" }, { key: "city_id", label: "City" }, { key: "account_status", label: "Status" }, { key: "email", label: "Email" }]} statusKey="account_status" cityKey="city_id" cities={cities}/>
  </>;
}
