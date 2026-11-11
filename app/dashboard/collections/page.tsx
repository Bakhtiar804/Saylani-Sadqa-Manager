import { ChartLegend, CollectionTrendChart, StatusDonutChart, BreakdownBarChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { formatPKR, getCollectionsPageData, getImportedReportSummary } from "@/lib/dashboard-data";
import { connection } from "next/server";

export const instant = false;

export default async function CollectionsPage() {
  await connection();
  const [{ cities, fieldCollectionRecords, records, summary, statuses, monthly, cityTotals }, reports] = await Promise.all([
    getCollectionsPageData(),
    getImportedReportSummary(),
  ]);
  return <>
    <PageHeading eyebrow="Collection operations" title="Collections" description="Review collection verification, field visit, cash handover, and deposit details."/>
    <DemoNotice/>
    <MetricGrid items={[
      { label: "All collection records", value: summary.totalRecords.toLocaleString("en-PK"), note: "Core collection register", icon: "wallet", tone: "blue" },
      { label: "Verified collection total", value: formatPKR(summary.verifiedTotal), note: `${summary.verifiedCount.toLocaleString("en-PK")} verified records`, icon: "cash", tone: "green" },
      { label: "Awaiting verification", value: summary.pendingCount.toLocaleString("en-PK"), note: "Keep pending amounts separate from verified totals", icon: "clock", tone: "orange" },
      { label: "Flagged records", value: summary.flaggedCount.toLocaleString("en-PK"), note: "Review required", icon: "shield", tone: "red" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"><ChartPanel title="Verified collection trend" description="Monthly verified amount in the source register."><CollectionTrendChart data={monthly} height={300}/></ChartPanel><ChartPanel title="Verified amount by city" description="Collection total grouped by city."><BreakdownBarChart data={cityTotals} valueFormat="currency" horizontal height={270}/></ChartPanel></div>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,.7fr)_minmax(0,1.3fr)]"><ChartPanel title="Verification mix" description="Record count by collection status."><StatusDonutChart data={statuses} height={240}/><ChartLegend data={statuses}/></ChartPanel><RecordExplorer title="Core collection register" description="Filter, sort, and expand a collection to review its cash, seal, verification, handover, and deposit fields." records={records.records} totalRecords={records.totalRecords} remoteEndpoint="/api/dashboard/collections" remoteStatuses={["Verified", "Pending Verification", "Flagged"]} columns={[{ key: "collection_id", label: "Collection ID" }, { key: "collection_date", label: "Date" }, { key: "city_id", label: "City" }, { key: "collection_amount_pkr", label: "Amount" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={cities} allowCollectionReview/></div>
    {reports.collections.records > 0 && <section className="mb-6 rounded-2xl border border-[#dce8dc] bg-[#f8fbf7] p-5 sm:p-6">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#5c785e]">Imported source data</p><h2 className="mt-1 text-xl font-bold text-[#203526]">Monthly collection reports</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#718073]">{reports.collections.records.toLocaleString("en-PK")} source rows covering {reports.collections.firstMonth?.slice(0, 7)} to {reports.collections.latestMonth?.slice(0, 7)}. These monthly summaries remain separate from the transaction-level verification registers.</p></div>
      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ["Reported amount", formatPKR(reports.collections.amount)],
        ["Reported box counts", reports.collections.boxes.toLocaleString("en-PK")],
        ["Source rows", reports.collections.records.toLocaleString("en-PK")],
        ["Reporting cities", reports.reportingCityCount.toLocaleString("en-PK")],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e3ebe0] bg-white p-4"><dt className="text-xs font-semibold text-[#718073]">{label}</dt><dd className="mt-1 text-lg font-bold text-[#203526]">{value}</dd></div>)}</dl>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3"><ChartPanel title="Reported collections by month" description="Monthly source report totals; separate from transaction-level verification."><BreakdownBarChart data={reports.collections.monthly.slice(-12).map((item) => ({ name: item.label, value: item.value }))} valueFormat="currency" height={260}/></ChartPanel><ChartPanel title="Reported amount by city" description="Highest reported city totals across the available period."><BreakdownBarChart data={reports.collections.cities} valueFormat="currency" horizontal height={260}/></ChartPanel><ChartPanel title="Reported amount by channel" description="Source rows grouped by collection channel."><BreakdownBarChart data={reports.collections.channels} valueFormat="currency" horizontal height={260}/></ChartPanel></div>
    </section>}
    <RecordExplorer title="Field collection register" description="Supplementary field visit records, including team, witness, seal, cash count, and audit information." records={fieldCollectionRecords.records} totalRecords={fieldCollectionRecords.totalRecords} remoteEndpoint="/api/dashboard/collections/field-logs" remoteStatuses={["Verified", "Pending Verification", "Flagged"]} columns={[{ key: "field_collection_id", label: "Field record" }, { key: "collection_date", label: "Date" }, { key: "city_id", label: "City" }, { key: "total_cash_counted_pkr", label: "Cash counted" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={cities}/>
  </>;
}
