import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import Link from "next/link";
import { getDashboardRecords, getImportedReportSummary } from "@/lib/dashboard-data";
import { countBy } from "@/lib/analytics";
import { connection } from "next/server";

export default async function DonationBoxesPage() {
  await connection();
  const [{ boxStatusHistory, cities, donationBoxes },reports] = await Promise.all([getDashboardRecords(["boxStatusHistory", "cities", "donationBoxes"] as const),getImportedReportSummary()]);
  const statusData = countBy(donationBoxes, "box_status", ["Active", "Inactive", "Damaged", "Under Review"]).map((item) => ({ ...item, color: item.name === "Active" ? "#276431" : item.name === "Damaged" ? "#b94b42" : item.name === "Under Review" ? "#d99a38" : "#91a08f" }));
  const cityData = countBy(donationBoxes.map((box) => ({ ...box, city_name: box.city_name || cities.find((city) => city.city_id === box.city_id)?.city_name })), "city_name");
  const active = donationBoxes.filter((box) => box.box_status === "Active").length;
  const needsAttention = donationBoxes.filter((box) => ["Damaged", "Under Review"].includes(String(box.box_status))).length;
  return <>
    <PageHeading eyebrow="Box management" title="Donation Boxes" description="Explore the registered box network, locations, custodians, partner links, and status changes."/>
    <DemoNotice/>
    <Link href="/dashboard/boxes" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce8dc] bg-[#eef6e7] p-5 text-[#276431]"><div><b className="text-2xl">{reports.collections.boxes.toLocaleString("en-PK")}</b><span className="ml-3 text-sm font-semibold">Reported boxes · {reports.collections.latestMonth?.slice(0,7)||"No snapshot"}</span><p className="mt-2 text-xs text-[#718073]">Monthly source count. Individual box IDs, areas and statuses are tracked in the registered inventory below.</p></div><span className="text-sm font-bold">View reported network →</span></Link>
    <MetricGrid items={[
      { label: "Registered boxes", value: donationBoxes.length.toLocaleString("en-PK"), note: "Individual boxes with IDs and locations", icon: "box", tone: "blue" },
      { label: "Active boxes", value: active.toLocaleString("en-PK"), note: donationBoxes.length ? `${Math.round((active / donationBoxes.length) * 100)}% of registered inventory` : "No individual boxes registered", icon: "check", tone: "green" },
      { label: "Need attention", value: needsAttention.toLocaleString("en-PK"), note: "Damaged or under review", icon: "shield", tone: "orange" },
      { label: "Status changes", value: boxStatusHistory.length.toLocaleString("en-PK"), note: "Audit history records", icon: "clock", tone: "purple" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Box status" description="Registered boxes grouped by current status."><div className="mx-auto max-w-[300px]"><StatusDonutChart data={statusData}/></div><ChartLegend data={statusData}/></ChartPanel><ChartPanel title="Inventory by city" description="Number of registered boxes in each city."><BreakdownBarChart data={cityData} height={300}/></ChartPanel></div>
    <div className="mb-6"><RecordExplorer title="Donation box register" description="Search by box ID, QR code, custodian, partner, location, or status." records={donationBoxes} columns={[{ key: "box_id", label: "Box ID" }, { key: "city_id", label: "City" }, { key: "area", label: "Area" }, { key: "location_type", label: "Location type" }, { key: "box_status", label: "Status" }, { key: "last_verified_date", label: "Last checked" }]} statusKey="box_status" dateKey="installation_date" cities={cities}/></div>
    <RecordExplorer title="Box status history" description="Audit trail of previous and new statuses, reasons, dates, and staff IDs." records={boxStatusHistory} columns={[{ key: "history_id", label: "History ID" }, { key: "box_id", label: "Box ID" }, { key: "changed_on", label: "Changed on" }, { key: "previous_status", label: "Previous" }, { key: "new_status", label: "New status" }]} statusKey="new_status" dateKey="changed_on" cityKey=""/>
  </>;
}
