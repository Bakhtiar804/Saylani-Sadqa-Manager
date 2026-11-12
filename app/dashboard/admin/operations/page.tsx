import { connection } from "next/server";
import { countBy } from "@/lib/analytics";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getAdminRecords } from "../admin-data";

export default async function AdminOperationsPage() {
  await connection();
  const { cityId, records } = await getAdminRecords(["boxInspectionLog", "cities", "securityIncidents"] as const);
  if (!cityId || !records) return <PageHeading eyebrow="City Admin workspace" title="Field Operations" description="A Super Admin must assign a city to your account before city records are available."/>;
  const inspections = records.boxInspectionLog;
  const incidents = records.securityIncidents;
  const openIncidents = incidents.filter((incident) => incident.incident_status !== "Resolved").length;
  const severity = countBy(incidents, "severity", ["High", "Medium", "Low"]);
  return <><PageHeading eyebrow="Field assurance" title="Field Operations" description="Monitor inspection follow-ups and security incidents in your assigned city."/><MetricGrid items={[{ label: "Inspection records", value: inspections.length.toLocaleString("en-PK"), note: "Assigned city", icon: "box", tone: "blue" }, { label: "Follow-up required", value: inspections.filter((item) => item.follow_up_required === "Yes").length.toLocaleString("en-PK"), note: "Inspection records", icon: "clock", tone: "orange" }, { label: "Security incidents", value: incidents.length.toLocaleString("en-PK"), note: `${openIncidents} open or under review`, icon: "shield", tone: "purple" }, { label: "High severity", value: String(severity.find((item) => item.name === "High")?.value ?? 0), note: "Assigned city", icon: "alert", tone: "red" }]}/><div className="mb-6"><RecordExplorer title="Box inspection log" description="Inspections and follow-up items for boxes in your assigned city." records={inspections} columns={[{ key: "inspection_id", label: "Inspection ID" }, { key: "inspection_date", label: "Date" }, { key: "box_id", label: "Box ID" }, { key: "city_id", label: "City" }, { key: "box_condition", label: "Condition" }, { key: "follow_up_required", label: "Follow-up" }]} statusKey="follow_up_required" dateKey="inspection_date" cities={records.cities}/></div><RecordExplorer title="Security incident log" description="Incidents reported in your assigned city." records={incidents} columns={[{ key: "incident_id", label: "Incident ID" }, { key: "incident_date", label: "Date" }, { key: "incident_type", label: "Type" }, { key: "severity", label: "Severity" }, { key: "incident_status", label: "Status" }, { key: "city_id", label: "City" }]} statusKey="incident_status" dateKey="incident_date" cities={records.cities}/></>;
}
