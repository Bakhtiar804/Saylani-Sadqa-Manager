import { connection } from "next/server";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getAdminRecords } from "../admin-data";

export default async function AdminBoxesPage() {
  await connection();
  const { cityId, records } = await getAdminRecords(["cities", "donationBoxes", "boxStatusHistory"] as const);
  if (!cityId || !records) return <PageHeading eyebrow="Admin workspace" title="Donation Boxes" description="A Super Admin must assign a city to your account before city records are available."/>;
  const boxes = records.donationBoxes;
  const active = boxes.filter((box) => box.box_status === "Active").length;
  const attention = boxes.filter((box) => ["Damaged", "Under Review"].includes(String(box.box_status))).length;
  return <><PageHeading eyebrow="Box management" title="Donation Boxes" description="Review box inventory and status history for your assigned city."/><DemoNotice/><MetricGrid items={[{ label: "Registered boxes", value: boxes.length.toLocaleString("en-PK"), note: "Assigned city", icon: "box", tone: "blue" }, { label: "Active boxes", value: active.toLocaleString("en-PK"), note: "Currently active", icon: "check", tone: "green" }, { label: "Need attention", value: attention.toLocaleString("en-PK"), note: "Damaged or under review", icon: "shield", tone: "orange" }, { label: "Status changes", value: records.boxStatusHistory.length.toLocaleString("en-PK"), note: "City audit history", icon: "clock", tone: "purple" }]}/><div className="mb-6"><RecordExplorer title="Donation box register" description="Search box IDs, QR codes, locations, and status." records={boxes} columns={[{ key: "box_id", label: "Box ID" }, { key: "city_id", label: "City" }, { key: "area", label: "Area" }, { key: "location_type", label: "Location type" }, { key: "box_status", label: "Status" }, { key: "last_verified_date", label: "Last verified" }]} statusKey="box_status" dateKey="installation_date" cities={records.cities}/></div><RecordExplorer title="Box status history" description="Status changes for boxes in your assigned city." records={records.boxStatusHistory} columns={[{ key: "history_id", label: "History ID" }, { key: "box_id", label: "Box ID" }, { key: "changed_on", label: "Changed on" }, { key: "previous_status", label: "Previous" }, { key: "new_status", label: "New status" }]} statusKey="new_status" dateKey="changed_on" cityKey=""/></>;
}
