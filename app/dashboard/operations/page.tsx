import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import { countBy } from "@/lib/analytics";
import { connection } from "next/server";

export default async function OperationsPage() {
  await connection();
  const { boxInspectionLog, cities, securityIncidents } = await getDashboardRecords(["boxInspectionLog", "cities", "securityIncidents"] as const);
  const conditions = countBy(boxInspectionLog, "box_condition");
  const severities = countBy(securityIncidents, "severity", ["High", "Medium", "Low"]).map((item) => ({ ...item, color: item.name === "High" ? "#b94b42" : item.name === "Medium" ? "#d99a38" : "#61bb46" }));
  const followups = boxInspectionLog.filter((record) => record.follow_up_required === "Yes").length;
  const openIncidents = securityIncidents.filter((record) => record.incident_status !== "Resolved").length;
  const highIncidents = securityIncidents.filter((record) => record.severity === "High").length;
  return <>
    <PageHeading eyebrow="Field assurance" title="Inspections & Incidents" description="Monitor box condition, inspection follow-ups, and security incidents across the demo network."/>
    <MetricGrid items={[
      { label: "Inspection records", value: boxInspectionLog.length.toLocaleString("en-PK"), note: "Condition and access checks", icon: "box", tone: "blue" },
      { label: "Follow-up required", value: followups.toLocaleString("en-PK"), note: "Inspection records marked Yes", icon: "clock", tone: "orange" },
      { label: "Security incidents", value: securityIncidents.length.toLocaleString("en-PK"), note: `${openIncidents} open or under review`, icon: "shield", tone: "purple" },
      { label: "High severity", value: highIncidents.toLocaleString("en-PK"), note: "All incidents in source data", icon: "alert", tone: "red" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Inspected box condition" description="Inspection records grouped by reported box condition."><BreakdownBarChart data={conditions} height={300}/></ChartPanel><ChartPanel title="Incident severity" description="Security incident count by severity."><div className="mx-auto max-w-[300px]"><StatusDonutChart data={severities}/></div><ChartLegend data={severities}/></ChartPanel></div>
    <div className="mb-6"><RecordExplorer title="Box inspection log" description="Search inspections and filter by follow-up status, city, or date." records={boxInspectionLog} columns={[{ key: "inspection_id", label: "Inspection ID" }, { key: "inspection_date", label: "Date" }, { key: "box_id", label: "Box ID" }, { key: "city_id", label: "City" }, { key: "box_condition", label: "Condition" }, { key: "follow_up_required", label: "Follow-up" }]} statusKey="follow_up_required" dateKey="inspection_date" cities={cities}/></div>
    <RecordExplorer title="Security incident log" description="Review incident type, severity, workflow status, resolution notes, and related box." records={securityIncidents} columns={[{ key: "incident_id", label: "Incident ID" }, { key: "incident_date", label: "Date" }, { key: "incident_type", label: "Type" }, { key: "severity", label: "Severity" }, { key: "incident_status", label: "Status" }, { key: "city_id", label: "City" }]} statusKey="incident_status" dateKey="incident_date" cities={cities}/>
  </>;
}
