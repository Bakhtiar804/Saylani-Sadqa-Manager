import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import DemoNotice from "@/components/dashboard/demo-notice";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { kpiDefinitions, proposedFieldDictionary, readme, researchAndAssumptions } from "@/data/index";
import { getAllRecords } from "@/lib/dashboard-data";
import { countBy, monthlySum, percent, sum } from "@/lib/analytics";
import { formatPKR } from "@/lib/dashboard-data";
import { connection } from "next/server";

export default async function AnalyticsPage() {
  await connection();
  const { boxInspectionLog, boxStatusHistory, cashHandoverDeposit, cities, collections, donationBoxes, fieldCollectionLog, operationalCosts, partners, riderTasks, riders, securityIncidents, users } = await getAllRecords();
  const verified = collections.filter((record) => record.collection_status === "Verified");
  const cityValues = cities.map((city) => ({ name: city.city_name, value: sum(verified.filter((record) => record.city_id === city.city_id), "collection_amount_pkr") })).sort((a, b) => b.value - a.value);
  const partnerValues = partners.map((partner) => ({ name: partner.partner_name, value: sum(verified.filter((record) => record.partner_id === partner.partner_id), "collection_amount_pkr") })).sort((a, b) => b.value - a.value);
  const taskStatuses = countBy(riderTasks, "task_status", ["Completed", "In Progress", "Assigned", "Cancelled"]);
  const costCategories = countBy(operationalCosts, "cost_category");
  const monthlyCosts = monthlySum(operationalCosts, "month", "cost_amount_pkr").map((item) => ({ ...item, collections: item.collections }));
  return <>
    <PageHeading eyebrow="Reporting & insights" title="Analytics" description="Explore cross-module collection, task, box, and cost trends with the project’s documented KPI definitions."/>
    <DemoNotice/>
    <MetricGrid items={[
      { label: "Verified collection value", value: formatPKR(sum(verified, "collection_amount_pkr")), note: "Verified records only", icon: "cash", tone: "green" },
      { label: "Active box share", value: `${percent(donationBoxes.filter((box) => box.box_status === "Active").length, donationBoxes.length)}%`, note: `${donationBoxes.filter((box) => box.box_status === "Active").length} of ${donationBoxes.length} boxes`, icon: "box", tone: "blue" },
      { label: "Task completion", value: `${percent(riderTasks.filter((task) => task.task_status === "Completed").length, riderTasks.length)}%`, note: "Completed tasks / all tasks", icon: "bike", tone: "purple" },
      { label: "Illustrative operating costs", value: formatPKR(sum(operationalCosts, "cost_amount_pkr")), note: "Not approved accounting data", icon: "chart", tone: "orange" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Verified collections by city" description="Only verified collection totals are included."><BreakdownBarChart data={cityValues} valueFormat="currency" horizontal height={290}/></ChartPanel><ChartPanel title="Verified collections by partner" description="Partner-associated verified collection totals."><BreakdownBarChart data={partnerValues} valueFormat="currency" horizontal height={290}/></ChartPanel></div>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3"><ChartPanel title="Rider task status" description="Task count by status."><StatusDonutChart data={taskStatuses} height={240}/><ChartLegend data={taskStatuses}/></ChartPanel><ChartPanel title="Operating costs by month" description="Illustrative total costs entered in source data."><BreakdownBarChart data={monthlyCosts} valueFormat="currency" height={240}/></ChartPanel><ChartPanel title="Cost categories" description="Number of sample cost entries per category."><BreakdownBarChart data={costCategories} height={240}/></ChartPanel></div>
    <div className="mb-6 rounded-2xl border border-[#dce8dc] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-[#203526]">Available operational sources</h2><p className="mt-1 text-sm text-[#718073]">Records are grouped in the dashboard modules. These source counts describe the included demo dataset.</p><dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[["Cities", cities.length], ["Donation boxes", donationBoxes.length], ["Collections", collections.length], ["Field collection logs", fieldCollectionLog.length], ["Riders", riders.length], ["Rider tasks", riderTasks.length], ["Partners", partners.length], ["Users", users.length], ["Inspections", boxInspectionLog.length], ["Security incidents", securityIncidents.length], ["Cash handovers", cashHandoverDeposit.length], ["Box status changes", boxStatusHistory.length], ["Cost records", operationalCosts.length], ["KPI definitions", kpiDefinitions.length]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f7faf5] p-3.5"><dt className="text-xs font-semibold text-[#657568]">{label}</dt><dd className="mt-1 text-xl font-bold text-[#203526]">{Number(value).toLocaleString("en-PK")}</dd></div>)}</dl></div>
    <div className="mb-6"><RecordExplorer title="KPI definitions" description="These are candidate definitions from the supplied project data. Definitions needing management approval are not shown as measured KPIs." records={kpiDefinitions} columns={[{ key: "kpi_name", label: "KPI" }, { key: "purpose", label: "Purpose" }, { key: "suggested_formula", label: "Suggested formula" }, { key: "data_source", label: "Data source" }]} statusKey="" cityKey=""/></div>
    <div className="mb-6"><RecordExplorer title="Field dictionary" description="Reference for collection, custody, verification, and cash-handling fields." records={proposedFieldDictionary} columns={[{ key: "field_name", label: "Field" }, { key: "meaning", label: "Meaning" }, { key: "source_or_owner", label: "Owner" }, { key: "basis", label: "Basis" }]} statusKey="" cityKey=""/></div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-[#203526]">Dataset notes</h2><div className="mt-4 space-y-3">{readme.map((item) => <article key={item.item} className="border-b border-[#edf1eb] pb-3 last:border-0"><h3 className="text-sm font-semibold text-[#344639]">{item.item}</h3><p className="mt-1 text-[13px] leading-5 text-[#657568]">{item.details}</p></article>)}</div></section><section className="rounded-2xl border border-[#e3ebe0] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-[#203526]">Research & assumptions</h2><div className="mt-4 space-y-3">{researchAndAssumptions.map((item) => <article key={item.topic} className="border-b border-[#edf1eb] pb-3 last:border-0"><h3 className="text-sm font-semibold text-[#344639]">{item.topic}</h3><p className="mt-1 text-[13px] leading-5 text-[#657568]">{item.research_finding}</p></article>)}</div></section></div>
  </>;
}
