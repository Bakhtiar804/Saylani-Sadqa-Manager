import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords } from "@/lib/dashboard-data";
import {getOperationsSession} from '@/lib/operations-auth';
import {redirect} from 'next/navigation';
import {getInventoryReports} from '@/lib/inventory-reports';
import type {InventoryFilters} from '@/lib/inventory-reports';
import ReportedBoxInventory from '@/components/dashboard/reported-box-inventory';
import { countBy } from "@/lib/analytics";
import { connection } from "next/server";

export default async function DonationBoxesPage({searchParams}:{searchParams:Promise<InventoryFilters>}) {
  await connection();
  const session=await getOperationsSession();if(!session)redirect('/sign-in');if(session.role!=='super_admin')redirect('/dashboard');
  const [records,reports] = await Promise.all([getDashboardRecords(["boxStatusHistory", "cities", "donationBoxes"] as const),getInventoryReports(await searchParams,{network:true,cityId:null})]);
  const cities=records.cities;
  const donationBoxes=records.donationBoxes.filter(box=>reports.data.cityId==='all'||box.city_id===reports.data.cityId);
  const boxStatusHistory=records.boxStatusHistory.filter(row=>donationBoxes.some(box=>box.box_id===row.box_id));
  const statusData = countBy(donationBoxes, "box_status", ["Active", "Inactive", "Damaged", "Under Review"]).map((item) => ({ ...item, color: item.name === "Active" ? "#276431" : item.name === "Damaged" ? "#b94b42" : item.name === "Under Review" ? "#d99a38" : "#91a08f" }));
  const cityData = countBy(donationBoxes.map((box) => ({ ...box, city_name: box.city_name || cities.find((city) => city.city_id === box.city_id)?.city_name })), "city_name");
  const active = donationBoxes.filter((box) => box.box_status === "Active").length;
  const needsAttention = donationBoxes.filter((box) => ["Damaged", "Under Review"].includes(String(box.box_status))).length;
  return <>
    <PageHeading eyebrow="Box management" title="Donation Boxes" description="Explore the registered box network, locations, custodians, partner links, and status changes."/>
    <DemoNotice/>
    <ReportedBoxInventory {...reports} base="/dashboard" network/>
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
