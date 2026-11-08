import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { cities, collections, partners } from "@/data/index";
import { countBy, sum } from "@/lib/analytics";
import { formatPKR } from "@/lib/dashboard-data";

export default function PartnersPage() {
  const verified = collections.filter((record) => record.collection_status === "Verified");
  const records = partners.map((partner) => {
    const associated = verified.filter((record) => record.partner_id === partner.partner_id);
    return { ...partner, verified_collection_pkr: sum(associated, "collection_amount_pkr"), verified_collection_records: associated.length };
  });
  const statusData = countBy(partners, "partnership_status");
  const collectionData = records.map((record) => ({ name: record.partner_name, value: record.verified_collection_pkr })).sort((a, b) => b.value - a.value);
  return <>
    <PageHeading eyebrow="Partner network" title="Partners" description="Review partner relationships and their associated verified collection activity."/>
    <DemoNotice/>
    <MetricGrid items={[
      { label: "Partner records", value: partners.length.toLocaleString("en-PK"), note: "All partnership statuses", icon: "handshake", tone: "blue" },
      { label: "Active partners", value: partners.filter((partner) => partner.partnership_status === "Active").length.toLocaleString("en-PK"), note: "Marked active in source records", icon: "check", tone: "green" },
      { label: "Verified associated collections", value: formatPKR(sum(verified.filter((record) => record.partner_id), "collection_amount_pkr")), note: "Partner-linked verified collection value", icon: "cash", tone: "purple" },
      { label: "Relationship stages", value: statusData.length.toLocaleString("en-PK"), note: "Distinct statuses in partner data", icon: "chart", tone: "orange" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Verified collections by partner" description="Only verified collection records linked to a partner are included."><BreakdownBarChart data={collectionData} valueFormat="currency" horizontal height={300}/></ChartPanel><ChartPanel title="Partnership status" description="Partner count by current relationship stage."><div className="mx-auto max-w-[300px]"><StatusDonutChart data={statusData}/></div><ChartLegend data={statusData}/></ChartPanel></div>
    <RecordExplorer title="Partner directory" description="Search partners and compare contact, city, status, and linked verified collections." records={records} columns={[{ key: "partner_id", label: "Partner ID" }, { key: "partner_name", label: "Partner" }, { key: "partner_type", label: "Type" }, { key: "city_id", label: "City" }, { key: "partnership_status", label: "Status" }, { key: "verified_collection_pkr", label: "Verified PKR" }]} statusKey="partnership_status" cityKey="city_id" cities={cities}/>
  </>;
}
