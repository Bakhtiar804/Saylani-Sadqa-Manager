import { ChartLegend, CollectionTrendChart, StatusDonutChart, BreakdownBarChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { cities, collections, fieldCollectionLog } from "@/data/index";
import { countBy, monthlySum, sum } from "@/lib/analytics";
import { formatPKR } from "@/lib/dashboard-data";

const cityNames = Object.fromEntries(cities.map((city) => [city.city_id, city.city_name]));

export default function CollectionsPage() {
  const verified = collections.filter((record) => record.collection_status === "Verified");
  const statuses = countBy(collections, "collection_status", ["Verified", "Pending Verification", "Flagged"]).map((item) => ({ ...item, color: item.name === "Verified" ? "#276431" : item.name === "Flagged" ? "#b94b42" : "#d99a38" }));
  const cityTotals = cities.map((city) => ({ name: city.city_name, value: sum(verified.filter((record) => record.city_id === city.city_id), "collection_amount_pkr") })).sort((a, b) => b.value - a.value);
  const fields = fieldCollectionLog.map((record) => ({ ...record, city_name: record.city_name || cityNames[record.city_id] || "Unassigned" }));
  return <>
    <PageHeading eyebrow="Collection operations" title="Collections" description="Review collection verification, field visit, cash handover, and deposit details."/>
    <DemoNotice/>
    <MetricGrid items={[
      { label: "All collection records", value: collections.length.toLocaleString("en-PK"), note: "Core collection register", icon: "wallet", tone: "blue" },
      { label: "Verified collection total", value: formatPKR(sum(verified, "collection_amount_pkr")), note: `${verified.length.toLocaleString("en-PK")} verified records`, icon: "cash", tone: "green" },
      { label: "Awaiting verification", value: collections.filter((item) => item.collection_status === "Pending Verification").length.toLocaleString("en-PK"), note: "Keep pending amounts separate from verified totals", icon: "clock", tone: "orange" },
      { label: "Flagged records", value: collections.filter((item) => item.collection_status === "Flagged").length.toLocaleString("en-PK"), note: "Review required", icon: "shield", tone: "red" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]"><ChartPanel title="Verified collection trend" description="Monthly verified amount in the source register."><CollectionTrendChart data={monthlySum(collections, "collection_date", "collection_amount_pkr", (record) => record.collection_status === "Verified")} height={300}/></ChartPanel><ChartPanel title="Verified amount by city" description="Collection total grouped by city."><BreakdownBarChart data={cityTotals} valueFormat="currency" horizontal height={270}/></ChartPanel></div>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,.7fr)_minmax(0,1.3fr)]"><ChartPanel title="Verification mix" description="Record count by collection status."><StatusDonutChart data={statuses} height={240}/><ChartLegend data={statuses}/></ChartPanel><RecordExplorer title="Core collection register" description="Filter, sort, and expand a collection to review its cash, seal, verification, handover, and deposit fields." records={collections} columns={[{ key: "collection_id", label: "Collection ID" }, { key: "collection_date", label: "Date" }, { key: "city_id", label: "City" }, { key: "collection_amount_pkr", label: "Amount" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={cities}/></div>
    <RecordExplorer title="Field collection register" description="Supplementary field visit records, including team, witness, seal, cash count, and audit information." records={fields} columns={[{ key: "field_collection_id", label: "Field record" }, { key: "collection_date", label: "Date" }, { key: "city_id", label: "City" }, { key: "total_cash_counted_pkr", label: "Cash counted" }, { key: "collection_status", label: "Status" }]} statusKey="collection_status" dateKey="collection_date" cities={cities}/>
  </>;
}
