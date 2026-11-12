import { BreakdownBarChart, ChartLegend, StatusDonutChart } from "@/components/dashboard/charts";
import ChartPanel from "@/components/dashboard/chart-panel";
import MetricGrid from "@/components/dashboard/metric-grid";
import PageHeading from "@/components/dashboard/page-heading";
import RecordExplorer from "@/components/dashboard/record-explorer";
import { getDashboardRecords, getImportedReportSummary } from "@/lib/dashboard-data";
import { countBy, sum, sumBy } from "@/lib/analytics";
import { formatPKR } from "@/lib/dashboard-data";
import { connection } from "next/server";

export const instant = false;

export default async function FinancePage() {
  await connection();
  const [{ cashHandoverDeposit, cities, operationalCosts }, reports] = await Promise.all([
    getDashboardRecords(["cashHandoverDeposit", "cities", "operationalCosts"] as const),
    getImportedReportSummary(),
  ]);
  const deposits = countBy(cashHandoverDeposit, "deposit_status").map((item) => ({ ...item, color: item.name === "Deposited" ? "#276431" : item.name === "Reconciliation Required" ? "#b94b42" : "#d99a38" }));
  const costsByCategory = sumBy(operationalCosts, "cost_category", "cost_amount_pkr");
  const totalCosts = sum(operationalCosts, "cost_amount_pkr");
  const received = sum(cashHandoverDeposit, "amount_received_pkr");
  const outstanding = cashHandoverDeposit.filter((record) => record.deposit_status !== "Deposited").length;
  const discrepancy = sum(cashHandoverDeposit, "difference_pkr");
  return <>
    <PageHeading eyebrow="Finance & reconciliation" title="Cash & Deposits" description="Follow rider handovers, reconciliation and deposit states alongside illustrative operating costs."/>
    <MetricGrid items={[
      { label: "Handover records", value: cashHandoverDeposit.length.toLocaleString("en-PK"), note: "Declared and received amounts", icon: "cash", tone: "blue" },
      { label: "Amount recorded received", value: formatPKR(received), note: "Based on handover log values", icon: "wallet", tone: "green" },
      { label: "Not yet deposited", value: outstanding.toLocaleString("en-PK"), note: "Awaiting deposit or reconciliation", icon: "clock", tone: "orange" },
      { label: "Operational costs", value: formatPKR(totalCosts), note: "Illustrative records only", icon: "chart", tone: "purple" },
    ]}/>
    <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Deposit status" description="Handover records grouped by deposit workflow state."><div className="mx-auto max-w-[300px]"><StatusDonutChart data={deposits}/></div><ChartLegend data={deposits}/></ChartPanel><ChartPanel title="Operating costs by category" description="Sum of the available illustrative cost entries."><BreakdownBarChart data={costsByCategory} valueFormat="currency" horizontal height={300}/><p className="mt-4 border-t border-[#edf1eb] pt-3 text-xs leading-5 text-[#718073]">These cost values are demo examples, not approved accounting totals.</p></ChartPanel></div>
    <div className="mb-6"><RecordExplorer title="Cash handover & deposit register" description={`Declared/received difference across source records: ${formatPKR(discrepancy)}.`} records={cashHandoverDeposit} columns={[{ key: "handover_id", label: "Handover ID" }, { key: "handover_date", label: "Date" }, { key: "city_id", label: "City" }, { key: "amount_received_pkr", label: "Received" }, { key: "handover_status", label: "Handover" }, { key: "deposit_status", label: "Deposit" }]} statusKey="deposit_status" dateKey="handover_date" cities={cities}/></div>
    <RecordExplorer title="Operational cost register" description="Cost entries grouped by city, month, and category." records={operationalCosts} columns={[{ key: "cost_record_id", label: "Cost ID" }, { key: "month", label: "Month" }, { key: "city_name", label: "City" }, { key: "cost_category", label: "Category" }, { key: "cost_amount_pkr", label: "Amount" }]} statusKey="" cityKey="city_id" dateKey="month" cities={cities}/>
    {reports.expenses.records > 0 && <section className="mt-6 rounded-2xl border border-[#dce8dc] bg-[#f8fbf7] p-5 sm:p-6">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#5c785e]">Imported source data</p><h2 className="mt-1 text-xl font-bold text-[#203526]">Monthly expense reports</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#718073]">{reports.expenses.records.toLocaleString("en-PK")} source rows covering {reports.expenses.firstMonth?.slice(0, 7)} to {reports.expenses.latestMonth?.slice(0, 7)}. These reported amounts are separate from the operational cost register.</p></div>
      <dl className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[
        ["Reported expense total", formatPKR(reports.expenses.amount)],
        ["Source rows", reports.expenses.records.toLocaleString("en-PK")],
        ["Expense categories", reports.expenses.categories.length.toLocaleString("en-PK")],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e3ebe0] bg-white p-4"><dt className="text-xs font-semibold text-[#718073]">{label}</dt><dd className="mt-1 text-lg font-bold text-[#203526]">{value}</dd></div>)}</dl>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><ChartPanel title="Reported expenses by month" description="Monthly totals from the imported source reports."><BreakdownBarChart data={reports.expenses.monthly.slice(-12).map((item) => ({ name: item.label, value: item.value }))} valueFormat="currency" height={280}/></ChartPanel><ChartPanel title="Reported expenses by category" description="Total reported amount grouped by source category."><BreakdownBarChart data={reports.expenses.categories} valueFormat="currency" horizontal height={280}/></ChartPanel></div>
    </section>}
  </>;
}
